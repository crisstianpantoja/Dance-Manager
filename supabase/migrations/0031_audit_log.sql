-- Dance Manager: bitácora de auditoría para operaciones críticas
-- (acuerdos económicos, asignación de profesores, liquidaciones).
-- Nadie escribe aquí desde el cliente, ni siquiera el admin: solo la
-- función registrar_auditoria (llamada desde dentro de las RPC ya
-- existentes) inserta filas.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  origin text not null default 'manual' check (origin in ('manual', 'api', 'ai')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity, entity_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

create policy "audit_log_select_admin_only"
  on public.audit_log for select
  using (public.is_admin());

create function public.registrar_auditoria(
  p_action text,
  p_entity text,
  p_entity_id uuid,
  p_before jsonb default null,
  p_after jsonb default null,
  p_origin text default 'manual',
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, before, after, origin, metadata)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_before, p_after, p_origin, p_metadata);
end;
$$;

-- ===== Se instrumentan las RPC financieras/de asignación que ya
-- existen, reemplazándolas con la misma firma exacta =====

create or replace function public.crear_acuerdo_profesor(
  p_teacher_id uuid,
  p_amount numeric,
  p_effective_from date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede definir el acuerdo económico de un profesor.';
  end if;

  update public.teacher_payment_agreements
  set effective_to = p_effective_from - 1
  where teacher_id = p_teacher_id
    and effective_to is null
    and effective_from < p_effective_from;

  insert into public.teacher_payment_agreements
    (teacher_id, amount_per_class, effective_from, notes, created_by)
  values (p_teacher_id, p_amount, p_effective_from, p_notes, auth.uid())
  returning id into v_id;

  perform public.registrar_auditoria(
    'crear_acuerdo', 'teacher_payment_agreements', v_id, null,
    jsonb_build_object('teacher_id', p_teacher_id, 'amount_per_class', p_amount, 'effective_from', p_effective_from)
  );

  return v_id;
end;
$$;

create or replace function public.guardar_profesores_serie(p_serie_id uuid, p_asignaciones jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes uuid[];
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede modificar los profesores de una clase.';
  end if;

  select profesor_ids into v_antes from public.class_series where id = p_serie_id;

  delete from public.class_series_teachers
  where serie_id = p_serie_id
    and profesor_id not in (
      select (elem ->> 'profesor_id')::uuid
      from jsonb_array_elements(p_asignaciones) elem
    );

  insert into public.class_series_teachers (serie_id, profesor_id, amount_override)
  select
    p_serie_id,
    (elem ->> 'profesor_id')::uuid,
    nullif(elem ->> 'amount_override', '')::numeric
  from jsonb_array_elements(p_asignaciones) elem
  on conflict (serie_id, profesor_id)
    do update set amount_override = excluded.amount_override;

  update public.class_series
  set profesor_ids = coalesce(
    (select array_agg(profesor_id) from public.class_series_teachers where serie_id = p_serie_id),
    '{}'::uuid[]
  )
  where id = p_serie_id;

  perform public.registrar_auditoria(
    'guardar_profesores_serie', 'class_series', p_serie_id,
    jsonb_build_object('profesor_ids', v_antes), jsonb_build_object('asignaciones', p_asignaciones)
  );
end;
$$;

create or replace function public.actualizar_asignaciones_futuras(
  p_serie_id uuid, p_desde date, p_asignaciones jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occ record;
  v_bloqueada boolean;
  v_count int := 0;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  for v_occ in
    select id, fecha from public.class_occurrences
    where serie_id = p_serie_id and fecha >= p_desde and estado = 'programada'
    order by fecha
    for update
  loop
    select exists (
      select 1 from public.class_occurrence_teachers cot
      where cot.occurrence_id = v_occ.id
        and (cot.estado_asistencia = 'presente'
             or cot.valor_generado is not null
             or cot.valor_congelado_en is not null)
    ) into v_bloqueada;

    if not v_bloqueada then
      select exists (
        select 1 from public.class_occurrence_teachers cot
        join public.teacher_liquidation_items tli
          on tli.occurrence_teacher_id = cot.id and tli.voided_at is null
        where cot.occurrence_id = v_occ.id
      ) into v_bloqueada;
    end if;

    continue when v_bloqueada;

    perform 1 from public.class_occurrence_teachers where occurrence_id = v_occ.id for update;
    delete from public.class_occurrence_teachers where occurrence_id = v_occ.id;

    insert into public.class_occurrence_teachers (occurrence_id, profesor_id, valor_previsto)
    select
      v_occ.id,
      (e ->> 'profesor_id')::uuid,
      coalesce(
        nullif(e ->> 'amount_override', '')::numeric,
        (
          select amount_per_class from public.teacher_payment_agreements
          where teacher_id = (e ->> 'profesor_id')::uuid
            and effective_from <= v_occ.fecha
            and (effective_to is null or effective_to >= v_occ.fecha)
          order by effective_from desc limit 1
        )
      )
    from jsonb_array_elements(p_asignaciones) e;

    v_count := v_count + 1;
  end loop;

  perform public.registrar_auditoria(
    'actualizar_asignaciones_futuras', 'class_series', p_serie_id,
    jsonb_build_object('desde', p_desde),
    jsonb_build_object('asignaciones', p_asignaciones, 'ocurrencias_afectadas', v_count)
  );

  return v_count;
end;
$$;

create or replace function public.crear_liquidacion_mensual(p_teacher_id uuid, p_year int, p_month int)
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

  perform public.registrar_auditoria(
    'crear_liquidacion', 'teacher_liquidations', v_liq, null,
    jsonb_build_object('teacher_id', p_teacher_id, 'year', p_year, 'month', p_month, 'total', v_total, 'items', v_items)
  );

  return v_liq;
end;
$$;

create or replace function public.aprobar_liquidacion(p_liquidacion_id uuid)
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

  perform public.registrar_auditoria(
    'aprobar_liquidacion', 'teacher_liquidations', p_liquidacion_id,
    jsonb_build_object('estado', v_estado), jsonb_build_object('estado', 'aprobada')
  );
end;
$$;

create or replace function public.marcar_liquidacion_pagada(
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

  perform public.registrar_auditoria(
    'marcar_liquidacion_pagada', 'teacher_liquidations', p_liquidacion_id,
    jsonb_build_object('estado', v_estado),
    jsonb_build_object('estado', 'pagada', 'fecha_pago', p_fecha_pago, 'metodo_pago', p_metodo_pago)
  );
end;
$$;

create or replace function public.anular_liquidacion(p_liquidacion_id uuid)
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

  perform public.registrar_auditoria(
    'anular_liquidacion', 'teacher_liquidations', p_liquidacion_id,
    jsonb_build_object('estado', v_estado), jsonb_build_object('estado', 'anulada')
  );
end;
$$;
