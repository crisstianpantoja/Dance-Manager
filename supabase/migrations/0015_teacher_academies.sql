-- Dance Manager: un profesor puede trabajar en varias sedes/academias.
-- Deliberadamente NO se agrega un academia_id único en teachers para
-- no perder esa flexibilidad.

create table public.teacher_academies (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  academia_id uuid not null references public.academies (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (teacher_id, academia_id)
);

-- Un profesor solo puede tener una sede marcada como principal.
create unique index teacher_academies_una_principal
  on public.teacher_academies (teacher_id)
  where is_primary;

alter table public.teacher_academies enable row level security;

create policy "teacher_academies_select_authenticated"
  on public.teacher_academies for select
  to authenticated
  using (true);

create policy "teacher_academies_write_admin_only"
  on public.teacher_academies for insert
  with check (public.is_admin());

create policy "teacher_academies_update_admin_only"
  on public.teacher_academies for update
  using (public.is_admin());

create policy "teacher_academies_delete_admin_only"
  on public.teacher_academies for delete
  using (public.is_admin());
