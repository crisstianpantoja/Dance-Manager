-- Dance Manager: extiende el aislamiento por organización a clases
-- recurrentes, ocurrencias, asignación de profesores a ocurrencias y
-- asistencia de alumnos.

-- ===== class_series =====
alter table public.class_series add column organization_id uuid references public.organizations (id);
update public.class_series set organization_id = (select id from public.organizations where codigo = 'principal');
alter table public.class_series alter column organization_id set not null;

create trigger asignar_organization_id_class_series
  before insert on public.class_series
  for each row execute function public.asignar_organization_id();

drop policy "class_series_select_authenticated" on public.class_series;
create policy "class_series_select_authenticated"
  on public.class_series for select
  to authenticated
  using (organization_id = public.current_org_id());

drop policy "class_series_write_admin_only" on public.class_series;
create policy "class_series_write_admin_only"
  on public.class_series for insert
  with check (public.is_admin() and organization_id = public.current_org_id());

drop policy "class_series_update_admin_only" on public.class_series;
create policy "class_series_update_admin_only"
  on public.class_series for update
  using (public.is_admin() and organization_id = public.current_org_id());

drop policy "class_series_delete_admin_only" on public.class_series;
create policy "class_series_delete_admin_only"
  on public.class_series for delete
  using (public.is_admin() and organization_id = public.current_org_id());

-- ===== class_series_teachers ===== (se escribe solo vía guardar_profesores_serie)
alter table public.class_series_teachers add column organization_id uuid references public.organizations (id);
update public.class_series_teachers cst
set organization_id = cs.organization_id
from public.class_series cs
where cs.id = cst.serie_id;
alter table public.class_series_teachers alter column organization_id set not null;

drop policy "class_series_teachers_select_propio_o_admin" on public.class_series_teachers;
create policy "class_series_teachers_select_propio_o_admin"
  on public.class_series_teachers for select
  using (
    (profesor_id = auth.uid() or public.is_admin())
    and organization_id = public.current_org_id()
  );

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

-- ===== class_occurrences =====
alter table public.class_occurrences add column organization_id uuid references public.organizations (id);
update public.class_occurrences co
set organization_id = cs.organization_id
from public.class_series cs
where cs.id = co.serie_id;
alter table public.class_occurrences alter column organization_id set not null;

create trigger asignar_organization_id_class_occurrences
  before insert on public.class_occurrences
  for each row execute function public.asignar_organization_id();

drop policy "class_occurrences_select_authenticated" on public.class_occurrences;
create policy "class_occurrences_select_authenticated"
  on public.class_occurrences for select
  to authenticated
  using (organization_id = public.current_org_id());

drop policy "class_occurrences_write_admin_only" on public.class_occurrences;
create policy "class_occurrences_write_admin_only"
  on public.class_occurrences for insert
  with check (public.is_admin() and organization_id = public.current_org_id());

drop policy "class_occurrences_update_admin_only" on public.class_occurrences;
create policy "class_occurrences_update_admin_only"
  on public.class_occurrences for update
  using (public.is_admin() and organization_id = public.current_org_id());

drop policy "class_occurrences_delete_admin_only" on public.class_occurrences;
create policy "class_occurrences_delete_admin_only"
  on public.class_occurrences for delete
  using (public.is_admin() and organization_id = public.current_org_id());

-- ===== class_occurrence_teachers =====
alter table public.class_occurrence_teachers add column organization_id uuid references public.organizations (id);
update public.class_occurrence_teachers cot
set organization_id = co.organization_id
from public.class_occurrences co
where co.id = cot.occurrence_id;
alter table public.class_occurrence_teachers alter column organization_id set not null;

-- Para las inserciones manuales del admin (reasignar un suplente antes
-- de confirmar). El trigger copiar_profesores_a_ocurrencia (más abajo)
-- ya manda organization_id explícito, así que este trigger genérico no
-- le pisa nada (solo actúa si viene null).
create trigger asignar_organization_id_class_occurrence_teachers
  before insert on public.class_occurrence_teachers
  for each row execute function public.asignar_organization_id();

drop policy "class_occurrence_teachers_select_propio_o_admin" on public.class_occurrence_teachers;
create policy "class_occurrence_teachers_select_propio_o_admin"
  on public.class_occurrence_teachers for select
  using (
    (profesor_id = auth.uid() or public.is_admin())
    and organization_id = public.current_org_id()
  );

drop policy "class_occurrence_teachers_insert_admin_sin_congelar" on public.class_occurrence_teachers;
create policy "class_occurrence_teachers_insert_admin_sin_congelar"
  on public.class_occurrence_teachers for insert
  with check (
    public.is_admin()
    and organization_id = public.current_org_id()
    and valor_generado is null
    and genera_pago is null
    and valor_congelado_en is null
  );

drop policy "class_occurrence_teachers_delete_admin_sin_congelar" on public.class_occurrence_teachers;
create policy "class_occurrence_teachers_delete_admin_sin_congelar"
  on public.class_occurrence_teachers for delete
  using (public.is_admin() and organization_id = public.current_org_id() and valor_congelado_en is null);

create or replace function public.copiar_profesores_a_ocurrencia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.class_occurrence_teachers (occurrence_id, profesor_id, valor_previsto, organization_id)
  select
    new.id,
    cst.profesor_id,
    coalesce(
      cst.amount_override,
      (
        select tpa.amount_per_class
        from public.teacher_payment_agreements tpa
        where tpa.teacher_id = cst.profesor_id
          and tpa.effective_from <= new.fecha
          and (tpa.effective_to is null or tpa.effective_to >= new.fecha)
        order by tpa.effective_from desc
        limit 1
      )
    ),
    new.organization_id
  from public.class_series_teachers cst
  where cst.serie_id = new.serie_id
  on conflict (occurrence_id, profesor_id) do nothing;

  return new;
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

-- ===== attendance_records ===== (se escribe solo desde la Edge Function attendance, service_role)
alter table public.attendance_records add column organization_id uuid references public.organizations (id);
update public.attendance_records ar
set organization_id = s.organization_id
from public.students s
where s.id = ar.alumno_id;
alter table public.attendance_records alter column organization_id set not null;

drop policy "attendance_select_self_teacher_or_admin" on public.attendance_records;
create policy "attendance_select_self_teacher_or_admin"
  on public.attendance_records for select
  using (
    (alumno_id = auth.uid() or public.current_user_role() in ('profesor', 'admin'))
    and organization_id = public.current_org_id()
  );

-- NOTA: la Edge Function "attendance" corre con service_role (sin
-- sesión real), así que debe mandar organization_id explícito al
-- insertar y filtrar por él al leer students/payments — se actualiza
-- por separado, igual que admin-students/admin-teachers.
