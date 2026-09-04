-- Dance Manager: catálogo de planes y pagos (carnet activo del alumno)

create type public.modalidad_plan as enum (
  'ilimitada',
  'cupos',
  'paquete_privado',
  'clase_suelta'
);

create type public.estado_pago as enum ('pendiente', 'pagado', 'rechazado');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  modalidad public.modalidad_plan not null,
  clases_incluidas int,
  dias_vigencia int,
  precio numeric not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.students (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete set null,
  modalidad public.modalidad_plan not null,
  concepto text not null,
  clases_incluidas int not null default 0,
  clases_usadas int not null default 0,
  fecha date not null default current_date,
  fecha_vencimiento date,
  monto numeric not null default 0,
  estado public.estado_pago not null default 'pendiente',
  comprobante_url text,
  metodo text,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;
alter table public.payments enable row level security;

-- Catálogo: cualquier usuario autenticado lo lee, solo admin lo escribe.
create policy "plans_select_authenticated"
  on public.plans for select
  to authenticated
  using (true);

create policy "plans_write_admin_only"
  on public.plans for insert
  with check (public.is_admin());

create policy "plans_update_admin_only"
  on public.plans for update
  using (public.is_admin());

create policy "plans_delete_admin_only"
  on public.plans for delete
  using (public.is_admin());

-- Pagos: el propio alumno lee sus pagos (carnet), el profesor y el admin
-- leen todos (control en puerta). Regla innegociable: solo admin escribe
-- desde el cliente.
create policy "payments_select_self_teacher_or_admin"
  on public.payments for select
  using (
    alumno_id = auth.uid()
    or public.current_user_role() in ('profesor', 'admin')
  );

create policy "payments_write_admin_only"
  on public.payments for insert
  with check (public.is_admin());

create policy "payments_update_admin_only"
  on public.payments for update
  using (public.is_admin());

create policy "payments_delete_admin_only"
  on public.payments for delete
  using (public.is_admin());

-- Storage: comprobantes de pago, en carpeta por alumno (uid). Privado.
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

create policy "comprobantes_lectura_propia_o_admin"
  on storage.objects for select
  using (
    bucket_id = 'comprobantes'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
      or public.current_user_role() = 'profesor'
    )
  );

create policy "comprobantes_escritura_propia_o_admin"
  on storage.objects for insert
  with check (
    bucket_id = 'comprobantes'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

create policy "comprobantes_actualizacion_admin"
  on storage.objects for update
  using (bucket_id = 'comprobantes' and public.is_admin());

create policy "comprobantes_borrado_admin"
  on storage.objects for delete
  using (bucket_id = 'comprobantes' and public.is_admin());
