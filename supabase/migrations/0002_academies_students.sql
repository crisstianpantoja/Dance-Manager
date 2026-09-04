-- Dance Manager: academias y alumnos (CRUD del admin)

create type public.tipo_alumno as enum ('academia', 'privada', 'ambas');
create type public.nivel_alumno as enum ('Básica', 'Intermedia', 'Avanzada');

create table public.academies (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  logo text,
  color text,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key references public.profiles (id) on delete cascade,
  nombre text not null,
  documento text not null unique,
  contacto text,
  foto text,
  tipo public.tipo_alumno not null default 'academia',
  nivel public.nivel_alumno not null default 'Básica',
  academia_id uuid references public.academies (id) on delete set null,
  tema_carnet text,
  acepto_terminos boolean not null default false,
  fecha_acepto_terminos timestamptz,
  created_at timestamptz not null default now()
);

alter table public.academies enable row level security;
alter table public.students enable row level security;

-- Academias: cualquier usuario autenticado puede leerlas (branding, calendario);
-- solo el admin escribe.
create policy "academies_select_authenticated"
  on public.academies for select
  to authenticated
  using (true);

create policy "academies_write_admin_only"
  on public.academies for insert
  with check (public.is_admin());

create policy "academies_update_admin_only"
  on public.academies for update
  using (public.is_admin());

create policy "academies_delete_admin_only"
  on public.academies for delete
  using (public.is_admin());

-- Alumnos: el propio alumno lee su fila, el profesor lee todas (control en
-- puerta), el admin lee y escribe todas. Nadie fuera del admin escribe.
create policy "students_select_self_teacher_or_admin"
  on public.students for select
  using (
    id = auth.uid()
    or public.current_user_role() in ('profesor', 'admin')
  );

create policy "students_write_admin_only"
  on public.students for insert
  with check (public.is_admin());

create policy "students_update_admin_only"
  on public.students for update
  using (public.is_admin());

create policy "students_delete_admin_only"
  on public.students for delete
  using (public.is_admin());

-- Storage: bucket público de fotos (alumnos, profesores, logos de academia).
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

create policy "fotos_lectura_publica"
  on storage.objects for select
  using (bucket_id = 'fotos');

create policy "fotos_escritura_admin"
  on storage.objects for insert
  with check (bucket_id = 'fotos' and public.is_admin());

create policy "fotos_actualizacion_admin"
  on storage.objects for update
  using (bucket_id = 'fotos' and public.is_admin());

create policy "fotos_borrado_admin"
  on storage.objects for delete
  using (bucket_id = 'fotos' and public.is_admin());
