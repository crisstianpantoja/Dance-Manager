-- Dance Manager: histórico del acuerdo económico por profesor (valor
-- por clase). Un profesor nunca puede tener dos acuerdos base vigentes
-- que se solapen en el tiempo: se protege con un exclusion constraint
-- en la base de datos, no solo desde la UI.

create extension if not exists btree_gist;

create table public.teacher_payment_agreements (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  amount_per_class numeric not null,
  effective_from date not null,
  effective_to date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint teacher_payment_agreements_rango_valido
    check (effective_to is null or effective_to >= effective_from)
);

alter table public.teacher_payment_agreements
  add constraint teacher_payment_agreements_sin_solape
  exclude using gist (
    teacher_id with =,
    daterange(effective_from, effective_to + 1) with &&
  );

alter table public.teacher_payment_agreements enable row level security;

-- Solo el admin lee/escribe el acuerdo base; el profesor no lo
-- necesita (ve su valor ya reflejado en cada clase confirmada).
create policy "teacher_payment_agreements_admin_only"
  on public.teacher_payment_agreements for all
  using (public.is_admin())
  with check (public.is_admin());

-- Se crea/renueva por esta RPC: cierra el acuerdo anterior y abre el
-- nuevo en una sola transacción, evitando que dos escrituras
-- separadas violen el exclusion constraint a mitad de camino.
create function public.crear_acuerdo_profesor(
  p_teacher_id uuid,
  p_amount numeric,
  p_effective_from date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede definir el acuerdo económico de un profesor.';
  end if;

  update public.teacher_payment_agreements
  set effective_to = p_effective_from - 1
  where teacher_id = p_teacher_id
    and effective_to is null
    and effective_from < p_effective_from;

  insert into public.teacher_payment_agreements
    (teacher_id, amount_per_class, effective_from, notes, created_by)
  values (p_teacher_id, p_amount, p_effective_from, p_notes, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;
