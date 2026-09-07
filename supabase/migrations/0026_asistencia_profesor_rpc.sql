-- Dance Manager: motor de asistencia/pago del profesor.
--
-- Corrige además el constraint de consistencia de la migración 0021:
-- la excepción "clase cancelada que sí paga" congela valor sin pasar
-- por estado_asistencia='presente' (nunca hubo check-in real), así que
-- el constraint original la rechazaba. Se reemplaza por una versión
-- que también permite ese caso, identificado por metodo_registro.

alter table public.class_occurrence_teachers
  drop constraint class_occurrence_teachers_consistencia;

alter table public.class_occurrence_teachers
  add constraint class_occurrence_teachers_consistencia check (
    (valor_congelado_en is null and estado_asistencia = 'programada')
    or (valor_congelado_en is not null and estado_asistencia in ('presente', 'ausente'))
    or (
      valor_congelado_en is not null
      and estado_asistencia = 'programada'
      and metodo_registro = 'cancelacion_pagada'
    )
  );

-- Defensa en profundidad: ninguna fila ya congelada puede recibir un
-- nuevo valor_generado/genera_pago por una vía distinta a "revertir"
-- (que primero descongela poniendo valor_congelado_en en null).
create function public.proteger_valor_congelado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.valor_congelado_en is not null
     and new.valor_congelado_en is not null
     and (new.valor_generado is distinct from old.valor_generado
          or new.genera_pago is distinct from old.genera_pago)
  then
    raise exception 'Este valor ya está confirmado y no se puede modificar.';
  end if;
  return new;
end;
$$;

create trigger proteger_valor_congelado_trigger
  before update on public.class_occurrence_teachers
  for each row execute function public.proteger_valor_congelado();

