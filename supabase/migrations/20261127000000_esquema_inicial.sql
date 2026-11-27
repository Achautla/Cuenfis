-- Cuenfis: esquema inicial. Cada fila pertenece a un usuario y solo él la ve (RLS).
-- Montos en numeric(14,2). El cálculo fiscal vive en la app (src/core); aquí solo se guardan datos capturados.

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  rfc text check (rfc is null or rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
  curp text,
  frontera boolean not null default false,
  preferencias jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.regimenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reg text not null check (reg in ('sueldos', 'resico', 'honorarios', 'arrendamiento', 'plataformas')),
  desde date not null,
  hasta date,
  check (hasta is null or hasta >= desde)
);

create table public.cuentas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('efectivo', 'debito', 'ahorro', 'inversion', 'credito', 'prestamo')),
  saldo_inicial numeric(14,2) not null default 0,
  fecha_inicial date,
  limite numeric(14,2),
  dia_corte smallint check (dia_corte between 1 and 31),
  dia_pago smallint check (dia_pago between 1 and 31),
  tasa_anual numeric(6,4),
  archivada boolean not null default false,
  creado_en timestamptz not null default now()
);

create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'salida', 'transferencia')),
  fecha date not null,
  monto numeric(14,2) not null check (monto > 0),
  cuenta_id uuid not null references public.cuentas (id) on delete restrict,
  cuenta_destino_id uuid references public.cuentas (id) on delete restrict,
  categoria text,
  forma_pago text check (forma_pago in ('transferencia', 'tarjeta', 'efectivo')),
  pagador text check (pagador in ('pf', 'pm', 'publico')),
  tasa_iva text check (tasa_iva in ('0.16', '0.08', '0', 'exento')),
  cfdi boolean not null default false,
  cfdi_uuid text,
  ajuste jsonb,                       -- subtotal/iva/isrRet/ivaRet cuando la factura dice otra cosa
  sueldo_bruto numeric(14,2),
  isr_retenido_nomina numeric(14,2),
  contraparte text,
  nota text,
  declaracion text,                   -- 'YYYY-MM' en los pagos al SAT
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check ((tipo = 'transferencia') = (cuenta_destino_id is not null)),
  check (tipo = 'transferencia' or categoria is not null)
);

create table public.movimientos_historial (
  id bigint generated always as identity primary key,
  movimiento_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  en timestamptz not null default now(),
  accion text not null check (accion in ('creado', 'editado', 'borrado')),
  antes jsonb
);

create table public.declaraciones (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  periodo text not null check (periodo ~ '^[0-9]{4}(-[0-9]{2})?$'),   -- 'YYYY-MM' mensual o 'YYYY' anual
  regimen text not null check (regimen in ('sueldos', 'resico', 'honorarios', 'arrendamiento', 'plataformas')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'presentada', 'pagada')),
  monto numeric(14,2),
  isr numeric(14,2),
  iva numeric(14,2),
  fecha date,
  acuse_path text,                    -- ruta en Storage del acuse
  primary key (user_id, periodo, regimen)
);

create index on public.regimenes (user_id);
create index on public.cuentas (user_id);
create index on public.movimientos (user_id, fecha);
create index on public.movimientos (cuenta_id);
create index on public.movimientos (cuenta_destino_id);
create index on public.movimientos_historial (user_id, movimiento_id);

-- RLS: cada usuario solo lee y escribe lo suyo
alter table public.perfiles enable row level security;
alter table public.regimenes enable row level security;
alter table public.cuentas enable row level security;
alter table public.movimientos enable row level security;
alter table public.movimientos_historial enable row level security;
alter table public.declaraciones enable row level security;

create policy "perfil propio" on public.perfiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "regimenes propios" on public.regimenes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "cuentas propias" on public.cuentas for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "movimientos propios" on public.movimientos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "historial propio: leer" on public.movimientos_historial for select to authenticated
  using (user_id = (select auth.uid()));
create policy "declaraciones propias" on public.declaraciones for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Historial automático de cambios (quién, cuándo y qué cambió)
create or replace function public.registrar_historial() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.movimientos_historial (movimiento_id, user_id, accion) values (new.id, new.user_id, 'creado');
    return new;
  elsif tg_op = 'UPDATE' then
    new.actualizado_en := now();
    insert into public.movimientos_historial (movimiento_id, user_id, accion, antes) values (new.id, new.user_id, 'editado', to_jsonb(old));
    return new;
  else
    insert into public.movimientos_historial (movimiento_id, user_id, accion, antes) values (old.id, old.user_id, 'borrado', to_jsonb(old));
    return old;
  end if;
end $$;
revoke execute on function public.registrar_historial() from public, anon, authenticated;

create trigger movimientos_historial_ins after insert on public.movimientos for each row execute function public.registrar_historial();
create trigger movimientos_historial_upd before update on public.movimientos for each row execute function public.registrar_historial();
create trigger movimientos_historial_del after delete on public.movimientos for each row execute function public.registrar_historial();

-- Una cuenta solo puede usarse en movimientos de su mismo dueño
create or replace function public.validar_cuentas_movimiento() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.cuentas c where c.id = new.cuenta_id and c.user_id = new.user_id)
     or (new.cuenta_destino_id is not null and not exists (select 1 from public.cuentas c where c.id = new.cuenta_destino_id and c.user_id = new.user_id)) then
    raise exception 'La cuenta no pertenece al usuario';
  end if;
  return new;
end $$;
create trigger movimientos_validar_cuentas before insert or update on public.movimientos for each row execute function public.validar_cuentas_movimiento();

-- Perfil vacío al registrarse
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
revoke execute on function public.crear_perfil() from public, anon, authenticated;
create trigger al_registrarse after insert on auth.users for each row execute function public.crear_perfil();
