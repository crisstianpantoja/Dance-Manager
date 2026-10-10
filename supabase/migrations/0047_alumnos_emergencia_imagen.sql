-- Dance Manager: contacto de emergencia y permiso de uso de imagen
-- del alumno. El alumno ya puede editar su propia ficha (ver
-- 0006_student_portal.sql: students_update_self + trigger
-- proteger_columnas_alumno), y estas columnas no están en la lista
-- protegida por ese trigger, así que no hace falta tocar RLS.

alter table public.students
  add column contacto_emergencia_nombre text,
  add column contacto_emergencia_telefono text,
  add column contacto_emergencia_parentesco text,
  add column autoriza_uso_imagen boolean not null default false;
