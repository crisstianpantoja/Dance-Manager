-- Dance Manager: resumen y detalle financiero del profesor (Generado,
-- Por dictar, Pendiente de validar, Pagado, Pendiente por pagar), para
-- la pantalla Profesor > Finanzas y su equivalente en el admin.
-- SECURITY DEFINER solo para poder validar el rol; el profesor nunca
-- puede consultar el de otro (se fuerza p_profesor_id = auth.uid()
-- salvo que quien llame sea admin).

create function public.resumen_financiero_profesor(p_profesor_id uuid, p_year int, p_month int)
returns table (
  generado numeric,
  generado_clases int,
  por_dictar numeric,
  por_dictar_clases int,
  pendiente_validar numeric,
  pendiente_validar_clases int,
  pagado numeric,
  pendiente_por_pagar numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desde date;
  v_hasta date;
  v_hoy date;
begin
  if public.current_user_role() = 'profesor' and p_profesor_id <> auth.uid() then
    raise exception 'No autorizado.';
  elsif not (public.is_admin() or public.current_user_role() = 'profesor') then
    raise exception 'No autorizado.';
  end if;

  v_desde := make_date(p_year, p_month, 1);
  v_hasta := (v_desde + interval '1 month' - interval '1 day')::date;
  v_hoy := public.fecha_hoy_academia(null);

  select coalesce(sum(cot.valor_generado), 0), count(*)
    into generado, generado_clases
  from public.class_occurrence_teachers cot
  join public.class_occurrences co on co.id = cot.occurrence_id
  where cot.profesor_id = p_profesor_id
    and cot.genera_pago = true and cot.valor_generado is not null
    and co.fecha between v_desde and v_hasta;

  select coalesce(sum(cot.valor_previsto), 0), count(*)
    into por_dictar, por_dictar_clases
  from public.class_occurrence_teachers cot
  join public.class_occurrences co on co.id = cot.occurrence_id
  where cot.profesor_id = p_profesor_id
    and cot.estado_asistencia = 'programada' and co.estado = 'programada'
    and co.fecha >= v_hoy and co.fecha between v_desde and v_hasta;

  select coalesce(sum(cot.valor_previsto), 0), count(*)
    into pendiente_validar, pendiente_validar_clases
  from public.class_occurrence_teachers cot
  join public.class_occurrences co on co.id = cot.occurrence_id
  where cot.profesor_id = p_profesor_id
    and cot.estado_asistencia = 'programada' and co.estado = 'programada'
    and co.fecha < v_hoy and co.fecha between v_desde and v_hasta;

  select coalesce(sum(tli.amount), 0) into pagado
  from public.teacher_liquidation_items tli
  join public.teacher_liquidations tl on tl.id = tli.liquidation_id
  where tli.teacher_id = p_profesor_id and tli.voided_at is null and tl.estado = 'pagada'
    and tli.fecha_clase between v_desde and v_hasta;

  select coalesce(sum(cot.valor_generado), 0) into pendiente_por_pagar
  from public.class_occurrence_teachers cot
  join public.class_occurrences co on co.id = cot.occurrence_id
  where cot.profesor_id = p_profesor_id
    and cot.genera_pago = true and cot.valor_generado is not null
    and co.fecha between v_desde and v_hasta
    and not exists (
      select 1 from public.teacher_liquidation_items tli
      join public.teacher_liquidations tl on tl.id = tli.liquidation_id
      where tli.occurrence_teacher_id = cot.id and tli.voided_at is null and tl.estado = 'pagada'
    );

  return next;
end;
$$;

create function public.detalle_financiero_profesor(p_profesor_id uuid, p_year int, p_month int)
returns table (fecha date, titulo text, lugar text, valor numeric, estado text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desde date;
  v_hasta date;
  v_hoy date;
begin
  if public.current_user_role() = 'profesor' and p_profesor_id <> auth.uid() then
    raise exception 'No autorizado.';
  elsif not (public.is_admin() or public.current_user_role() = 'profesor') then
    raise exception 'No autorizado.';
  end if;

  v_desde := make_date(p_year, p_month, 1);
  v_hasta := (v_desde + interval '1 month' - interval '1 day')::date;
  v_hoy := public.fecha_hoy_academia(null);

  return query
  select co.fecha, cs.titulo, cs.lugar, cot.valor_generado,
    case
      when exists (
        select 1 from public.teacher_liquidation_items tli
        join public.teacher_liquidations tl on tl.id = tli.liquidation_id
        where tli.occurrence_teacher_id = cot.id and tli.voided_at is null and tl.estado = 'pagada'
      ) then 'Pagado'
      else 'Generado'
    end
  from public.class_occurrence_teachers cot
  join public.class_occurrences co on co.id = cot.occurrence_id
  join public.class_series cs on cs.id = co.serie_id
  where cot.profesor_id = p_profesor_id
    and cot.genera_pago = true and cot.valor_generado is not null
    and co.fecha between v_desde and v_hasta

  union all

  select co.fecha, cs.titulo, cs.lugar, cot.valor_previsto,
    case when co.fecha >= v_hoy then 'Por dictar' else 'Pendiente de validar' end
  from public.class_occurrence_teachers cot
  join public.class_occurrences co on co.id = cot.occurrence_id
  join public.class_series cs on cs.id = co.serie_id
  where cot.profesor_id = p_profesor_id
    and cot.estado_asistencia = 'programada' and co.estado = 'programada'
    and co.fecha between v_desde and v_hasta

  order by fecha;
end;
$$;
