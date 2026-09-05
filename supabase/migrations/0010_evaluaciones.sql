-- Dance Manager: evaluación de competencias (ritmo, movimiento, imagen,
-- conexión) que profesor/admin registran para un alumno, con notas.

create table public.student_evaluations (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.students (id) on delete cascade,
  evaluador_id uuid references public.profiles (id) on delete set null,
  fecha date not null default current_date,
  ritmo int not null check (ritmo between 0 and 10),
  movimiento int not null check (movimiento between 0 and 10),
  imagen int not null check (imagen between 0 and 10),
  conexion int not null check (conexion between 0 and 10),
  nota text,
  created_at timestamptz not null default now()
);

alter table public.student_evaluations enable row level security;

-- El propio alumno ve sus evaluaciones; profesor/admin ven y crean todas.
create policy "student_evaluations_select_self_teacher_or_admin"
  on public.student_evaluations for select
  using (
    alumno_id = auth.uid()
    or public.current_user_role() in ('profesor', 'admin')
  );

create policy "student_evaluations_write_teacher_or_admin"
  on public.student_evaluations for insert
  with check (public.current_user_role() in ('profesor', 'admin'));
