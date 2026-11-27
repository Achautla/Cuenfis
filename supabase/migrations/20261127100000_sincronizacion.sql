-- Fase 4: sincronización. La app es "primero local": el estado completo de cada usuario se guarda
-- como un documento JSON con número de versión (evita que un dispositivo pise los cambios de otro).
-- Cada versión anterior se conserva en un historial (últimas 30) para poder recuperarla.

create table public.espacios (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  datos jsonb not null,
  version bigint not null default 1,
  dispositivo text,
  actualizado_en timestamptz not null default now(),
  check (pg_column_size(datos) < 5 * 1024 * 1024)
);

create table public.espacios_historial (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  version bigint not null,
  datos jsonb not null,
  dispositivo text,
  guardado_en timestamptz not null default now()
);
create index espacios_historial_user_idx on public.espacios_historial (user_id, version desc);

alter table public.espacios enable row level security;
alter table public.espacios_historial enable row level security;

create policy "espacio propio: leer" on public.espacios for select to authenticated using ((select auth.uid()) = user_id);
create policy "espacio propio: crear" on public.espacios for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "espacio propio: actualizar" on public.espacios for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "espacio propio: borrar" on public.espacios for delete to authenticated using ((select auth.uid()) = user_id);
create policy "historial propio: leer" on public.espacios_historial for select to authenticated using ((select auth.uid()) = user_id);

-- Versión: siempre +1 en cada cambio y copia de la versión anterior al historial
create or replace function public.espacios_versionar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.espacios_historial (user_id, version, datos, dispositivo)
      values (old.user_id, old.version, old.datos, old.dispositivo);
    delete from public.espacios_historial h
      where h.user_id = old.user_id
        and h.id not in (select id from public.espacios_historial where user_id = old.user_id order by version desc limit 30);
    new.version := old.version + 1;
  else
    new.version := 1;
  end if;
  new.actualizado_en := now();
  return new;
end $$;
revoke execute on function public.espacios_versionar() from public, anon, authenticated;

create trigger espacios_versionar before insert or update on public.espacios
  for each row execute function public.espacios_versionar();

-- Acuses del SAT: bucket privado, cada usuario solo ve su carpeta (<user_id>/...)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('acuses', 'acuses', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
  on conflict (id) do nothing;

create policy "acuses propios: leer" on storage.objects for select to authenticated
  using (bucket_id = 'acuses' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "acuses propios: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'acuses' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "acuses propios: reemplazar" on storage.objects for update to authenticated
  using (bucket_id = 'acuses' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "acuses propios: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'acuses' and (storage.foldername(name))[1] = (select auth.uid())::text);
