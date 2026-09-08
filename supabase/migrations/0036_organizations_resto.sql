-- Dance Manager: cierra el aislamiento por organización sobre lo que
-- faltaba — eventos, notificaciones y evaluaciones de alumnos.
-- (app_settings queda pendiente a propósito: hoy es una fila única
-- visible sin sesión porque el login la necesita antes de autenticar;
-- convertirla en "una fila por organización" solo tiene sentido junto
-- con el cambio de login que agrega el código de academia, así que se
-- resuelve en esa misma tanda, no aquí.)

-- ===== events =====
alter table public.events add column organization_id uuid references public.organizations (id);
update public.events set organization_id = (select id from public.organizations where codigo = 'principal');
alter table public.events alter column organization_id set not null;

create trigger asignar_organization_id_events
  before insert on public.events
  for each row execute function public.asignar_organization_id();

drop policy "events_select_authenticated" on public.events;
create policy "events_select_authenticated"
  on public.events for select
  to authenticated
  using (organization_id = public.current_org_id());

drop policy "events_write_admin_only" on public.events;
create policy "events_write_admin_only"
  on public.events for insert
  with check (public.is_admin() and organization_id = public.current_org_id());

drop policy "events_update_admin_only" on public.events;
create policy "events_update_admin_only"
  on public.events for update
  using (public.is_admin() and organization_id = public.current_org_id());

drop policy "events_delete_admin_only" on public.events;
create policy "events_delete_admin_only"
  on public.events for delete
  using (public.is_admin() and organization_id = public.current_org_id());

-- ===== student_evaluations =====
alter table public.student_evaluations add column organization_id uuid references public.organizations (id);

create trigger asignar_organization_id_student_evaluations
  before insert on public.student_evaluations
  for each row execute function public.asignar_organization_id();

update public.student_evaluations se
set organization_id = s.organization_id
from public.students s
where s.id = se.alumno_id;
alter table public.student_evaluations alter column organization_id set not null;

drop policy "student_evaluations_select_self_teacher_or_admin" on public.student_evaluations;
create policy "student_evaluations_select_self_teacher_or_admin"
  on public.student_evaluations for select
  using (
    (alumno_id = auth.uid() or public.current_user_role() in ('profesor', 'admin'))
    and organization_id = public.current_org_id()
  );

-- Con chequeo explícito de que el alumno pertenezca a la misma
-- organización de quien evalúa: is_admin()/current_user_role() no
-- verifican organización, así que sin esto un profesor/admin de otra
-- organización podría escribir una evaluación para un alumno ajeno.
drop policy "student_evaluations_write_teacher_or_admin" on public.student_evaluations;
create policy "student_evaluations_write_teacher_or_admin"
  on public.student_evaluations for insert
  with check (
    public.current_user_role() in ('profesor', 'admin')
    and organization_id = public.current_org_id()
    and exists (
      select 1 from public.students s
      where s.id = alumno_id and s.organization_id = public.current_org_id()
    )
  );

-- ===== notifications ===== (se escribe solo vía generar_alertas_renovacion)
alter table public.notifications add column organization_id uuid references public.organizations (id);
update public.notifications n
set organization_id = p.organization_id
from public.profiles p
where p.id = n.user_id;
alter table public.notifications alter column organization_id set not null;

drop policy "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid() and organization_id = public.current_org_id());

drop policy "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid() and organization_id = public.current_org_id())
  with check (user_id = auth.uid() and organization_id = public.current_org_id());

-- generar_alertas_renovacion corre por pg_cron sin sesión de usuario
-- (auth.uid() es null ahí), así que no puede depender de
-- current_org_id(): antes recorría TODOS los admins de TODAS las
-- organizaciones por cada alumno vencido de cualquier organización —
-- una fuga cruzada real. Ahora cada alumno vencido solo genera
-- notificaciones para los admins de SU MISMA organización.
create or replace function public.generar_alertas_renovacion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fila record;
  admin_id uuid;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Solo un administrador puede ejecutar esta acción.';
  end if;

  for fila in
    select s.id as alumno_id, s.nombre, s.contacto, s.organization_id, p.fecha_vencimiento
    from public.payments p
    join public.students s on s.id = p.alumno_id
    where p.estado = 'pagado'
      and p.fecha_vencimiento = current_date - interval '8 days'
      and not exists (
        select 1 from public.payments p2
        where p2.alumno_id = p.alumno_id
          and p2.estado = 'pagado'
          and (p2.fecha_vencimiento is null or p2.fecha_vencimiento >= current_date)
      )
  loop
    for admin_id in
      select id from public.profiles
      where rol = 'admin' and organization_id = fila.organization_id
    loop
      insert into public.notifications (user_id, mensaje, organization_id)
      values (
        admin_id,
        fila.nombre || ' no ha renovado su plan (venció el ' ||
          to_char(fila.fecha_vencimiento, 'DD/MM/YYYY') || ').',
        fila.organization_id
      );
    end loop;
  end loop;
end;
$$;
