-- Dance Manager: imagen promocional opcional para los eventos.

alter table public.events
  add column imagen_url text;
