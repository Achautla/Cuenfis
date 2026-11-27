-- Fase 7: asistente de IA. Idempotente: se puede pegar más de una vez en el SQL Editor.

-- 1) El consentimiento expreso para usar la IA se guarda junto a los demás.
alter table public.consentimientos drop constraint if exists consentimientos_documento_check;
alter table public.consentimientos add constraint consentimientos_documento_check
  check (documento in ('aviso_privacidad', 'terminos', 'asistente_ia'));

-- Retirar el consentimiento de la IA (el usuario puede apagarla cuando quiera).
drop policy if exists "consentimiento propio: retirar ia" on public.consentimientos;
create policy "consentimiento propio: retirar ia" on public.consentimientos for delete to authenticated
  using ((select auth.uid()) = user_id and documento = 'asistente_ia');

-- 2) Uso del asistente por usuario y por mes. Solo conteos, nunca el contenido de las conversaciones.
create table if not exists public.uso_ia (
  user_id uuid not null references auth.users (id) on delete cascade,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  mensajes integer not null default 0,
  tokens_entrada bigint not null default 0,
  tokens_salida bigint not null default 0,
  costo_usd numeric(12, 6) not null default 0,
  actualizado timestamptz not null default now(),
  primary key (user_id, mes)
);
alter table public.uso_ia enable row level security;
drop policy if exists "uso propio: leer" on public.uso_ia;
create policy "uso propio: leer" on public.uso_ia for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.uso_ia from anon, authenticated;

-- Solo el servidor (función asistente) suma uso.
create or replace function public.sumar_uso_ia(p_user uuid, p_mes text, p_mensajes integer, p_entrada bigint, p_salida bigint, p_costo numeric)
returns void language sql security definer set search_path = '' as $$
  insert into public.uso_ia as u (user_id, mes, mensajes, tokens_entrada, tokens_salida, costo_usd)
  values (p_user, p_mes, p_mensajes, p_entrada, p_salida, p_costo)
  on conflict (user_id, mes) do update set
    mensajes = u.mensajes + excluded.mensajes,
    tokens_entrada = u.tokens_entrada + excluded.tokens_entrada,
    tokens_salida = u.tokens_salida + excluded.tokens_salida,
    costo_usd = u.costo_usd + excluded.costo_usd,
    actualizado = now();
$$;
revoke execute on function public.sumar_uso_ia(uuid, text, integer, bigint, bigint, numeric) from public, anon, authenticated;
grant execute on function public.sumar_uso_ia(uuid, text, integer, bigint, bigint, numeric) to service_role;
