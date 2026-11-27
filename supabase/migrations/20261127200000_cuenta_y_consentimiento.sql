-- Fase 5: derechos del titular. Registro del consentimiento expreso y eliminación de la cuenta por el propio usuario.

create table public.consentimientos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  documento text not null check (documento in ('aviso_privacidad', 'terminos')),
  version text not null,
  aceptado_en timestamptz not null default now(),
  unique (user_id, documento, version)
);
alter table public.consentimientos enable row level security;
create policy "consentimiento propio: leer" on public.consentimientos for select to authenticated using ((select auth.uid()) = user_id);
create policy "consentimiento propio: crear" on public.consentimientos for insert to authenticated with check ((select auth.uid()) = user_id);

-- El usuario puede eliminar su cuenta y todos sus datos (derecho de cancelación).
-- La app borra antes sus acuses con la API de Storage; aquí se borra el usuario y las tablas con
-- "on delete cascade" (espacios, historial, consentimientos, etc.) se limpian solas.
create or replace function public.eliminar_mi_cuenta() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sin sesión'; end if;
  delete from auth.users where id = uid;
end $$;
revoke execute on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.eliminar_mi_cuenta() to authenticated;
