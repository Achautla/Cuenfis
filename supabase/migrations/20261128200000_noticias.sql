-- Fase 11: tablero de noticias. Las publica el equipo de Cuenfis desde el panel de Supabase;
-- la app solo las lee (las publicadas). Idempotente: se puede pegar más de una vez.
create table if not exists public.noticias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 5 and 140),
  resumen text not null check (char_length(resumen) between 10 and 600),
  enlace text check (enlace is null or enlace ~ '^https://'),
  fuente text not null default 'Cuenfis',
  temas text[] not null default '{}' check (temas <@ array['impuestos','ahorro','credito','inversion','economia']),
  regimenes text[] not null default '{}' check (regimenes <@ array['sueldos','resico','honorarios','arrendamiento','plataformas']),
  fecha date not null default current_date,
  publicada boolean not null default false,
  creada timestamptz not null default now()
);
create index if not exists noticias_fecha on public.noticias (fecha desc) where publicada;

alter table public.noticias enable row level security;
drop policy if exists "leer noticias publicadas" on public.noticias;
create policy "leer noticias publicadas" on public.noticias for select to anon, authenticated using (publicada);
revoke insert, update, delete on public.noticias from anon, authenticated;
