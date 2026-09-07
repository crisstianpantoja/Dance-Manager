-- Dance Manager: permite atribuir gastos y contratos a una sede
-- específica (o dejarlos generales, sin sede, si no aplica). Necesario
-- para poder calcular rentabilidad por sede más adelante.

alter table public.expenses
  add column academia_id uuid references public.academies (id) on delete set null;

alter table public.gigs
  add column academia_id uuid references public.academies (id) on delete set null;
