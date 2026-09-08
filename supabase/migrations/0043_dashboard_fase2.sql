-- Dance Manager: agregaciones para el Dashboard del admin (Fase 2) —
-- salud de la academia, tendencia financiera, evolución de alumnos,
-- rendimiento de clases y finanzas de profesores. Mismo patrón que la
-- Fase 1 (0042): SECURITY DEFINER, solo admin, escopadas por
-- organización y opcionalmente por sede vía dashboard_coincide_sede.

-- ===== Salud de la academia =====
-- Función privada (sin chequeo de admin propio: solo la llama
-- dashboard_salud, que sí valida) que calcula todas las métricas para
-- UN periodo. dashboard_salud la invoca dos veces (actual y anterior)
-- para poder mostrar la tendencia del puntaje.
create function public.dashboard_salud_en(p_academia_id uuid, p_desde date, p_hasta date)
returns table (
  score int,
  retencion_pct numeric,
  asistencia_pct numeric,
  pagos_al_dia_pct numeric,
  crecimiento_pct numeric,
  ocupacion_pct numeric,
  frecuentes int,
  en_riesgo int,
  inactivos int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_org_id();
  v_total_con_historial int;
  v_alumnos_actuales int;
  v_asist_registradas int;
  v_alumno_clases_programadas int;
  v_alumnos_antes int;
  v_alumnos_nuevos int;
  v_crecimiento_score numeric;
  v_ocupacion numeric;
begin
  -- Clasificación de alumnos con al menos un pago pagado, evaluada al
  -- final del periodo (p_hasta): inactivo = ningún plan vigente; entre
  -- los vigentes, en_riesgo = sin asistencia en los últimos 14 días (o
  -- nunca asistió), frecuente = sí asistió recientemente.
  with pagos as (
    select pg.alumno_id,
      bool_or(pg.fecha_vencimiento is null or pg.fecha_vencimiento >= p_hasta) as tiene_vigente
    from public.payments pg
    join public.students s on s.id = pg.alumno_id
    where pg.organization_id = v_org and pg.estado = 'pagado' and pg.fecha <= p_hasta
      and public.dashboard_coincide_sede(s.academia_id, p_academia_id)
    group by pg.alumno_id
  ),
  ultima_asistencia as (
    select ar.alumno_id, max(ar.fecha) as ultima
    from public.attendance_records ar
    join public.students s on s.id = ar.alumno_id
    where ar.organization_id = v_org and ar.anulado = false and ar.fecha <= p_hasta
      and public.dashboard_coincide_sede(s.academia_id, p_academia_id)
    group by ar.alumno_id
  )
  select
    count(*) filter (where not pagos.tiene_vigente),
    count(*) filter (where pagos.tiene_vigente and (ua.ultima is null or ua.ultima < p_hasta - 14)),
    count(*) filter (where pagos.tiene_vigente and ua.ultima >= p_hasta - 14),
    count(*)
  into inactivos, en_riesgo, frecuentes, v_total_con_historial
  from pagos
  left join ultima_asistencia ua on ua.alumno_id = pagos.alumno_id;

  retencion_pct := case when v_total_con_historial > 0
    then round(100.0 * (frecuentes + en_riesgo) / v_total_con_historial, 1) else 100 end;

  -- Asistencia: asistencias registradas / cupos-alumno programados en
  -- ocurrencias no canceladas del periodo.
  select count(*) into v_asist_registradas
  from public.attendance_records ar
  join public.students s on s.id = ar.alumno_id
  where ar.organization_id = v_org and ar.anulado = false
    and ar.fecha between p_desde and p_hasta
    and public.dashboard_coincide_sede(s.academia_id, p_academia_id);

  select coalesce(sum(cardinality(co.alumno_ids)), 0) into v_alumno_clases_programadas
  from public.class_occurrences co
  where co.organization_id = v_org and co.estado = 'programada'
    and co.fecha between p_desde and p_hasta
    and public.dashboard_coincide_sede(co.academia_id, p_academia_id);

  asistencia_pct := case when v_alumno_clases_programadas > 0
    then round(least(100.0, 100.0 * v_asist_registradas / v_alumno_clases_programadas), 1) else 0 end;

  -- Pagos al día: alumnos actuales sin un problema de pago abierto
  -- (plan vencido sin renovar). No cuenta comprobantes pendientes de
  -- verificar por separado para no mezclar dos conceptos distintos.
  select count(*) into v_alumnos_actuales
  from public.students s
  where s.organization_id = v_org and s.created_at::date <= p_hasta
    and public.dashboard_coincide_sede(s.academia_id, p_academia_id);

  pagos_al_dia_pct := case when v_alumnos_actuales > 0
    then round(100.0 * greatest(0, v_alumnos_actuales - inactivos) / v_alumnos_actuales, 1) else 100 end;

  -- Crecimiento: alumnos nuevos del periodo vs. los que ya había al
  -- empezar. Se usa como puntaje 0-100 con 50 = "sin crecimiento".
  select count(*) into v_alumnos_antes
  from public.students s
  where s.organization_id = v_org and s.created_at::date < p_desde
    and public.dashboard_coincide_sede(s.academia_id, p_academia_id);

  select count(*) into v_alumnos_nuevos
  from public.students s
  where s.organization_id = v_org and s.created_at::date between p_desde and p_hasta
    and public.dashboard_coincide_sede(s.academia_id, p_academia_id);

  crecimiento_pct := case when v_alumnos_antes > 0
    then round(100.0 * v_alumnos_nuevos / v_alumnos_antes, 1)
    else (case when v_alumnos_nuevos > 0 then 100 else 0 end) end;

  v_crecimiento_score := greatest(0, least(100, 50 + crecimiento_pct));

  -- Ocupación de clases del periodo (promedio inscritos/cupo).
  select avg(cardinality(co.alumno_ids)::numeric / nullif(cs.cupo_maximo, 0)) * 100
    into v_ocupacion
  from public.class_occurrences co
  join public.class_series cs on cs.id = co.serie_id
  where co.organization_id = v_org and co.estado = 'programada'
    and co.fecha between p_desde and p_hasta and cs.cupo_maximo is not null
    and public.dashboard_coincide_sede(co.academia_id, p_academia_id);
  ocupacion_pct := round(least(100, coalesce(v_ocupacion, 0)), 1);

  score := round(
    0.25 * retencion_pct + 0.25 * asistencia_pct + 0.20 * pagos_al_dia_pct
    + 0.15 * v_crecimiento_score + 0.15 * ocupacion_pct
  );

  return next;
end;
$$;

create function public.dashboard_salud(p_academia_id uuid, p_desde date, p_hasta date)
returns table (
  score int,
  score_prev int,
  retencion_pct numeric,
  asistencia_pct numeric,
  pagos_al_dia_pct numeric,
  crecimiento_pct numeric,
  ocupacion_pct numeric,
  frecuentes int,
  en_riesgo int,
  inactivos int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dias int := p_hasta - p_desde;
  v_desde_prev date := p_desde - (v_dias + 1);
  v_hasta_prev date := p_desde - 1;
  r record;
  r_prev record;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede consultar el dashboard.';
  end if;

  select * into r from public.dashboard_salud_en(p_academia_id, p_desde, p_hasta);
  select * into r_prev from public.dashboard_salud_en(p_academia_id, v_desde_prev, v_hasta_prev);

  score := r.score;
  score_prev := r_prev.score;
  retencion_pct := r.retencion_pct;
  asistencia_pct := r.asistencia_pct;
  pagos_al_dia_pct := r.pagos_al_dia_pct;
  crecimiento_pct := r.crecimiento_pct;
  ocupacion_pct := r.ocupacion_pct;
  frecuentes := r.frecuentes;
  en_riesgo := r.en_riesgo;
  inactivos := r.inactivos;

  return next;
end;
$$;

-- ===== Tendencia financiera (últimos N meses) =====
create function public.dashboard_tendencia_financiera(p_academia_id uuid, p_meses int default 6)
returns table (mes date, ingresos numeric, gastos numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_org_id();
  v_mes_actual date := date_trunc('month', current_date)::date;
  i int;
  v_desde date;
  v_hasta date;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede consultar el dashboard.';
  end if;

  for i in reverse (p_meses - 1)..0 loop
    v_desde := (v_mes_actual - (i || ' months')::interval)::date;
    v_hasta := (v_desde + interval '1 month' - interval '1 day')::date;
    mes := v_desde;

    select
      coalesce((
        select sum(pg.monto) from public.payments pg
        join public.students s on s.id = pg.alumno_id
        where pg.organization_id = v_org and pg.estado = 'pagado'
          and pg.fecha between v_desde and v_hasta
          and public.dashboard_coincide_sede(s.academia_id, p_academia_id)
      ), 0) + coalesce((
        select sum(g.pago + coalesce(g.pago_acompanante, 0)) from public.gigs g
        where g.organization_id = v_org and g.estado = 'pagado'
          and g.fecha between v_desde and v_hasta
          and public.dashboard_coincide_sede(g.academia_id, p_academia_id)
      ), 0)
    into ingresos;

    select coalesce(sum(e.monto), 0) into gastos
    from public.expenses e
    where e.organization_id = v_org and e.fecha between v_desde and v_hasta
      and public.dashboard_coincide_sede(e.academia_id, p_academia_id);

    return next;
  end loop;
end;
$$;

-- ===== Evolución de alumnos (headcount al final de cada mes) =====
create function public.dashboard_evolucion_alumnos(p_academia_id uuid, p_meses int default 6)
returns table (mes date, total int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_org_id();
  v_mes_actual date := date_trunc('month', current_date)::date;
  i int;
  v_hasta date;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede consultar el dashboard.';
  end if;

  for i in reverse (p_meses - 1)..0 loop
    mes := (v_mes_actual - (i || ' months')::interval)::date;
    v_hasta := (mes + interval '1 month' - interval '1 day')::date;

    select count(*) into total
    from public.students s
    where s.organization_id = v_org and s.created_at::date <= v_hasta
      and public.dashboard_coincide_sede(s.academia_id, p_academia_id);

    return next;
  end loop;
end;
$$;

-- ===== Rendimiento de clases del periodo =====
create function public.dashboard_rendimiento_clases(p_academia_id uuid, p_desde date, p_hasta date)
returns table (
  serie_id uuid,
  titulo text,
  clases_realizadas int,
  asistencias int,
  inscritos int,
  cupo_maximo int,
  ocupacion_pct numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_org_id();
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede consultar el dashboard.';
  end if;

  return query
  with asistencias_por_ocurrencia as (
    select clase_id, count(*) as n
    from public.attendance_records
    where organization_id = v_org and anulado = false and clase_id is not null
    group by clase_id
  )
  select
    cs.id,
    cs.titulo,
    count(co.id)::int,
    coalesce(sum(apo.n), 0)::int,
    coalesce(sum(cardinality(co.alumno_ids)), 0)::int,
    cs.cupo_maximo,
    case when cs.cupo_maximo is not null and count(co.id) > 0
      then round(least(100, 100.0 * avg(cardinality(co.alumno_ids)) / cs.cupo_maximo), 1)
      else null end
  from public.class_series cs
  join public.class_occurrences co on co.serie_id = cs.id
  left join asistencias_por_ocurrencia apo on apo.clase_id = co.id
  where cs.organization_id = v_org and co.estado = 'programada'
    and co.fecha between p_desde and p_hasta
    and public.dashboard_coincide_sede(cs.academia_id, p_academia_id)
  group by cs.id, cs.titulo, cs.cupo_maximo
  having count(co.id) > 0
  order by ocupacion_pct desc nulls last;
end;
$$;

-- ===== Finanzas de profesores del mes =====
-- El filtro de sede solo aplica a "generado" (viene de las ocurrencias,
-- que sí tienen sede); "pagado" viene de las liquidaciones mensuales,
-- que hoy no se registran por sede en ningún lado del sistema.
create function public.dashboard_finanzas_profesores(p_academia_id uuid, p_anio int, p_mes int)
returns table (
  profesor_id uuid,
  nombre text,
  clases int,
  tarifa_promedio numeric,
  generado numeric,
  pagado numeric,
  pendiente numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_org_id();
  v_desde date := make_date(p_anio, p_mes, 1);
  v_hasta date := (v_desde + interval '1 month' - interval '1 day')::date;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede consultar el dashboard.';
  end if;

  return query
  with generado_por_profesor as (
    select cot.profesor_id, count(*) as clases, sum(cot.valor_generado) as generado,
      avg(cot.valor_generado) as tarifa_promedio
    from public.class_occurrence_teachers cot
    join public.class_occurrences co on co.id = cot.occurrence_id
    where cot.organization_id = v_org and cot.genera_pago = true and cot.valor_generado is not null
      and co.fecha between v_desde and v_hasta
      and public.dashboard_coincide_sede(co.academia_id, p_academia_id)
    group by cot.profesor_id
  ),
  pagado_por_profesor as (
    select tli.teacher_id, sum(tli.amount) as pagado
    from public.teacher_liquidation_items tli
    join public.teacher_liquidations tl on tl.id = tli.liquidation_id
    where tl.organization_id = v_org and tli.voided_at is null and tl.estado = 'pagada'
      and tli.fecha_clase between v_desde and v_hasta
    group by tli.teacher_id
  )
  select
    t.id,
    t.nombre,
    coalesce(gp.clases, 0)::int,
    coalesce(gp.tarifa_promedio, 0),
    coalesce(gp.generado, 0),
    coalesce(pp.pagado, 0),
    greatest(0, coalesce(gp.generado, 0) - coalesce(pp.pagado, 0))
  from public.teachers t
  left join generado_por_profesor gp on gp.profesor_id = t.id
  left join pagado_por_profesor pp on pp.teacher_id = t.id
  where t.organization_id = v_org and t.activo = true
    and (gp.clases is not null or pp.pagado is not null)
  order by coalesce(gp.generado, 0) desc;
end;
$$;
