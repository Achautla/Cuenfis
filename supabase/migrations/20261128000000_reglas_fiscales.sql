-- Reglas fiscales publicadas (fase 6). Cualquiera puede leerlas; nadie puede escribirlas desde la app.
-- Se publican desde el SQL Editor de Supabase después de revisarlas (ver docs/reglas-fiscales.md).
-- Idempotente: se puede pegar más de una vez.
create table if not exists public.reglas_fiscales (
  anio integer primary key check (anio between 2020 and 2100),
  revision integer not null default 1 check (revision > 0),
  datos jsonb not null,
  publicada boolean not null default false,
  nota text,
  actualizada timestamptz not null default now()
);

alter table public.reglas_fiscales enable row level security;

drop policy if exists "reglas publicadas visibles para todos" on public.reglas_fiscales;
create policy "reglas publicadas visibles para todos" on public.reglas_fiscales
  for select to anon, authenticated using (publicada);

revoke insert, update, delete on public.reglas_fiscales from anon, authenticated;
grant select on public.reglas_fiscales to anon, authenticated;
