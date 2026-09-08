-- Dance Manager: extiende el aislamiento por organización a las tablas
-- de dinero (planes, pagos, acuerdos económicos de profesores,
-- liquidaciones y gastos/contratos), y cierra un hueco que quedaba
-- abierto desde que existen organizaciones: varias RPC financieras son
-- SECURITY DEFINER y reciben un id (profesor, ocurrencia, liquidación,
-- serie) sin verificar que ese id pertenezca a la organización de
-- quien llama. is_admin() solo confirma el rol, no la organización, así
-- que sin este refuerzo un admin de una organización podría, conociendo
-- o adivinando un id de otra, leer o modificar datos financieros ajenos
-- (RLS no protege aquí porque estas funciones corren con permisos de
-- superusuario de la función). Se agrega una verificación explícita de
-- organización al inicio de cada una de esas RPC, igual que ya se hace
-- con is_admin().

-- ===================================================================
-- PARTE A: organization_id en las tablas de dinero
-- ===================================================================

-- ===== plans =====
alter table public.plans add column organization_id uuid references public.organizations (id);
update public.plans set organization_id = (select id from public.organizations where codigo = 'principal');
alter table public.plans alter column organization_id set not null;

create trigger asignar_organization_id_plans
  before insert on public.plans
  for each row execute function public.asignar_organization_id();

drop policy "plans_select_authenticated" on public.plans;
create policy "plans_select_authenticated"
  on public.plans for select
  to authenticated
  using (organization_id = public.current_org_id());

drop policy "plans_write_admin_only" on public.plans;
create policy "plans_write_admin_only"
  on public.plans for insert
  with check (public.is_admin() and organization_id = public.current_org_id());

drop policy "plans_update_admin_only" on public.plans;
create policy "plans_update_admin_only"
  on public.plans for update
  using (public.is_admin() and organization_id = public.current_org_id());

drop policy "plans_delete_admin_only" on public.plans;
create policy "plans_delete_admin_only"
  on public.plans for delete
  using (public.is_admin() and organization_id = public.current_org_id());

-- ===== payments ===== (insert también desde report-payment, service_role: se actualiza aparte)
alter table public.payments add column organization_id uuid references public.organizations (id);
update public.payments p
set organization_id = s.organization_id
from public.students s
where s.id = p.alumno_id;
alter table public.payments alter column organization_id set not null;

create trigger asignar_organization_id_payments
  before insert on public.payments
  for each row execute function public.asignar_organization_id();

drop policy "payments_select_self_teacher_or_admin" on public.payments;
create policy "payments_select_self_teacher_or_admin"
  on public.payments for select
  using (
    (alumno_id = auth.uid() or public.current_user_role() in ('profesor', 'admin'))
    and organization_id = public.current_org_id()
  );

drop policy "payments_write_admin_only" on public.payments;
create policy "payments_write_admin_only"
  on public.payments for insert
  with check (public.is_admin() and organization_id = public.current_org_id());

drop policy "payments_update_admin_only" on public.payments;
create policy "payments_update_admin_only"
  on public.payments for update
  using (public.is_admin() and organization_id = public.current_org_id());

drop policy "payments_delete_admin_only" on public.payments;
create policy "payments_delete_admin_only"
  on public.payments for delete
  using (public.is_admin() and organization_id = public.current_org_id());

-- ===== teacher_payment_agreements ===== (se escribe solo vía crear_acuerdo_profesor)
alter table public.teacher_payment_agreements add column organization_id uuid references public.organizations (id);
update public.teacher_payment_agreements tpa
set organization_id = t.organization_id
from public.teachers t
where t.id = tpa.teacher_id;
alter table public.teacher_payment_agreements alter column organization_id set not null;

create trigger asignar_organization_id_teacher_payment_agreements
  before insert on public.teacher_payment_agreements
  for each row execute function public.asignar_organization_id();

drop policy "teacher_payment_agreements_admin_only" on public.teacher_payment_agreements;
create policy "teacher_payment_agreements_admin_only"
  on public.teacher_payment_agreements for all
  using (public.is_admin() and organization_id = public.current_org_id())
  with check (public.is_admin() and organization_id = public.current_org_id());

-- ===== teacher_liquidations ===== (se escribe solo vía las RPC de la 0028/0031)
alter table public.teacher_liquidations add column organization_id uuid references public.organizations (id);
update public.teacher_liquidations tl
set organization_id = t.organization_id
from public.teachers t
where t.id = tl.teacher_id;
alter table public.teacher_liquidations alter column organization_id set not null;

create trigger asignar_organization_id_teacher_liquidations
  before insert on public.teacher_liquidations
  for each row execute function public.asignar_organization_id();

