-- Dance Manager: agrega nivel a las series de clases (Básica/Intermedia/
-- Avanzada), reutilizando el mismo enum que ya usan los alumnos, para
-- mostrarlo en el detalle de "Clases" del alumno. Es opcional: no todas
-- las clases necesitan clasificarse por nivel.

alter table public.class_series add column nivel public.nivel_alumno;
