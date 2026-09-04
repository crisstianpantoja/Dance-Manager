-- Dance Manager: perfiles de usuario y control de roles (base de RLS)
-- Cada usuario de Supabase Auth (login documento+contraseña sobre email
-- sintético documento@dance.local) tiene un perfil con su rol.

create type public.user_role as enum ('admin', 'profesor', 'alumno');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  documento text not null unique,
  nombre text not null,
  rol public.user_role not null default 'alumno',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Función security definer para evitar recursión de RLS al consultar el rol.
create function public.current_user_role()
returns public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid();
$$;

create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

-- Un usuario puede leer su propio perfil; el admin puede leer todos.
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Solo el admin puede crear/editar/borrar perfiles desde el cliente.
create policy "profiles_write_admin_only"
  on public.profiles for insert
  with check (public.is_admin());

create policy "profiles_update_admin_only"
  on public.profiles for update
  using (public.is_admin());

create policy "profiles_delete_admin_only"
  on public.profiles for delete
  using (public.is_admin());