drop policy "teacher_liquidations_select_propio_o_admin" on public.teacher_liquidations;
create policy "teacher_liquidations_select_propio_o_admin"
  on public.teacher_liquidations for select
  using (
    (teacher_id = auth.uid() or public.is_admin())
    and organization_id = public.current_org_id()
  );

-- ===== teacher_liquidation_items ===== (se escribe solo vía crear_liquidacion_mensual)
alter table public.teacher_liquidation_items add column organization_id uuid references public.organizations (id);
update public.teacher_liquidation_items tli
set organization_id = tl.organization_id
from public.teacher_liquidations tl
where tl.id = tli.liquidation_id;
alter table public.teacher_liquidation_items alter column organization_id set not null;

create trigger asignar_organization_id_teacher_liquidation_items
  before insert on public.teacher_liquidation_items
  for each row execute function public.asignar_organization_id();

drop policy "teacher_liquidation_items_select_propio_o_admin" on public.teacher_liquidation_items;
create policy "teacher_liquidation_items_select_propio_o_admin"
  on public.teacher_liquidation_items for select
  using (
    (teacher_id = auth.uid() or public.is_admin())
    and organization_id = public.current_org_id()
  );

-- ===== expenses / gigs ===== (ya tenían academia_id opcional desde la 0030)
alter table public.expenses add column organization_id uuid references public.organizations (id);
update public.expenses e
set organization_id = coalesce(
  (select a.organization_id from public.academies a where a.id = e.academia_id),
  (select id from public.organizations where codigo = 'principal')
);
alter table public.expenses alter column organization_id set not null;

create trigger asignar_organization_id_expenses
  before insert on public.expenses
  for each row execute function public.asignar_organization_id();

drop policy "expenses_admin_only" on public.expenses;
create policy "expenses_admin_only"
  on public.expenses for all
  using (public.is_admin() and organization_id = public.current_org_id())
  with check (public.is_admin() and organization_id = public.current_org_id());

alter table public.gigs add column organization_id uuid references public.organizations (id);
update public.gigs g
set organization_id = coalesce(
  (select a.organization_id from public.academies a where a.id = g.academia_id),
  (select id from public.organizations where codigo = 'principal')
);
alter table public.gigs alter column organization_id set not null;

create trigger asignar_organization_id_gigs
  before insert on public.gigs
  for each row execute function public.asignar_organization_id();

drop policy "gigs_admin_only" on public.gigs;
create policy "gigs_admin_only"
  on public.gigs for all
  using (public.is_admin() and organization_id = public.current_org_id())
  with check (public.is_admin() and organization_id = public.current_org_id());

-- ===================================================================
-- PARTE B: refuerzo de organización en las RPC financieras SECURITY
-- DEFINER (defensa en profundidad, más allá de RLS)
-- ===================================================================

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

  if not exists (
    select 1 from public.teachers where id = p_teacher_id and organization_id = public.current_org_id()
  ) then
    raise exception 'No autorizado.';
  end if;

  update public.teacher_payment_agreements
  set effective_to = p_effective_from - 1
  where teacher_id = p_teacher_id
    and effective_to is null
    and effective_from < p_effective_from;

  insert into public.teacher_payment_agreements
    (teacher_id, amount_per_class, effective_from, notes, created_by, organization_id)
  values (p_teacher_id, p_amount, p_effective_from, p_notes, auth.uid(), public.current_org_id())
  returning id into v_id;

  perform public.registrar_auditoria(
    'crear_acuerdo', 'teacher_payment_agreements', v_id, null,
    jsonb_build_object('teacher_id', p_teacher_id, 'amount_per_class', p_amount, 'effective_from', p_effective_from)
  );

  return v_id;
end;
$$;

