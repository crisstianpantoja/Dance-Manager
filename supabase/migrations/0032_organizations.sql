-- Dance Manager: primer paso de multi-academia real. Crea la tabla de
-- organizaciones (cada una es una academia independiente) y convierte
-- el negocio actual en la primera organización, sin perder ningún
-- dato existente.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo text unique not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- Debe poder leerse SIN sesión: el login necesita resolver el código
-- de academia antes de poder autenticar al usuario.
create policy "organizations_select_publico"
  on public.organizations for select
  using (true);

-- Sin políticas de insert/update/delete para el cliente todavía: las
-- organizaciones se crean desde la consola de Supabase o, más
-- adelante, con una función administrativa dedicada.

-- Backfill: tu negocio actual pasa a ser la primera organización.
insert into public.organizations (nombre, codigo)
values ('Dance Manager', 'principal');

alter table public.profiles
  add column organization_id uuid references public.organizations (id);

update public.profiles
set organization_id = (select id from public.organizations where codigo = 'principal');

alter table public.profiles
  alter column organization_id set not null;

create function public.current_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;
