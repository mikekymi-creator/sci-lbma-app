\set ON_ERROR_STOP on
insert into auth.users values
 ('00000000-0000-0000-0000-000000000001','admin@example.test',now()),
 ('00000000-0000-0000-0000-000000000002','member@example.test',now()),
 ('00000000-0000-0000-0000-000000000003','outsider@example.test',now());
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.create_household('Test SCI') as household \gset
select public.add_household_member(:'household','member@example.test');
begin;
insert into public.properties(id,owner_id,household_id,title,price,surface,rent_estimate,analysis_ready)
 values('10000000-0000-0000-0000-000000000001',auth.uid(),:'household','Appartement test',79000,50,650,true);
commit;
do $$begin
 if(select count(*) from public.events)<>1 then raise exception 'Missing property event';end if;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
update public.properties set status='À visiter' where id='10000000-0000-0000-0000-000000000001';
insert into public.comments(property_id,author_id,body) values('10000000-0000-0000-0000-000000000001',auth.uid(),'Commentaire de test');
insert into public.visits(property_id,created_by,starts_at) values('10000000-0000-0000-0000-000000000001',auth.uid(),now()+interval '2 hours');
select public.append_property_photo('10000000-0000-0000-0000-000000000001',:'household'||'/10000000-0000-0000-0000-000000000001/photo.jpg');
do $$begin
 if(select count(*) from public.properties)<>1 then raise exception 'Shared member cannot read';end if;
 if(select count(*) from public.events)<>4 then raise exception 'Missing collaboration events';end if;
 if(select author_name from public.comments limit 1)<>'family-test' then raise exception 'Missing comment attribution';end if;
 begin update public.properties set owner_id=auth.uid();raise exception 'Owner hijack allowed';exception when raise_exception then if sqlerrm='Owner hijack allowed' then raise;end if;end;
 begin perform public.add_household_member((select household_id from public.properties limit 1),'outsider@example.test');raise exception 'Member can invite';exception when raise_exception then if sqlerrm='Member can invite' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$declare rows_updated int;begin
 if(select count(*) from public.properties)<>0 then raise exception 'SCI isolation failed';end if;
 if(select count(*) from public.comments)<>0 then raise exception 'Comment isolation failed';end if;
 if(select count(*) from public.events)<>0 then raise exception 'Event isolation failed';end if;
 update public.properties set title='Attack';get diagnostics rows_updated=row_count;if rows_updated<>0 then raise exception 'Outsider write allowed';end if;
end$$;
reset role;
select public.queue_visit_reminders();select public.queue_visit_reminders();
do $$begin
 if(select count(*) from public.events where kind='visit_reminder')<>1 then raise exception 'Reminder duplication';end if;
end$$;
select public.acquire_job_lock('test','20000000-0000-0000-0000-000000000001') as first_lock \gset
select public.acquire_job_lock('test','20000000-0000-0000-0000-000000000002') as second_lock \gset
\if :first_lock
\else
 \quit 1
\endif
\if :second_lock
 \quit 1
\endif
select 'PASS: SCI isolation, collaboration, attribution, photos, reminders, lock' as result;
