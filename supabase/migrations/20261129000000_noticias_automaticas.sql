-- Noticias automáticas (prueba con fuentes gratuitas). Idempotente: se puede pegar más de una vez.
-- Requiere la migración de noticias (20261128200000) y la función noticias-rss desplegada.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Marcas para distinguir lo automático y lo oficial
alter table public.noticias add column if not exists automatica boolean not null default false;
alter table public.noticias add column if not exists oficial boolean not null default false;
create unique index if not exists noticias_enlace_unico on public.noticias (enlace);

-- Ajustes que solo ve el servidor (la app no puede leerlos: RLS activo y sin políticas)
create table if not exists public.ajustes_servidor (clave text primary key, valor text not null);
alter table public.ajustes_servidor enable row level security;
revoke all on public.ajustes_servidor from anon, authenticated;
insert into public.ajustes_servidor (clave, valor)
values ('noticias_cron', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (clave) do nothing;

-- Registro de cada corrida: qué fuentes respondieron, cuántas notas y cuánto costó
create table if not exists public.noticias_corridas (
  id bigint generated always as identity primary key,
  en timestamptz not null default now(),
  detalle jsonb not null
);
alter table public.noticias_corridas enable row level security;
revoke all on public.noticias_corridas from anon, authenticated;

-- Cada 4 horas (minuto 17). Si ya existe, se reemplaza.
select cron.unschedule(jobid) from cron.job where jobname = 'noticias-rss';
select cron.schedule('noticias-rss', '17 */4 * * *', $job$
  select net.http_post(
    url := 'https://wrupizvgedpszankbsyu.supabase.co/functions/v1/noticias-rss',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cuenfis-cron', (select valor from public.ajustes_servidor where clave = 'noticias_cron')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$job$);
