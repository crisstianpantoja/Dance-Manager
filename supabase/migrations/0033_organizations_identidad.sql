-- Dance Manager: extiende el aislamiento por organización a sedes,
-- alumnos, profesores y sus tablas relacionadas.
--
-- Trigger genérico: si el cliente no manda organization_id al insertar
-- (caso normal: casi ningún formulario lo pasa hoy), se rellena solo
-- con la organización del usuario autenticado. Así ningún formulario
-- existente necesita cambiar. Las Edge Functions que corren con
-- service_role (admin-students, admin-teachers) SÍ deben mandarlo
-- explícito, porque ahí no hay un auth.uid() de sesión — ver el
-- comentario al final de esta migración.
create function public.asignar_organization_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    new.organization_id := public.current_org_id();
  end if;
  return new;
end;
$$;

-- ===== academies =====
alter table public.academies add column organization_id uuid references public.organizations (id);
update public.academies set organization_id = (select id from public.organizations where codigo = 'principal');
alter table public.academies alter column organization_id set not null;

create trigger asignar_organization_id_academies
  before insert on public.academies
  for each row execute function public.asignar_organization_id();

drop policy "academies_select_authenticated" on public.academies;
create policy "academies_select_authenticated"
  on public.academies for select
  to authenticated
  using (organization_id = public.current_org_id());

drop policy "academies_write_admin_only" on public.academies;
create policy "academies_write_admin_only"
  on public.academies for insert
  with check (public.is_admin() and organization_id = public.current_org_id());

drop policy "academies_update_admin_only" on public.academies;
create policy "academies_update_admin_only"
  on public.academies for update
  using (public.is_admin() and organization_id = public.current_org_id());

drop policy "academies_delete_admin_only" on public.academies;
create policy "academies_delete_admin_only"
  on public.academies for delete
  using (public.is_admin() and organization_id = public.current_org_id());

-- ===== students =====
alter table public.students add column organization_id uuid references public.organizations (id);
update public.students set organization_id = (select id from public.organizations where codigo = 'principal');
alter table public.students alter column organization_id set not null;

create trigger asignar_organization_id_students
  before insert on public.students
  for each row execute function public.asignar_organization_id();

drop policy "students_select_self_teacher_or_admin" on public.students;
create policy "students_select_self_teacher_or_admin"
  on public.students for select
  using (
    (id = auth.uid() or public.current_user_role() in ('profesor', 'admin'))
    and organization_id = public.current_org_id()
  );

drop policy "students_write_admin_only" on public.students;
create policy "students_write_admin_only"
  on public.students for insert
  with check (public.is_admin() and organization_id = public.current_org_id());

drop policy "students_update_admin_only" on public.students;
create policy "students_update_admin_only"
  on public.students for update
  using (public.is_admin() and organization_id = public.current_org_id());

drop policy "students_delete_admin_only" on public.students;
create policy "students_delete_admin_only"
  on public.students for delete
  using (public.is_admin() and organization_id = public.current_org_id());

drop policy "students_update_self" on public.students;
create policy "students_update_self"
  on public.students for update
  using (id = auth.uid() and organization_id = public.current_org_id())
  with check (id = auth.uid() and organization_id = public.current_org_id());

-- ===== teachers =====
alter table public.teachers add column organization_id uuid references public.organizations (id);
update public.teachers set organization_id = (select id from public.organizations where codigo = 'principal');
alter table public.teachers alter column organization_id set not null;

create trigger asignar_organization_id_teachers
  before insert on public.teachers
  for each row execute function public.asignar_organization_id();

drop policy "teachers_select_authenticated" on public.teachers;
create policy "teachers_select_authenticated"
  on public.teachers for select
  to authenticated
  using (organization_id = public.current_org_id());

drop policy "teachers_write_admin_only" on public.teachers;
create policy "teachers_write_admin_only"
  on public.teachers for insert
  with check (public.is_admin() and organization_id = public.current_org_id());

drop policy "teachers_update_admin_only" on public.teachers;
create policy "teachers_update_admin_only"
  on public.teachers for update
  using (public.is_admin() and organization_id = public.current_org_id());

drop policy "teachers_delete_admin_only" on public.teachers;
create policy "teachers_delete_admin_only"
  on public.teachers for delete
  using (public.is_admin() and organization_id = public.current_org_id());

-- ===== teacher_academies =====
alter table public.teacher_academies add column organization_id uuid references public.organizations (id);
update public.teacher_academies set organization_id = (select id from public.organizations where codigo = 'principal');
alter table public.teacher_academies alter column organization_id set not null;

create trigger asignar_organization_id_teacher_academies
  before insert on public.teacher_academies
  for each row execute function public.asignar_organization_id();

drop policy "teacher_academies_select_authenticated" on public.teacher_academies;
create policy "teacher_academies_select_authenticated"
  on public.teacher_academies for select
  to authenticated
  using (organization_id = public.current_org_id());

drop policy "teacher_academies_write_admin_only" on public.teacher_academies;
create policy "teacher_academies_write_admin_only"
  on public.teacher_academies for insert
  with check (public.is_admin() and organization_id = public.current_org_id());

drop policy "teacher_academies_update_admin_only" on public.teacher_academies;
create policy "teacher_academies_update_admin_only"
  on public.teacher_academies for update
  using (public.is_admin() and organization_id = public.current_org_id());

drop policy "teacher_academies_delete_admin_only" on public.teacher_academies;
create policy "teacher_academies_delete_admin_only"
  on public.teacher_academies for delete
  using (public.is_admin() and organization_id = public.current_org_id());

-- ===== teacher_qr_tokens =====
-- Se llena vía el trigger crear_qr_token_profesor (dispara al crear un
-- profesor), nunca por insert directo del cliente: se toma el
-- organization_id del profesor recién creado, no de current_org_id().
alter table public.teacher_qr_tokens add column organization_id uuid references public.organizations (id);
update public.teacher_qr_tokens tqt
set organization_id = t.organization_id
from public.teachers t
where t.id = tqt.teacher_id;
alter table public.teacher_qr_tokens alter column organization_id set not null;

create or replace function public.crear_qr_token_profesor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.teacher_qr_tokens (teacher_id, organization_id)
  values (new.id, new.organization_id)
  on conflict (teacher_id) do nothing;
  return new;
end;
$$;

drop policy "teacher_qr_tokens_select_propio_o_admin" on public.teacher_qr_tokens;
create policy "teacher_qr_tokens_select_propio_o_admin"
  on public.teacher_qr_tokens for select
  using (
    (teacher_id = auth.uid() or public.is_admin())
    and organization_id = public.current_org_id()
  );

-- NOTA IMPORTANTE: admin-students y admin-teachers (Edge Functions,
-- corren con service_role) insertan profiles/students/teachers sin
-- una sesión de usuario real, así que current_org_id() no puede
-- resolver nada ahí (auth.uid() es null bajo service_role). Esas dos
-- funciones se actualizan por separado para mandar organization_id de
-- forma explícita, tomándolo del perfil de quien hace la llamada.
