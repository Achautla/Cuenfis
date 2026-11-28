-- Revisión de bugs (noviembre 2026). Idempotente: se puede pegar en el SQL Editor más de una vez.

-- 1) Historial de versiones: conservar las 30 más RECIENTES por fecha de guardado.
--    Antes se ordenaba por número de versión; tras "Borrar mis datos de la nube" la versión vuelve a 1
--    y las copias nuevas se borraban en lugar de las viejas.
create or replace function public.espacios_versionar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.espacios_historial (user_id, version, datos, dispositivo)
      values (old.user_id, old.version, old.datos, old.dispositivo);
    delete from public.espacios_historial h
      where h.user_id = old.user_id
        and h.id not in (select id from public.espacios_historial where user_id = old.user_id order by id desc limit 30);
    new.version := old.version + 1;
  else
    new.version := 1;
  end if;
  new.actualizado_en := now();
  return new;
end $$;
revoke execute on function public.espacios_versionar() from public, anon, authenticated;

-- 2) "Borrar mis datos de la nube" también borra las copias anteriores (derecho de cancelación, LFPDPPP).
drop policy if exists "historial propio: borrar" on public.espacios_historial;
create policy "historial propio: borrar" on public.espacios_historial for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 3) Uso del asistente: apartar el mensaje de forma atómica para que dos peticiones a la vez
--    no pasen el límite. Devuelve true si se apartó (o si no era un mensaje nuevo y no se pasó del gasto).
create or replace function public.reservar_uso_ia(p_user uuid, p_mes text, p_mensajes integer, p_limite integer, p_limite_costo numeric)
returns boolean language plpgsql security definer set search_path = '' as $$
declare ok boolean;
begin
  insert into public.uso_ia (user_id, mes) values (p_user, p_mes) on conflict (user_id, mes) do nothing;
  update public.uso_ia u set mensajes = u.mensajes + p_mensajes, actualizado = now()
    where u.user_id = p_user and u.mes = p_mes
      and u.costo_usd < p_limite_costo
      and (p_mensajes = 0 or u.mensajes + p_mensajes <= p_limite)
    returning true into ok;
  return coalesce(ok, false);
end $$;
revoke execute on function public.reservar_uso_ia(uuid, text, integer, integer, numeric) from public, anon, authenticated;
grant execute on function public.reservar_uso_ia(uuid, text, integer, integer, numeric) to service_role;
