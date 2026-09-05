-- Dance Manager: portal del alumno (carnet + T&C, eventos, reservas)

-- El alumno puede editar su propia ficha (foto, contacto, tema del
-- carnet, aceptación de términos), pero un trigger impide que toque los
-- campos que siguen siendo del admin (nombre, documento, tipo, nivel,
-- academia). No viola la regla de la sección 5: "students" no es una de
-- las 4 tablas con esa restricción.
create policy "students_update_self"
  on public.students for update
  using (id = auth.uid())
  with check (id = auth.uid());

create function public.proteger_columnas_alumno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.nombre is distinct from old.nombre
    or new.documento is distinct from old.documento
    or new.tipo is distinct from old.tipo
    or new.nivel is distinct from old.nivel
    or new.academia_id is distinct from old.academia_id
  then
    raise exception 'Solo un administrador puede modificar estos datos.';
  end if;

  return new;
end;
$$;

create trigger proteger_columnas_alumno_trigger
  before update on public.students
  for each row execute function public.proteger_columnas_alumno();

-- Eventos: catálogo simple del admin, con reservas por alumno.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  fecha date not null,
  hora time not null,
  lugar text,
  descripcion text,
  cupo_maximo int,
  reservas uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events_select_authenticated"
  on public.events for select
  to authenticated
  using (true);

create policy "events_write_admin_only"
  on public.events for insert
  with check (public.is_admin());

create policy "events_update_admin_only"
  on public.events for update
  using (public.is_admin());

create policy "events_delete_admin_only"
  on public.events for delete
  using (public.is_admin());
