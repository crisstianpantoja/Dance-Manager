-- Dance Manager: agregaciones para el nuevo Dashboard del admin (Fase 1).
-- Dos funciones SECURITY DEFINER, solo para admin, escopadas siempre por
-- la organización de quien llama (current_org_id()) y opcionalmente por
-- una sede (p_academia_id). Calculan en SQL en vez de traer filas al
-- navegador para sumarlas, siguiendo el mismo patrón que ya usa
-- resumen_financiero_profesor.

-- p_academia_id acepta 3 estados, igual que el selector de sede que ya
-- existe en el Dashboard: null = todas las sedes, el uuid nulo
-- 00000000-0000-0000-0000-000000000000 = "Sin sede" (academia_id es
-- null en la fila), o un uuid real = esa sede específica.
create function public.dashboard_coincide_sede(p_fila uuid, p_filtro uuid)
returns boolean
language sql
immutable
as $$
  select p_filtro is null
    or p_fila is not distinct from nullif(p_filtro, '00000000-0000-0000-0000-000000000000'::uuid);
$$;

create function public.dashboard_kpis(p_academia_id uuid, p_desde date, p_hasta date)
returns table (
  ingresos numeric,
  ingresos_prev numeric,
  gastos numeric,
  gastos_prev numeric,
  alumnos_totales int,
  alumnos_nuevos int,
  pagos_pendientes_monto numeric,
  pagos_pendientes_alumnos int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_org_id();
  v_dias int := p_hasta - p_desde;
  v_desde_prev date := p_desde - (v_dias + 1);
  v_hasta_prev date := p_desde - 1;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede consultar el dashboard.';
  end if;

  select
    coalesce((
      select sum(pg.monto) from public.payments pg
      join public.students s on s.id = pg.alumno_id
      where pg.organization_id = v_org and pg.estado = 'pagado'
        and pg.fecha between p_desde and p_hasta
        and public.dashboard_coincide_sede(s.academia_id, p_academia_id)
    ), 0) + coalesce((
      select sum(g.pago + coalesce(g.pago_acompanante, 0)) from public.gigs g
      where g.organization_id = v_org and g.estado = 'pagado'
        and g.fecha between p_desde and p_hasta
        and public.dashboard_coincide_sede(g.academia_id, p_academia_id)
    ), 0)
  into ingresos;

  select
    coalesce((
      select sum(pg.monto) from public.payments pg
      join public.students s on s.id = pg.alumno_id
      where pg.organization_id = v_org and pg.estado = 'pagado'
        and pg.fecha between v_desde_prev and v_hasta_prev
        and public.dashboard_coincide_sede(s.academia_id, p_academia_id)
    ), 0) + coalesce((
      select sum(g.pago + coalesce(g.pago_acompanante, 0)) from public.gigs g
      where g.organization_id = v_org and g.estado = 'pagado'
        and g.fecha between v_desde_prev and v_hasta_prev
        and public.dashboard_coincide_sede(g.academia_id, p_academia_id)
    ), 0)
  into ingresos_prev;

  select coalesce(sum(e.monto), 0) into gastos
  from public.expenses e
  where e.organization_id = v_org and e.fecha between p_desde and p_hasta
    and public.dashboard_coincide_sede(e.academia_id, p_academia_id);

  select coalesce(sum(e.monto), 0) into gastos_prev
  from public.expenses e
  where e.organization_id = v_org and e.fecha between v_desde_prev and v_hasta_prev
    and public.dashboard_coincide_sede(e.academia_id, p_academia_id);

  select count(*) into alumnos_totales
  from public.students s
  where s.organization_id = v_org and s.created_at::date <= p_hasta
    and public.dashboard_coincide_sede(s.academia_id, p_academia_id);

  select count(*) into alumnos_nuevos
  from public.students s
  where s.organization_id = v_org and s.created_at::date between p_desde and p_hasta
    and public.dashboard_coincide_sede(s.academia_id, p_academia_id);

  select coalesce(sum(pg.monto), 0), count(distinct pg.alumno_id)
    into pagos_pendientes_monto, pagos_pendientes_alumnos
  from public.payments pg
  join public.students s on s.id = pg.alumno_id
  where pg.organization_id = v_org and pg.estado = 'pendiente'
    and public.dashboard_coincide_sede(s.academia_id, p_academia_id);

  return next;
end;
$$;

-- Alertas: cada fila es una situación real detectada. El frontend arma
-- el texto/color/ruta según "tipo" — esta función solo entrega números.
create function public.dashboard_alertas(p_academia_id uuid)
returns table (
  tipo text,
  conteo int,
  monto numeric,
  nombre text,
  fecha date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_org_id();
  v_hoy date := current_date;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede consultar el dashboard.';
  end if;

  -- Comprobantes de pago pendientes de verificar.
  return query
  select 'pagos_pendientes'::text, count(*)::int, coalesce(sum(pg.monto), 0), null::text, null::date
  from public.payments pg
  join public.students s on s.id = pg.alumno_id
  where pg.organization_id = v_org and pg.estado = 'pendiente'
    and public.dashboard_coincide_sede(s.academia_id, p_academia_id)
  having count(*) > 0;

  -- Alumnos con plan vencido que todavía no renovaron (misma regla que
  -- src/lib/retention.ts::calcularAlumnosSinRenovar, sin poder importar
  -- ese código desde SQL).
  return query
  select 'sin_renovar'::text, count(*)::int, null::numeric, null::text, null::date
  from (
    select pg.alumno_id
    from public.payments pg
    join public.students s on s.id = pg.alumno_id
    where pg.organization_id = v_org and pg.estado = 'pagado'
      and public.dashboard_coincide_sede(s.academia_id, p_academia_id)
    group by pg.alumno_id
    having bool_or(pg.fecha_vencimiento is null or pg.fecha_vencimiento >= v_hoy) = false
       and bool_or(pg.fecha_vencimiento is not null and pg.fecha_vencimiento < v_hoy) = true
  ) x
  having count(*) > 0;

  -- Planes vigentes que vencen dentro de los próximos 7 días.
  return query
  select 'planes_por_vencer'::text, count(distinct pg.alumno_id)::int, null::numeric, null::text, null::date
  from public.payments pg
  join public.students s on s.id = pg.alumno_id
  where pg.organization_id = v_org and pg.estado = 'pagado'
    and pg.fecha_vencimiento between v_hoy and v_hoy + 7
    and public.dashboard_coincide_sede(s.academia_id, p_academia_id)
  having count(*) > 0;

  -- Alumnos sin ninguna asistencia registrada en los últimos 14 días
  -- (y que sí han asistido antes, para no contar a quien nunca ha ido).
  return query
  select 'alumnos_inactivos'::text, count(*)::int, null::numeric, null::text, null::date
  from (
    select ar.alumno_id, max(ar.fecha) as ultima
    from public.attendance_records ar
    join public.students s on s.id = ar.alumno_id
    where ar.organization_id = v_org and ar.anulado = false
      and public.dashboard_coincide_sede(s.academia_id, p_academia_id)
    group by ar.alumno_id
    having max(ar.fecha) < v_hoy - 14
  ) x
  having count(*) > 0;

  -- Profesores con pago generado y pendiente por pagar este mes.
  return query
  select 'profesor_pendiente'::text, count(*)::int, sum(x.pendiente)::numeric, null::text, null::date
  from (
    select cot.profesor_id, sum(cot.valor_generado) as pendiente
    from public.class_occurrence_teachers cot
    join public.class_occurrences co on co.id = cot.occurrence_id
    where cot.organization_id = v_org
      and cot.genera_pago = true and cot.valor_generado is not null
      and co.fecha >= date_trunc('month', v_hoy)::date
      and public.dashboard_coincide_sede(co.academia_id, p_academia_id)
      and not exists (
        select 1 from public.teacher_liquidation_items tli
        join public.teacher_liquidations tl on tl.id = tli.liquidation_id
        where tli.occurrence_teacher_id = cot.id and tli.voided_at is null and tl.estado = 'pagada'
      )
    group by cot.profesor_id
    having sum(cot.valor_generado) > 0
  ) x
  having count(*) > 0;

  -- Contratos confirmados cuya fecha ya pasó y siguen sin marcarse pagados.
  return query
  select 'contratos_sin_pagar'::text, count(*)::int, coalesce(sum(g.pago + coalesce(g.pago_acompanante, 0)), 0), null::text, null::date
  from public.gigs g
  where g.organization_id = v_org and g.estado = 'confirmado' and g.fecha < v_hoy
    and public.dashboard_coincide_sede(g.academia_id, p_academia_id)
  having count(*) > 0;
end;
$$;
