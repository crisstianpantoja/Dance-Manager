-- Dance Manager: ciclo de vida de las liquidaciones mensuales.
--
-- crear_liquidacion_mensual barre TODO lo generado y no liquidado del
-- profesor (incluyendo ajustes de meses anteriores que se confirmaron
-- tarde), pero nunca clases posteriores al periodo que se está
-- liquidando: "liquidación de septiembre" puede traer un ajuste de
-- agosto, nunca una clase de octubre.

create function public.crear_liquidacion_mensual(p_teacher_id uuid, p_year int, p_month int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liq uuid;
  v_total numeric;
  v_items int;
  v_fin date;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  v_fin := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;

  insert into public.teacher_liquidations (teacher_id, year, month, estado)
    values (p_teacher_id, p_year, p_month, 'pendiente')
    returning id into v_liq;

  insert into public.teacher_liquidation_items (liquidation_id, occurrence_teacher_id, teacher_id, amount, fecha_clase)
  select v_liq, cot.id, p_teacher_id, cot.valor_generado, co.fecha
  from public.class_occurrence_teachers cot
  join public.class_occurrences co on co.id = cot.occurrence_id
  where cot.profesor_id = p_teacher_id
    and cot.genera_pago = true
    and cot.valor_generado is not null
    and co.fecha <= v_fin
    and not exists (
      select 1 from public.teacher_liquidation_items tli
      where tli.occurrence_teacher_id = cot.id and tli.voided_at is null
    );

  get diagnostics v_items = row_count;

  if v_items = 0 then
    delete from public.teacher_liquidations where id = v_liq;
    return null;
  end if;

  select sum(amount) into v_total from public.teacher_liquidation_items where liquidation_id = v_liq;
  update public.teacher_liquidations set total_amount = v_total where id = v_liq;

  return v_liq;
end;
$$;

create function public.aprobar_liquidacion(p_liquidacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
begin
  if not public.is_admin() then raise exception 'No autorizado.'; end if;

  select estado into v_estado from public.teacher_liquidations where id = p_liquidacion_id for update;
  if v_estado is null then raise exception 'La liquidación no existe.'; end if;
  if v_estado <> 'pendiente' then raise exception 'Solo se puede aprobar una liquidación pendiente.'; end if;

  update public.teacher_liquidations
  set estado = 'aprobada', approved_at = now()
  where id = p_liquidacion_id;
end;
$$;

-- Una liquidación pagada queda inmutable: no admite otra llamada a
-- esta función ni a anular_liquidacion.
create function public.marcar_liquidacion_pagada(
  p_liquidacion_id uuid, p_fecha_pago date, p_metodo_pago text,
  p_observaciones text default null, p_comprobante_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
begin
  if not public.is_admin() then raise exception 'No autorizado.'; end if;

  select estado into v_estado from public.teacher_liquidations where id = p_liquidacion_id for update;
  if v_estado is null then raise exception 'La liquidación no existe.'; end if;
  if v_estado = 'pagada' then raise exception 'Esta liquidación ya está pagada.'; end if;
  if v_estado = 'anulada' then raise exception 'Esta liquidación fue anulada.'; end if;

  update public.teacher_liquidations
  set estado = 'pagada', paid_at = p_fecha_pago, payment_method = p_metodo_pago,
      notes = coalesce(p_observaciones, notes), proof_url = coalesce(p_comprobante_url, proof_url)
  where id = p_liquidacion_id;
end;
$$;

-- Anular conserva la liquidación y sus items (voided_at), nunca los
-- borra; libera las clases para que puedan entrar a una liquidación
-- futura. Una liquidación pagada no se puede anular.
create function public.anular_liquidacion(p_liquidacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
begin
  if not public.is_admin() then raise exception 'No autorizado.'; end if;

  select estado into v_estado from public.teacher_liquidations where id = p_liquidacion_id for update;
  if v_estado is null then raise exception 'La liquidación no existe.'; end if;
  if v_estado = 'pagada' then raise exception 'Una liquidación pagada no se puede anular.'; end if;
  if v_estado = 'anulada' then return; end if;

  update public.teacher_liquidation_items
  set voided_at = now()
  where liquidation_id = p_liquidacion_id and voided_at is null;

  update public.teacher_liquidations
  set estado = 'anulada'
  where id = p_liquidacion_id;
end;
$$;
