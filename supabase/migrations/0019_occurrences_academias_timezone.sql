-- Dance Manager: auditoría de cancelación de ocurrencias + huso
-- horario por academia (hoy todas en America/Bogota; deja la
-- arquitectura lista para sedes en otro huso horario en el futuro).

alter table public.class_occurrences
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references public.profiles (id) on delete set null;

alter table public.academies
  add column timezone text not null default 'America/Bogota';

create function public.fecha_hoy_academia(p_academia_id uuid default null)
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone coalesce(
    (select timezone from public.academies where id = p_academia_id),
    'America/Bogota'
  ))::date;
$$;
