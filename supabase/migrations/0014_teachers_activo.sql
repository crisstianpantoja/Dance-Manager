-- Dance Manager: los profesores pueden marcarse como inactivos sin
-- eliminarlos (se conserva su historial de clases y liquidaciones).

alter table public.teachers
  add column activo boolean not null default true;
