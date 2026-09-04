-- Dance Manager: programación (bases) y asistencia (sección 7)

create type public.estado_ocurrencia as enum ('programada', 'cancelada');
create type public.clase_tipo_attendance as enum (
  'academia',
  'programada',
  'sesion',
  'evento',
  'manual'
);
create type public.origen_attendance as enum ('qr', 'manual');
create type public.estado_plan_attendance as enum (
  'cupo',
  'ilimitada',
  'sin_cupo',
  'vencido',
  'sin_plan'
);

-- Regla semanal de una clase de academia. El CRUD completo (paso 5) vive
-- sobre esta misma tabla; se crea ahora porque la asistencia por QR ya
-- necesita poder consultar "las clases del día".
create table public.class_series (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid references public.academies (id) on delete cascade,
  titulo text not null,
  categoria text,
  dia_semana int not null check (dia_semana between 0 and 6),
  hora time not null,
  duracion_min int not null default 60,
  profesor_ids uuid[] not null default '{}',
  cupo_maximo int,
  lugar text,
  vigente_desde date not null default current_date,
  vigente_hasta date,
  created_at timestamptz not null default now()
);

-- Fila fechada de una serie: lo que realmente aparece en el calendario y
-- lo que se escanea en la puerta.
create table public.class_occurrences (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references public.class_series (id) on delete cascade,
  academia_id uuid references public.academies (id) on delete cascade,
  fecha date not null,
  hora time not null,
  alumno_ids uuid[] not null default '{}',
  estado public.estado_ocurrencia not null default 'programada',
  created_at timestamptz not null default now()
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.students (id) on delete cascade,
  clase_key text not null,
  clase_tipo public.clase_tipo_attendance not null,
  session_id uuid,
  event_id uuid,
  clase_id uuid references public.class_occurrences (id) on delete set null,
  fecha date not null,
  hora time not null,
  titulo text not null,
  categoria text,
  origen public.origen_attendance not null default 'manual',
  academia_id uuid references public.academies (id) on delete set null,
  consumio_cupo boolean not null default false,
  estado_plan public.estado_plan_attendance not null,
  payment_id uuid references public.payments (id) on delete set null,
  anulado boolean not null default false,
  created_at timestamptz not null default now()
);

-- Doble escaneo: no puede haber dos registros vigentes (no anulados) del
-- mismo alumno para la misma clase.
create unique index attendance_records_sin_duplicados
  on public.attendance_records (alumno_id, clase_key)
  where not anulado;

alter table public.class_series enable row level security;
alter table public.class_occurrences enable row level security;
alter table public.attendance_records enable row level security;

create policy "class_series_select_authenticated"
  on public.class_series for select
  to authenticated
  using (true);

create policy "class_series_write_admin_only"
  on public.class_series for insert
  with check (public.is_admin());

create policy "class_series_update_admin_only"
  on public.class_series for update
  using (public.is_admin());

create policy "class_series_delete_admin_only"
  on public.class_series for delete
  using (public.is_admin());

create policy "class_occurrences_select_authenticated"
  on public.class_occurrences for select
  to authenticated
  using (true);

create policy "class_occurrences_write_admin_only"
  on public.class_occurrences for insert
  with check (public.is_admin());

create policy "class_occurrences_update_admin_only"
  on public.class_occurrences for update
  using (public.is_admin());

create policy "class_occurrences_delete_admin_only"
  on public.class_occurrences for delete
  using (public.is_admin());

-- Asistencia: el propio alumno lee su historial, profesor/admin leen todo.
-- Regla innegociable de la sección 5: NINGÚN rol escribe attendance_records
-- desde el cliente, ni siquiera el admin. Todo pasa por la Edge Function
-- "attendance", que aplica elegirPlan/registrarAsistencia/anular con la
-- service role tras verificar que quien llama es admin o profesor.
create policy "attendance_select_self_teacher_or_admin"
  on public.attendance_records for select
  using (
    alumno_id = auth.uid()
    or public.current_user_role() in ('profesor', 'admin')
  );
