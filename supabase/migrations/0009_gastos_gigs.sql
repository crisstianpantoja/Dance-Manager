-- Dance Manager: gastos y contratos (DJ/tallerista) — solo para el admin,
-- alimentan el panel de Inicio (ganancia neta, próximos contratos).

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  concepto text not null,
  monto numeric not null default 0,
  fecha date not null default current_date,
  categoria text,
  notas text,
  created_at timestamptz not null default now()
);

create type public.gig_tipo as enum ('dj', 'tallerista', 'contrato');
create type public.gig_estado as enum ('cotizado', 'confirmado', 'pagado');

create table public.gigs (
  id uuid primary key default gen_random_uuid(),
  tipo public.gig_tipo not null default 'dj',
  evento text not null,
  lugar text,
  fecha date not null,
  hora time not null,
  duracion_min int not null default 60,
  pago numeric not null default 0,
  estado public.gig_estado not null default 'cotizado',
  contacto text,
  notas text,
  acompanado boolean not null default false,
  acompanante text,
  pago_acompanante numeric,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
alter table public.gigs enable row level security;

-- Datos financieros y de negocio personal del admin: nadie más los ve.
create policy "expenses_admin_only"
  on public.expenses for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "gigs_admin_only"
  on public.gigs for all
  using (public.is_admin())
  with check (public.is_admin());
