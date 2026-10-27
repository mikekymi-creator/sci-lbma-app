-- Apply after a backup. Existing properties remain private until explicitly shared.
begin;
create extension if not exists pgcrypto;
create table if not exists public.households(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 120),created_at timestamptz not null default now());
create table if not exists public.household_members(household_id uuid references public.households on delete cascade,user_id uuid references auth.users on delete cascade,role text not null default 'member' check(role in ('admin','member')),primary key(household_id,user_id));
create or replace function public.is_household_member(h uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.household_members where household_id=h and user_id=(select auth.uid())); $$;
create or replace function public.is_household_admin(h uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.household_members where household_id=h and user_id=(select auth.uid()) and role='admin'); $$;
create or replace function public.create_household(household_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare h uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.households(name) values(trim(household_name)) returning id into h;
 insert into public.household_members values(h,auth.uid(),'admin'); return h;
end; $$;
create or replace function public.add_household_member(h uuid,member_email text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
 if not public.is_household_admin(h) then raise exception 'Admin required'; end if;
 select id into u from auth.users where lower(email)=lower(trim(member_email)) and email_confirmed_at is not null;
 if u is null then raise exception 'Le membre doit créer et confirmer son compte avant son ajout.'; end if;
 insert into public.household_members values(h,u,'member') on conflict do nothing;
end; $$;
create table if not exists public.properties(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users,title text not null,city text default '',price numeric,surface numeric,rent_estimate numeric,
 score numeric default 0,cashflow numeric default 0,status text default 'À étudier',dpe text default 'Inconnu',listing_url text,notes text default '',visit_date date,visit_time time,created_at timestamptz not null default now());
alter table public.properties add column if not exists household_id uuid references public.households;
alter table public.properties add column if not exists description text not null default '';
alter table public.properties add column if not exists agency_name text not null default '';
alter table public.properties add column if not exists agency_phone text not null default '';
alter table public.properties add column if not exists agency_email text not null default '';
alter table public.properties add column if not exists finance jsonb not null default '{}';
alter table public.properties add column if not exists photo_paths text[] not null default '{}';
alter table public.properties add column if not exists listing_images text[] not null default '{}';
alter table public.properties add column if not exists analysis_ready boolean not null default false;
alter table public.properties add column if not exists updated_at timestamptz not null default now();
alter table public.properties add column if not exists visit_date date;
alter table public.properties add column if not exists visit_time time;
alter table public.properties alter column price drop not null,alter column surface drop not null,alter column rent_estimate drop not null;
create unique index if not exists properties_household_listing on public.properties(household_id,listing_url) where listing_url is not null;
create table if not exists public.comments(id uuid primary key default gen_random_uuid(),property_id uuid not null references public.properties on delete cascade,author_id uuid not null references auth.users,body text not null check(length(trim(body)) between 1 and 5000),created_at timestamptz not null default now());
alter table public.comments add column if not exists author_name text not null default '';
create or replace function public.comment_author() returns trigger language plpgsql set search_path='' as $$
begin new.author_name=coalesce(nullif(split_part(auth.jwt()->>'email','@',1),''),'Membre de la SCI');return new;end; $$;
drop trigger if exists comments_author on public.comments;
create trigger comments_author before insert on public.comments for each row execute function public.comment_author();
create table if not exists public.visits(id uuid primary key default gen_random_uuid(),property_id uuid not null references public.properties on delete cascade,created_by uuid not null references auth.users,starts_at timestamptz not null,notes text not null default '',created_at timestamptz not null default now());
insert into public.visits(property_id,created_by,starts_at,notes)
 select p.id,p.owner_id,(p.visit_date::date+p.visit_time::time) at time zone 'Europe/Paris','Date conservée depuis le prototype.' from public.properties p
 where nullif(p.visit_date::text,'') is not null and nullif(p.visit_time::text,'') is not null and not exists(select 1 from public.visits v where v.property_id=p.id and v.starts_at=(p.visit_date::date+p.visit_time::time) at time zone 'Europe/Paris');
create table if not exists public.events(id uuid primary key default gen_random_uuid(),household_id uuid not null references public.households on delete cascade,property_id uuid references public.properties on delete set null deferrable initially deferred,kind text not null,title text not null,body text not null,dedupe_key text unique,created_at timestamptz not null default now());
create table if not exists public.push_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,endpoint text unique not null,p256dh text not null,auth text not null,created_at timestamptz not null default now());
create table if not exists public.push_deliveries(event_id uuid references public.events on delete cascade,subscription_id uuid references public.push_subscriptions on delete cascade,attempts int not null default 0,sent_at timestamptz,next_attempt_at timestamptz not null default now(),last_error text,primary key(event_id,subscription_id));
create table if not exists public.watch_sources(id uuid primary key default gen_random_uuid(),household_id uuid not null references public.households on delete cascade,name text not null,feed_url text not null,enabled boolean not null default false,interval_minutes int not null default 30 check(interval_minutes between 30 and 10080),criteria jsonb not null default '{}',last_run_at timestamptz,next_run_at timestamptz not null default now(),last_error text,created_at timestamptz not null default now());
create table if not exists public.job_locks(name text primary key,holder uuid not null,expires_at timestamptz not null);
create table if not exists public.watch_seen(source_id uuid references public.watch_sources on delete cascade,listing_url text not null,seen_at timestamptz not null default now(),primary key(source_id,listing_url));
create table if not exists public.sector_references(household_id uuid references public.households on delete cascade,city_key text not null,rent_m2 numeric check(rent_m2>0),market_price_m2 numeric check(market_price_m2>0),security_note numeric check(security_note between 0 and 10),social_pct numeric check(social_pct between 0 and 100),source_note text not null,primary key(household_id,city_key));
alter table public.sector_references enable row level security;
drop policy if exists references_read on public.sector_references;
drop policy if exists references_write on public.sector_references;
create policy references_read on public.sector_references for select to authenticated using(public.is_household_member(household_id));
create policy references_write on public.sector_references for all to authenticated using(public.is_household_admin(household_id)) with check(public.is_household_admin(household_id));
grant select,insert,update,delete on public.sector_references to authenticated;
grant all on public.sector_references to service_role;
alter table public.watch_seen enable row level security;
revoke all on public.watch_seen from anon,authenticated;
grant all on public.watch_seen,public.job_locks,public.push_deliveries,public.events,public.watch_sources,public.push_subscriptions,public.household_members,public.properties to service_role;
alter table public.events add column if not exists push_queued_at timestamptz;
alter table public.watch_sources add column if not exists kind text not null default 'feed' check(kind in ('feed','search_page'));
alter table public.watch_sources add column if not exists link_selector text not null default 'a[href]';
create or replace function public.acquire_job_lock(lock_name text,lock_holder uuid) returns boolean language sql security definer set search_path='' as $$
 with acquired as(insert into public.job_locks values(lock_name,lock_holder,now()+interval '15 minutes') on conflict(name) do update set holder=excluded.holder,expires_at=excluded.expires_at where public.job_locks.expires_at<now() returning 1) select exists(select 1 from acquired); $$;
create or replace function public.release_job_lock(lock_name text,lock_holder uuid) returns void language sql security definer set search_path='' as $$ delete from public.job_locks where name=lock_name and holder=lock_holder; $$;
create or replace function public.queue_visit_reminders() returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.events(household_id,property_id,kind,title,body,dedupe_key)
 select p.household_id,p.id,'visit_reminder','Rappel de visite · '||p.title,'Visite le '||to_char(v.starts_at at time zone 'Europe/Paris','DD/MM/YYYY HH24:MI')||' (heure de Paris)','visit:'||v.id||':'||extract(epoch from v.starts_at)::text||':'||hours::text
 from public.visits v join public.properties p on p.id=v.property_id cross join(values(24),(1)) as delays(hours)
 where p.household_id is not null and v.starts_at>now() and v.starts_at-interval '1 hour'*hours<=now() and(hours=1 or v.starts_at>now()+interval '1 hour') on conflict(dedupe_key) do nothing;
end; $$;
create or replace function public.property_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.updated_at=now();
 if tg_op='UPDATE' and(new.owner_id<>old.owner_id or new.household_id is distinct from old.household_id) then
  if not(old.household_id is null and new.owner_id=old.owner_id and old.owner_id=auth.uid() and public.is_household_member(new.household_id)) then raise exception 'Ownership cannot change'; end if;
 end if;
 if new.household_id is null then return new; end if;
 if(tg_op='INSERT' and new.analysis_ready) or(tg_op='UPDATE' and new.analysis_ready and not old.analysis_ready) then
  insert into public.events(household_id,property_id,kind,title,body) values(new.household_id,new.id,'property_ready','Fiche complète · '||new.title,'Analyse disponible. Ouvrez la fiche pour le score et le potentiel.');
 elsif tg_op='UPDATE' and new.status is distinct from old.status then
  insert into public.events(household_id,property_id,kind,title,body) values(new.household_id,new.id,'status_changed',new.title,'Nouveau statut : '||new.status);
 end if;
 return new;
end; $$;
drop trigger if exists properties_events on public.properties;
create trigger properties_events before insert or update on public.properties for each row execute function public.property_event();
create or replace function public.collaboration_event() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.properties;
begin
 select * into p from public.properties where id=new.property_id;
 if p.household_id is null then return new; end if;
 insert into public.events(household_id,property_id,kind,title,body) values(p.household_id,p.id,case when tg_table_name='comments' then 'comment_added' else 'visit_changed' end,p.title,case when tg_table_name='comments' then 'Un membre de la SCI a ajouté un commentaire.' else 'Une visite a été planifiée ou modifiée.' end); return new;
end; $$;
drop trigger if exists comments_events on public.comments;
create trigger comments_events after insert on public.comments for each row execute function public.collaboration_event();
drop trigger if exists visits_events on public.visits;
create trigger visits_events after insert or update on public.visits for each row execute function public.collaboration_event();
create or replace function public.cancel_visit_events() returns trigger language plpgsql security definer set search_path='' as $$
declare h uuid;t text;
begin
 if tg_op='UPDATE' and new.starts_at=old.starts_at then return new;end if;
 select household_id,title into h,t from public.properties where id=old.property_id;
 delete from public.push_deliveries where sent_at is null and event_id in(select id from public.events where dedupe_key like 'visit:'||old.id||':%');
 update public.events set push_queued_at=now() where dedupe_key like 'visit:'||old.id||':%';
 if tg_op='DELETE' and h is not null then insert into public.events(household_id,property_id,kind,title,body) values(h,old.property_id,'visit_changed',t,'Une visite a été annulée.');end if;
 if tg_op='UPDATE' then return new;end if;
 return old;
end; $$;
drop trigger if exists visits_cancel_events on public.visits;
create trigger visits_cancel_events before delete or update of starts_at on public.visits for each row execute function public.cancel_visit_events();
-- Remove unknown prototype policies, including permissive policies, before defining SCI boundaries.
do $$ declare r record;t text;begin
 foreach t in array array['households','household_members','properties','comments','visits','events','push_subscriptions','push_deliveries','watch_sources','job_locks'] loop
  execute format('alter table public.%I enable row level security',t);
  for r in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',r.policyname,t);end loop;
 end loop;
end $$;
create policy households_read on public.households for select to authenticated using(public.is_household_member(id));
create policy members_read on public.household_members for select to authenticated using(public.is_household_member(household_id));
create policy properties_read on public.properties for select to authenticated using(public.is_household_member(household_id) or(household_id is null and owner_id=auth.uid()));
create policy properties_insert on public.properties for insert to authenticated with check(owner_id=auth.uid() and public.is_household_member(household_id));
create policy properties_update on public.properties for update to authenticated using(public.is_household_member(household_id) or(household_id is null and owner_id=auth.uid())) with check(public.is_household_member(household_id) or(household_id is null and owner_id=auth.uid()));
create policy properties_delete on public.properties for delete to authenticated using(public.is_household_member(household_id));
create or replace function public.append_property_photo(p uuid,object_path text) returns text[] language plpgsql set search_path='' as $$
declare paths text[];h uuid;
begin
 select household_id into h from public.properties where id=p;
 if(current_user<>'service_role' and not public.is_household_member(h)) or object_path not like h::text||'/'||p::text||'/%' then raise exception 'Invalid photo path';end if;
 update public.properties set photo_paths=array_append(photo_paths,object_path) where id=p and not(object_path=any(photo_paths)) returning photo_paths into paths;
 return paths;
end; $$;
create or replace function public.remove_property_photo(p uuid,object_path text) returns text[] language plpgsql set search_path='' as $$
declare paths text[];
begin
 update public.properties set photo_paths=array_remove(photo_paths,object_path) where id=p returning photo_paths into paths;
 return paths;
end; $$;
revoke all on function public.append_property_photo(uuid,text),public.remove_property_photo(uuid,text) from public,anon;
grant execute on function public.append_property_photo(uuid,text),public.remove_property_photo(uuid,text) to authenticated,service_role;
create policy comments_read on public.comments for select to authenticated using(exists(select 1 from public.properties p where p.id=property_id and public.is_household_member(p.household_id)));
create policy comments_insert on public.comments for insert to authenticated with check(author_id=auth.uid() and exists(select 1 from public.properties p where p.id=property_id and public.is_household_member(p.household_id)));
create policy visits_read on public.visits for select to authenticated using(exists(select 1 from public.properties p where p.id=property_id and public.is_household_member(p.household_id)));
create policy visits_write on public.visits for all to authenticated using(exists(select 1 from public.properties p where p.id=property_id and public.is_household_member(p.household_id))) with check(created_by=auth.uid() and exists(select 1 from public.properties p where p.id=property_id and public.is_household_member(p.household_id)));
create policy events_read on public.events for select to authenticated using(public.is_household_member(household_id));
create policy subscriptions_self on public.push_subscriptions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy sources_read on public.watch_sources for select to authenticated using(public.is_household_member(household_id));
create policy sources_write on public.watch_sources for all to authenticated using(public.is_household_admin(household_id)) with check(public.is_household_admin(household_id));
grant select on public.households,public.household_members,public.events to authenticated;
grant select,insert,update,delete on public.properties,public.comments,public.visits,public.watch_sources,public.push_subscriptions to authenticated;
revoke all on public.job_locks,public.push_deliveries from anon,authenticated;
revoke all on function public.acquire_job_lock(text,uuid),public.release_job_lock(text,uuid),public.queue_visit_reminders() from public,anon,authenticated;
grant execute on function public.acquire_job_lock(text,uuid),public.release_job_lock(text,uuid),public.queue_visit_reminders() to service_role;
revoke all on function public.create_household(text),public.add_household_member(uuid,text) from public,anon;
grant execute on function public.create_household(text),public.add_household_member(uuid,text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('property-photos','property-photos',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists lbma_photos_read on storage.objects;
drop policy if exists lbma_photos_insert on storage.objects;
drop policy if exists lbma_photos_delete on storage.objects;
create policy lbma_photos_read on storage.objects for select to authenticated using(bucket_id='property-photos' and exists(select 1 from public.properties p where p.id::text=(storage.foldername(name))[2] and p.household_id::text=(storage.foldername(name))[1] and public.is_household_member(p.household_id)));
create policy lbma_photos_insert on storage.objects for insert to authenticated with check(bucket_id='property-photos' and exists(select 1 from public.properties p where p.id::text=(storage.foldername(name))[2] and p.household_id::text=(storage.foldername(name))[1] and public.is_household_member(p.household_id)));
create policy lbma_photos_delete on storage.objects for delete to authenticated using(bucket_id='property-photos' and exists(select 1 from public.properties p where p.id::text=(storage.foldername(name))[2] and p.household_id::text=(storage.foldername(name))[1] and public.is_household_member(p.household_id)));
commit;
