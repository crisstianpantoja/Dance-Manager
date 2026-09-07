-- Dance Manager: ajustes globales de marca (nombre, logo) para toda la
-- app. Una sola fila (id = true la fuerza), visible sin sesión porque el
-- login también la necesita; solo el admin la edita.

create table public.app_settings (
  id boolean primary key default true,
  nombre_app text not null default 'Dance Manager',
  logo_url text,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);

insert into public.app_settings (id) values (true);

alter table public.app_settings enable row level security;

create policy "app_settings_select_public"
  on public.app_settings for select
  using (true);

create policy "app_settings_update_admin_only"
  on public.app_settings for update
  using (public.is_admin());