create or replace function public.identificar_profesor_por_qr(p_token uuid)
returns table (profesor_id uuid, nombre text, foto text, activo boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  return query
  select t.id, t.nombre, t.foto, t.activo
  from public.teacher_qr_tokens qt
  join public.teachers t on t.id = qt.teacher_id
  where qt.qr_token = p_token
    and t.organization_id = public.current_org_id();
end;
$$;

create or replace function public.regenerar_qr_token(p_teacher_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  if not exists (
    select 1 from public.teachers where id = p_teacher_id and organization_id = public.current_org_id()
  ) then
    raise exception 'No autorizado.';
  end if;

  update public.teacher_qr_tokens
  set qr_token = gen_random_uuid(), regenerated_at = now()
  where teacher_id = p_teacher_id
  returning qr_token into v_token;

  if v_token is null then
    raise exception 'Este profesor no tiene token QR.';
  end if;

  return v_token;
end;
$$;

create or replace function public.registrar_asistencia_profesor(
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
  from public.class_occurrences
  where id = p_occurrence_id and organization_id = public.current_org_id()
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

create or replace function public.confirmar_asistencia_manual(
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

  select estado into v_estado_occ
  from public.class_occurrences
  where id = p_occurrence_id and organization_id = public.current_org_id()
  for update;

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

create or replace function public.marcar_ausente_profesor(
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
    and organization_id = public.current_org_id()
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

create or replace function public.confirmar_pago_cancelada_excepcional(
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

  select estado into v_estado_occ
  from public.class_occurrences
  where id = p_occurrence_id and organization_id = public.current_org_id()
  for update;

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

create or replace function public.revertir_asistencia_profesor(p_occurrence_id uuid, p_profesor_id uuid)
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
    and organization_id = public.current_org_id()
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
      and co.organization_id = public.current_org_id()
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
  v_org_id uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  select organization_id into v_org_id
  from public.teachers where id = p_teacher_id and organization_id = public.current_org_id();

  if v_org_id is null then
    raise exception 'No autorizado.';
  end if;

  v_fin := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date;

  insert into public.teacher_liquidations (teacher_id, year, month, estado, organization_id)
    values (p_teacher_id, p_year, p_month, 'pendiente', v_org_id)
    returning id into v_liq;

  insert into public.teacher_liquidation_items
    (liquidation_id, occurrence_teacher_id, teacher_id, amount, fecha_clase, organization_id)
  select v_liq, cot.id, p_teacher_id, cot.valor_generado, co.fecha, cot.organization_id
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
  v_org_id uuid;
begin
  if not public.is_admin() then raise exception 'No autorizado.'; end if;

  select estado, organization_id into v_estado, v_org_id
  from public.teacher_liquidations where id = p_liquidacion_id for update;

  if v_estado is null or v_org_id <> public.current_org_id() then
    raise exception 'La liquidación no existe.';
  end if;
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
  v_org_id uuid;
begin
  if not public.is_admin() then raise exception 'No autorizado.'; end if;

  select estado, organization_id into v_estado, v_org_id
  from public.teacher_liquidations where id = p_liquidacion_id for update;

  if v_estado is null or v_org_id <> public.current_org_id() then
    raise exception 'La liquidación no existe.';
  end if;
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
  v_org_id uuid;
begin
  if not public.is_admin() then raise exception 'No autorizado.'; end if;

  select estado, organization_id into v_estado, v_org_id
  from public.teacher_liquidations where id = p_liquidacion_id for update;

  if v_estado is null or v_org_id <> public.current_org_id() then
    raise exception 'La liquidación no existe.';
  end if;
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

create or replace function public.resumen_financiero_profesor(p_profesor_id uuid, p_year int, p_month int)
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

  if not exists (
    select 1 from public.teachers where id = p_profesor_id and organization_id = public.current_org_id()
  ) then
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

create or replace function public.detalle_financiero_profesor(p_profesor_id uuid, p_year int, p_month int)
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

  if not exists (
    select 1 from public.teachers where id = p_profesor_id and organization_id = public.current_org_id()
  ) then
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

create or replace function public.guardar_profesores_serie(p_serie_id uuid, p_asignaciones jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes uuid[];
  v_org_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede modificar los profesores de una clase.';
  end if;

  select profesor_ids, organization_id into v_antes, v_org_id
  from public.class_series where id = p_serie_id;

  if v_org_id is null or v_org_id <> public.current_org_id() then
    raise exception 'No autorizado.';
  end if;

  delete from public.class_series_teachers
  where serie_id = p_serie_id
    and profesor_id not in (
      select (elem ->> 'profesor_id')::uuid
      from jsonb_array_elements(p_asignaciones) elem
    );

  insert into public.class_series_teachers (serie_id, profesor_id, amount_override, organization_id)
  select
    p_serie_id,
    (elem ->> 'profesor_id')::uuid,
    nullif(elem ->> 'amount_override', '')::numeric,
    v_org_id
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

  if not exists (
    select 1 from public.class_series where id = p_serie_id and organization_id = public.current_org_id()
  ) then
    raise exception 'No autorizado.';
  end if;

  for v_occ in
    select id, fecha, organization_id from public.class_occurrences
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

    insert into public.class_occurrence_teachers (occurrence_id, profesor_id, valor_previsto, organization_id)
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
      ),
      v_occ.organization_id
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

-- NOTA: report-payment (Edge Function, corre con service_role) inserta
-- en "payments" sin una sesión de usuario real, así que se actualiza
-- aparte para mandar organization_id explícito, tomándolo del perfil
-- del alumno que llama, igual que admin-students/admin-teachers.
