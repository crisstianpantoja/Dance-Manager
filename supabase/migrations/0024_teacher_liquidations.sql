-- Dance Manager: liquidaciones mensuales del profesor. Una liquidación
-- "pagada" es inmutable; anular una liquidación libera sus items
-- (voided_at) sin borrarlos, para conservar la auditoría completa.
-- Sin políticas de escritura directa: todo pasa por las RPC de la
-- migración 0028, para que "pagada" sea realmente inmutable y el
-- periodo nunca incluya clases posteriores a sí mismo.

create table public.teacher_liquidations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  total_amount numeric not null default 0,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobada', 'pagada', 'anulada')),
  approved_at timestamptz,
  paid_at date,
  payment_method text,
  proof_url text,
  notes text,
  created_at timestamptz not null default now()
);

create unique index teacher_liquidations_periodo_activo
  on public.teacher_liquidations (teacher_id, year, month)
  where estado <> 'anulada';

alter table public.teacher_liquidations enable row level security;

create policy "teacher_liquidations_select_propio_o_admin"
  on public.teacher_liquidations for select
  using (teacher_id = auth.uid() or public.is_admin());

create table public.teacher_liquidation_items (
  id uuid primary key default gen_random_uuid(),
  liquidation_id uuid not null references public.teacher_liquidations (id) on delete cascade,
  occurrence_teacher_id uuid not null references public.class_occurrence_teachers (id) on delete restrict,
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  amount numeric not null,
  fecha_clase date not null,
  voided_at timestamptz,
  created_at timestamptz not null default now()
);

-- Una participación profesor+ocurrencia no puede estar en dos
-- liquidaciones activas a la vez (sí puede volver a incluirse después
-- de que la que la tenía se anule, porque ahí voided_at deja de ser
-- null y el índice deja de contarla).
create unique index teacher_liquidation_items_activo_unico
  on public.teacher_liquidation_items (occurrence_teacher_id)
  where voided_at is null;

alter table public.teacher_liquidation_items enable row level security;

create policy "teacher_liquidation_items_select_propio_o_admin"
  on public.teacher_liquidation_items for select
  using (teacher_id = auth.uid() or public.is_admin());
