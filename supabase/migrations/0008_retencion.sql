-- Dance Manager: retención — notificaciones y alerta automática a los
-- 8 días de vencido un plan sin que el alumno haya renovado.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mensaje text not null,
  fecha timestamptz not null default now(),
  leida boolean not null default false
);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Genera una notificación para cada admin por cada alumno cuyo plan
-- venció hace exactamente 8 días y que, a hoy, no tiene ningún otro plan
-- pagado vigente (no renovó). Se llama desde pg_cron una vez al día; un
-- admin autenticado también puede invocarla manualmente (botón
-- "Actualizar alertas"), nunca otro rol.
create function public.generar_alertas_renovacion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fila record;
  admin_id uuid;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Solo un administrador puede ejecutar esta acción.';
  end if;

  for fila in
    select s.id as alumno_id, s.nombre, s.contacto, p.fecha_vencimiento
    from public.payments p
    join public.students s on s.id = p.alumno_id
    where p.estado = 'pagado'
      and p.fecha_vencimiento = current_date - interval '8 days'
      and not exists (
        select 1 from public.payments p2
        where p2.alumno_id = p.alumno_id
          and p2.estado = 'pagado'
          and (p2.fecha_vencimiento is null or p2.fecha_vencimiento >= current_date)
      )
  loop
    for admin_id in select id from public.profiles where rol = 'admin' loop
      insert into public.notifications (user_id, mensaje)
      values (
        admin_id,
        fila.nombre || ' no ha renovado su plan (venció el ' ||
          to_char(fila.fecha_vencimiento, 'DD/MM/YYYY') || ').'
      );
    end loop;
  end loop;
end;
$$;

-- Programación diaria. pg_cron no está disponible en todos los planes de
-- Supabase, así que esto se intenta pero nunca rompe la migración: si no
-- se puede habilitar, queda el botón manual "Actualizar alertas" del
-- panel de retención como respaldo.
do $$
begin
  create extension if not exists pg_cron with schema extensions;

  perform cron.schedule(
    'alertas-renovacion-diarias',
    '0 8 * * *',
    $cron$select public.generar_alertas_renovacion()$cron$
  );
exception
  when insufficient_privilege or feature_not_supported or undefined_function then
    raise notice 'pg_cron no disponible en este proyecto; usa el botón manual de alertas.';
end;
$$;
