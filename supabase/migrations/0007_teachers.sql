-- Dance Manager: profesores (necesarios para el portal del profesor y
-- para poder asignarlos a las clases recurrentes).

create table public.teachers (
  id uuid primary key references public.profiles (id) on delete cascade,
  nombre text not null,
  documento text not null unique,
  contacto text,
  rol_interno text,
  foto text,
  created_at timestamptz not null default now()
);

alter table public.teachers enable row level security;

-- Cualquier usuario autenticado puede ver el listado de profesores
-- (aparecen en el calendario de clases); solo el admin escribe.
create policy "teachers_select_authenticated"
  on public.teachers for select
  to authenticated
  using (true);

create policy "teachers_write_admin_only"
  on public.teachers for insert
  with check (public.is_admin());

create policy "teachers_update_admin_only"
  on public.teachers for update
  using (public.is_admin());

create policy "teachers_delete_admin_only"
  on public.teachers for delete
  using (public.is_admin());
