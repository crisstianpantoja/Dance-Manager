-- Dance Manager: única puerta de escritura para los profesores de una
-- clase recurrente. Actualiza class_series_teachers y profesor_ids[]
-- en la misma transacción para que nunca queden desincronizados.

create function public.guardar_profesores_serie(p_serie_id uuid, p_asignaciones jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede modificar los profesores de una clase.';
  end if;

  delete from public.class_series_teachers
  where serie_id = p_serie_id
    and profesor_id not in (
      select (elem ->> 'profesor_id')::uuid
      from jsonb_array_elements(p_asignaciones) elem
    );

  insert into public.class_series_teachers (serie_id, profesor_id, amount_override)
  select
    p_serie_id,
    (elem ->> 'profesor_id')::uuid,
    nullif(elem ->> 'amount_override', '')::numeric
  from jsonb_array_elements(p_asignaciones) elem
  on conflict (serie_id, profesor_id)
    do update set amount_override = excluded.amount_override;

  update public.class_series
  set profesor_ids = coalesce(
    (select array_agg(profesor_id) from public.class_series_teachers where serie_id = p_serie_id),
    '{}'::uuid[]
  )
  where id = p_serie_id;
end;
$$;
