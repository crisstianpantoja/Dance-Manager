-- Dance Manager: último paso de la fundación multi-academia real —
-- convierte app_settings (nombre/logo de la app) de una fila única
-- global a una fila por organización, y agrega el trigger que crea
-- automáticamente esa fila cuando se crea una organización nueva.
--
-- El login sigue mostrando la marca genérica de Dance Manager (no la
-- de una academia específica): todas las organizaciones comparten hoy
-- la misma URL de login, así que no hay forma de saber de quién es la
-- marca hasta que el usuario escribe su código de academia y se
-- autentica. Esto cambiará naturalmente cuando exista subdominio por
-- academia (decisión ya tomada: código ahora, subdominio después).
-- Mientras tanto, app_settings solo personaliza lo que se ve DENTRO de
-- la app ya autenticado (menú del admin, encabezado del profesor).

alter table public.app_settings drop constraint app_settings_singleton;

alter table public.app_settings add column organization_id uuid references public.organizations (id);

update public.app_settings
set organization_id = (select id from public.organizations where codigo = 'principal');

alter table public.app_settings alter column organization_id set not null;

alter table public.app_settings drop constraint app_settings_pkey;
alter table public.app_settings drop column id;
alter table public.app_settings add primary key (organization_id);

-- Sigue siendo público (sin sesión): no hay dato sensible en
-- nombre_app/logo_url, y de todas formas es información que ya se
-- muestra en una pantalla de login pública.
drop policy "app_settings_select_public" on public.app_settings;
create policy "app_settings_select_public"
  on public.app_settings for select
  using (true);

drop policy "app_settings_update_admin_only" on public.app_settings;
create policy "app_settings_update_admin_only"
  on public.app_settings for update
  using (public.is_admin() and organization_id = public.current_org_id());

-- Toda organización nueva obtiene automáticamente su propia fila de
-- ajustes (nombre de la organización, sin logo hasta que el admin
-- suba uno) — así nadie olvida crearla a mano al dar de alta una
-- academia nueva.
create function public.crear_app_settings_organizacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_settings (organization_id, nombre_app)
  values (new.id, new.nombre)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

create trigger crear_app_settings_organizacion_trigger
  after insert on public.organizations
  for each row execute function public.crear_app_settings_organizacion();