-- Flujo normal: recepción escanea el QR del profesor el mismo día de
-- su clase. Admin-only; valida la fecha contra el huso horario real de
-- la academia, no contra el reloj del servidor.
create function public.registrar_asistencia_profesor(
  p_occurrence_id uuid, p_profesor_id uuid, p_valor_override numeric default null
)
returns table (valor_generado numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fecha date;
  v_academia_id uuid;
  v_estado_occ public.estado_ocurrencia;
  v_fila record;
  v_valor numeric;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede registrar la asistencia de un profesor.';
  end if;

  select fecha, academia_id, estado into v_fecha, v_academia_id, v_estado_occ
  from public.class_occurrences where id = p_occurrence_id
  for update;

  if v_fecha is null then raise exception 'La clase no existe.'; end if;
  if v_estado_occ = 'cancelada' then raise exception 'Esta clase está cancelada.'; end if;
  if v_fecha <> public.fecha_hoy_academia(v_academia_id) then
    raise exception 'El QR solo registra clases de hoy. Usa la corrección manual para otras fechas.';
  end if;

  select id, estado_asistencia, valor_previsto into v_fila
  from public.class_occurrence_teachers
  where occurrence_id = p_occurrence_id and profesor_id = p_profesor_id
  for update;

  if v_fila.id is null then raise exception 'Este profesor no está asignado a esta clase.'; end if;
  if v_fila.estado_asistencia <> 'programada' then raise exception 'Esta clase ya fue registrada.'; end if;

  v_valor := coalesce(p_valor_override, v_fila.valor_previsto);
  if v_valor is null then
    raise exception 'No hay tarifa definida para este profesor en esta fecha. Configura primero su acuerdo económico.';
  end if;

  update public.class_occurrence_teachers
  set estado_asistencia = 'presente', registrado_en = now(), registrado_por = auth.uid(),
      valor_generado = v_valor, genera_pago = true, valor_congelado_en = now(), metodo_registro = 'qr'
  where id = v_fila.id;

  return query select v_valor;
end;
$$;

-- Bandeja "pendientes de validar": corrige una clase pasada que nadie
-- escaneó. Mismo motor, sin exigir fecha de hoy, y deja rastro de que
-- fue una corrección manual, no un escaneo real.
create function public.confirmar_asistencia_manual(
  p_occurrence_id uuid, p_profesor_id uuid, p_valor_override numeric default null, p_nota text default null
)
returns table (valor_generado numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado_occ public.estado_ocurrencia;
  v_fila record;
  v_valor numeric;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede confirmar asistencia manualmente.';
  end if;

  select estado into v_estado_occ from public.class_occurrences where id = p_occurrence_id for update;
  if v_estado_occ is null then raise exception 'La clase no existe.'; end if;
  if v_estado_occ = 'cancelada' then raise exception 'Esta clase está cancelada.'; end if;

  select id, estado_asistencia, valor_previsto into v_fila
  from public.class_occurrence_teachers
  where occurrence_id = p_occurrence_id and profesor_id = p_profesor_id
  for update;

  if v_fila.id is null then raise exception 'Este profesor no está asignado a esta clase.'; end if;
  if v_fila.estado_asistencia <> 'programada' then raise exception 'Esta clase ya fue registrada.'; end if;

  v_valor := coalesce(p_valor_override, v_fila.valor_previsto);
  if v_valor is null then
    raise exception 'No hay tarifa definida para este profesor en esta fecha. Configura primero su acuerdo económico.';
  end if;

  update public.class_occurrence_teachers
  set estado_asistencia = 'presente', registrado_en = now(), registrado_por = auth.uid(),
      valor_generado = v_valor, genera_pago = true, valor_congelado_en = now(),
      metodo_registro = 'manual', nota_registro = p_nota
  where id = v_fila.id;

  return query select v_valor;
end;
$$;

-- Bandeja "pendientes de validar": el profesor confirmó que no asistió
-- (o admin lo determina así). No genera pago; también queda resuelto
-- y congelado para que no vuelva a aparecer en la bandeja.
create function public.marcar_ausente_profesor(
  p_occurrence_id uuid, p_profesor_id uuid, p_nota text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila record;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  select id, estado_asistencia into v_fila
  from public.class_occurrence_teachers
  where occurrence_id = p_occurrence_id and profesor_id = p_profesor_id
  for update;

  if v_fila.id is null then raise exception 'Este profesor no está asignado a esta clase.'; end if;
  if v_fila.estado_asistencia <> 'programada' then raise exception 'Esta clase ya fue resuelta.'; end if;

  update public.class_occurrence_teachers
  set estado_asistencia = 'ausente', registrado_en = now(), registrado_por = auth.uid(),
      genera_pago = false, valor_congelado_en = now(),
      metodo_registro = 'manual', nota_registro = p_nota
  where id = v_fila.id;
end;
$$;

-- Excepción: la academia canceló la clase pero decide pagarla igual
-- (ej. el profesor ya se había desplazado). No hubo check-in real, así
-- que estado_asistencia se queda en 'programada'; el constraint de
-- arriba permite esta combinación exacta.
create function public.confirmar_pago_cancelada_excepcional(
  p_occurrence_id uuid, p_profesor_id uuid, p_valor_override numeric default null, p_nota text default null
)
returns table (valor_generado numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado_occ public.estado_ocurrencia;
  v_fila record;
  v_valor numeric;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  select estado into v_estado_occ from public.class_occurrences where id = p_occurrence_id for update;
  if v_estado_occ is null then raise exception 'La clase no existe.'; end if;
  if v_estado_occ <> 'cancelada' then raise exception 'Esta función solo aplica a clases canceladas.'; end if;

  select id, estado_asistencia, valor_previsto into v_fila
  from public.class_occurrence_teachers
  where occurrence_id = p_occurrence_id and profesor_id = p_profesor_id
  for update;

  if v_fila.id is null then raise exception 'Este profesor no está asignado a esta clase.'; end if;
  if v_fila.estado_asistencia <> 'programada' then raise exception 'Esta clase ya fue resuelta.'; end if;

  v_valor := coalesce(p_valor_override, v_fila.valor_previsto);
  if v_valor is null then
    raise exception 'No hay tarifa definida para este profesor en esta fecha.';
  end if;

  update public.class_occurrence_teachers
  set registrado_en = now(), registrado_por = auth.uid(),
      valor_generado = v_valor, genera_pago = true, valor_congelado_en = now(),
      metodo_registro = 'cancelacion_pagada', nota_registro = p_nota
  where id = v_fila.id;

  return query select v_valor;
end;
$$;

-- Corrige un registro por error. Bloqueada si esa fila ya forma parte
-- de una liquidación activa: primero hay que anular esa liquidación.
create function public.revertir_asistencia_profesor(p_occurrence_id uuid, p_profesor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila record;
  v_en_liquidacion boolean;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  select id, valor_congelado_en into v_fila
  from public.class_occurrence_teachers
  where occurrence_id = p_occurrence_id and profesor_id = p_profesor_id
  for update;

  if v_fila.id is null then raise exception 'No existe esa asignación.'; end if;
  if v_fila.valor_congelado_en is null then raise exception 'Esta clase todavía no ha sido registrada.'; end if;

  select exists (
    select 1 from public.teacher_liquidation_items tli
    where tli.occurrence_teacher_id = v_fila.id and tli.voided_at is null
  ) into v_en_liquidacion;

  if v_en_liquidacion then
    raise exception 'Esta clase ya forma parte de una liquidación activa; anula la liquidación primero.';
  end if;

  update public.class_occurrence_teachers
  set estado_asistencia = 'programada', valor_generado = null, genera_pago = null,
      valor_congelado_en = null, registrado_en = null, registrado_por = null,
      metodo_registro = null, nota_registro = null
  where id = v_fila.id;
end;
$$;

-- Ahora que existe teacher_liquidation_items, se agrega el resguardo
-- que faltaba en la versión de la migración 0023 (nunca recalcular una
-- fila que ya esté en una liquidación activa).
create or replace function public.recalcular_valores_previstos_pendientes(p_profesor_id uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actualizadas int;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede recalcular tarifas previstas.';
  end if;

  with candidatas as (
    select cot.id, cot.profesor_id, co.serie_id, co.fecha
    from public.class_occurrence_teachers cot
    join public.class_occurrences co on co.id = cot.occurrence_id
    where cot.estado_asistencia = 'programada'
      and cot.valor_generado is null
      and cot.valor_congelado_en is null
      and (p_profesor_id is null or cot.profesor_id = p_profesor_id)
      and not exists (
        select 1 from public.teacher_liquidation_items tli
        where tli.occurrence_teacher_id = cot.id and tli.voided_at is null
      )
  ),
  calculadas as (
    select
      c.id,
      coalesce(
        cst.amount_override,
        (
          select tpa.amount_per_class
          from public.teacher_payment_agreements tpa
          where tpa.teacher_id = c.profesor_id
            and tpa.effective_from <= c.fecha
            and (tpa.effective_to is null or tpa.effective_to >= c.fecha)
          order by tpa.effective_from desc
          limit 1
        )
      ) as nuevo_valor
    from candidatas c
    left join public.class_series_teachers cst
      on cst.serie_id = c.serie_id and cst.profesor_id = c.profesor_id
  )
  update public.class_occurrence_teachers cot
  set valor_previsto = calculadas.nuevo_valor
  from calculadas
  where cot.id = calculadas.id
    and calculadas.nuevo_valor is not null
    and cot.valor_previsto is distinct from calculadas.nuevo_valor;

  get diagnostics v_actualizadas = row_count;
  return v_actualizadas;
end;
$$;
