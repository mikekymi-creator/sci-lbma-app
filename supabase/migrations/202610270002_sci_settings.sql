begin;
alter table public.households add column if not exists sci_settings jsonb not null default '{}';
create or replace function public.save_sci_settings(h uuid,settings jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a jsonb;f jsonb;total numeric:=0;
begin
 if not public.is_household_admin(h) then raise exception 'Seul un administrateur peut modifier les paramètres SCI.';end if;
 if jsonb_typeof(settings) is distinct from 'object' or jsonb_typeof(settings->'associates') is distinct from 'array' or jsonb_array_length(settings->'associates') not between 1 and 20 then raise exception 'Paramètres SCI invalides.';end if;
 if coalesce((settings->>'capital')::numeric,-1) not between 0 and 1000000000 or coalesce((settings->>'reserve')::numeric,-1) not between 0 and 1000000000 then raise exception 'Capital ou réserve invalide.';end if;
 for a in select * from jsonb_array_elements(settings->'associates') loop
  if jsonb_typeof(a->'name') is distinct from 'string' or length(trim(coalesce(a->>'name',''))) not between 1 and 80 or coalesce((a->>'shares')::numeric,-1) not between 0 and 100 or coalesce((a->>'contribution')::numeric,-1) not between 0 and 1000000000 then raise exception 'Données associé invalides.';end if;
  total:=total+(a->>'shares')::numeric;
 end loop;
 if abs(total-100)>=0.01 then raise exception 'Le total des parts doit être égal à 100 %%.';end if;
 f:=settings->'finance_defaults';
 if jsonb_typeof(f) is distinct from 'object' or jsonb_typeof(f->'credit') is distinct from 'boolean'
 or coalesce((f->>'contribution')::numeric,-1) not between 0 and 100000000
 or coalesce((f->>'years')::numeric,-1) not between 1 and 40 or (f->>'years')::numeric<>trunc((f->>'years')::numeric)
 or coalesce((f->>'rate')::numeric,-1) not between 0 and 25
 or coalesce((f->>'management_pct')::numeric,-1) not between 0 and 100
 or coalesce((f->>'notary_pct')::numeric,-1) not between 0 and 30
 or coalesce((f->>'cashflow_target')::numeric,-1) not between 0 and 1000000 then raise exception 'Hypothèses de financement invalides.';end if;
 update public.households set sci_settings=settings where id=h;
 return settings;
end; $$;
revoke all on function public.save_sci_settings(uuid,jsonb) from public,anon;
grant execute on function public.save_sci_settings(uuid,jsonb) to authenticated;
grant select on public.households to service_role;
commit;
