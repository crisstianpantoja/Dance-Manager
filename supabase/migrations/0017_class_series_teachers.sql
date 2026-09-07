-- Dance Manager: relación normalizada serie<->profesor, con tarifa
-- especial opcional por asignación (ej. Workshop). Convive con
-- class_series.profesor_ids[] durante la transición: profesor_ids[]
-- NO se toca ni se borra en esta migración.

create table public.class_series_teachers (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references public.class_series (id) on delete cascade,
  profesor_id uuid not null references public.teachers (id) on delete cascade,
  amount_override numeric,
  created_at timestamptz not null default now(),
  unique (serie_id, profesor_id)
);

alter table public.class_series_teachers enable row level security;

-- La tarifa especial es tan sensible como el acuerdo base: solo el
-- propio profesor o el admin la leen.
create policy "class_series_teachers_select_propio_o_admin"
  on public.class_series_teachers for select
  using (profesor_id = auth.uid() or public.is_admin());

-- Sin políticas de insert/update/delete: toda escritura pasa por la
-- RPC guardar_profesores_serie (próxima migración), para que esta
-- tabla y profesor_ids[] nunca queden desincronizados.

-- Backfill: una fila por cada profesor ya asignado en profesor_ids[].
insert into public.class_series_teachers (serie_id, profesor_id)
select cs.id, unnest(cs.profesor_ids)
from public.class_series cs
where cs.profesor_ids is not null and array_length(cs.profesor_ids, 1) > 0
on conflict (serie_id, profesor_id) do nothing;
