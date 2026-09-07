-- Dance Manager: separa "quién está asignado a esta clase" (congelado
-- desde que nace la ocurrencia) de "cuánto se le pagó" (congelado solo
-- al confirmar asistencia). Ver la siguiente migración: un trigger
-- llena esta tabla automáticamente al generar ocurrencias.

create table public.class_occurrence_teachers (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.class_occurrences (id) on delete cascade,
  profesor_id uuid not null references public.teachers (id) on delete restrict,

  estado_asistencia text not null default 'programada'
    check (estado_asistencia in ('programada', 'presente', 'ausente')),

  valor_previsto numeric,
  valor_generado numeric,

  genera_pago boolean,
  registrado_en timestamptz,
  registrado_por uuid references public.profiles (id) on delete set null,
  metodo_registro text check (metodo_registro in ('qr', 'manual', 'cancelacion_pagada')),
  nota_registro text,
  valor_congelado_en timestamptz,

  created_at timestamptz not null default now(),
  unique (occurrence_id, profesor_id),

  -- Consistencia: si ya se resolvió (presente/ausente), debe haber
  -- quedado congelada; si sigue programada, no debe estar congelada.
  constraint class_occurrence_teachers_consistencia check (
    (estado_asistencia = 'programada' and valor_congelado_en is null)
    or (estado_asistencia in ('presente', 'ausente') and valor_congelado_en is not null)
  )
);

alter table public.class_occurrence_teachers enable row level security;

create policy "class_occurrence_teachers_select_propio_o_admin"
  on public.class_occurrence_teachers for select
  using (profesor_id = auth.uid() or public.is_admin());

-- El admin puede crear/borrar asignaciones a mano (ej. corregir un
-- suplente) solo mientras la fila no tenga nada financiero resuelto.
create policy "class_occurrence_teachers_insert_admin_sin_congelar"
  on public.class_occurrence_teachers for insert
  with check (
    public.is_admin()
    and valor_generado is null
    and genera_pago is null
    and valor_congelado_en is null
  );

create policy "class_occurrence_teachers_delete_admin_sin_congelar"
  on public.class_occurrence_teachers for delete
  using (public.is_admin() and valor_congelado_en is null);

-- Sin política de update: los campos financieros y de asistencia solo
-- los tocan las RPC (SECURITY DEFINER) de las próximas migraciones.
