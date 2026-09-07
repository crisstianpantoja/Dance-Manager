-- Dance Manager: reasignar el profesor de ocurrencias futuras ya
-- generadas (ej. Cristian deja de dictar los jueves desde octubre).
-- Nunca toca una ocurrencia con asistencia presente, valor_generado,
-- valor_congelado_en o ya incluida en una liquidación activa.
--
-- El "for update" en el cursor bloquea cada class_occurrences fila
-- antes de decidir nada, con el mismo candado que usa
-- registrar_asistencia_profesor: si coinciden en la misma ocurrencia,
-- una transacción espera a que la otra termine por completo, así que
-- nunca pueden modificarla a medio camino de forma inconsistente.

create function public.actualizar_asignaciones_futuras(
  p_serie_id uuid, p_desde date, p_asignaciones jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occ record;
  v_bloqueada boolean;
  v_count int := 0;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  for v_occ in
    select id, fecha from public.class_occurrences
    where serie_id = p_serie_id and fecha >= p_desde and estado = 'programada'
    order by fecha
    for update
  loop
    select exists (
      select 1 from public.class_occurrence_teachers cot
      where cot.occurrence_id = v_occ.id
        and (cot.estado_asistencia = 'presente'
             or cot.valor_generado is not null
             or cot.valor_congelado_en is not null)
    ) into v_bloqueada;

    if not v_bloqueada then
      select exists (
        select 1 from public.class_occurrence_teachers cot
        join public.teacher_liquidation_items tli
          on tli.occurrence_teacher_id = cot.id and tli.voided_at is null
        where cot.occurrence_id = v_occ.id
      ) into v_bloqueada;
    end if;

    continue when v_bloqueada;

    perform 1 from public.class_occurrence_teachers where occurrence_id = v_occ.id for update;
    delete from public.class_occurrence_teachers where occurrence_id = v_occ.id;

    insert into public.class_occurrence_teachers (occurrence_id, profesor_id, valor_previsto)
    select
      v_occ.id,
      (e ->> 'profesor_id')::uuid,
      coalesce(
        nullif(e ->> 'amount_override', '')::numeric,
        (
          select amount_per_class from public.teacher_payment_agreements
          where teacher_id = (e ->> 'profesor_id')::uuid
            and effective_from <= v_occ.fecha
            and (effective_to is null or effective_to >= v_occ.fecha)
          order by effective_from desc limit 1
        )
      )
    from jsonb_array_elements(p_asignaciones) e;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
