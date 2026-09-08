-- Dance Manager: agrega precio y profesores/artistas a los eventos, para
-- las tarjetas de "Explorar eventos" del alumno. Ambas columnas son
-- opcionales — un evento gratuito no tiene precio, y no todo evento
-- necesita listar profesores/artistas.

alter table public.events add column precio numeric;
alter table public.events add column profesores text;
