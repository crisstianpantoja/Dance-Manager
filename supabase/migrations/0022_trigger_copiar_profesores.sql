-- Dance Manager: al generar una ocurrencia, copia automáticamente los
-- profesores vigentes de la serie (congela la asignación desde que
-- nace la clase) y calcula valor_previsto (tarifa especial de la
-- asignación o, si no existe, el acuerdo económico vigente en la
-- fecha). Corre en la MISMA transacción que el INSERT de
-- class_occurrences: si algo falla aquí, no queda ninguna ocurrencia
-- huérfana sin profesores (no hace falta una segunda petición desde
-- el cliente).

create function public.copiar_profesores_a_ocurrencia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.class_occurrence_teachers (occurrence_id, profesor_id, valor_previsto)
  select
    new.id,
    cst.profesor_id,
    coalesce(
      cst.amount_override,
      (
        select tpa.amount_per_class
        from public.teacher_payment_agreements tpa
        where tpa.teacher_id = cst.profesor_id
          and tpa.effective_from <= new.fecha
          and (tpa.effective_to is null or tpa.effective_to >= new.fecha)
        order by tpa.effective_from desc
        limit 1
      )
    )
  from public.class_series_teachers cst
  where cst.serie_id = new.serie_id
  on conflict (occurrence_id, profesor_id) do nothing;

  return new;
end;
$$;

create trigger copiar_profesores_a_ocurrencia_trigger
  after insert on public.class_occurrences
  for each row execute function public.copiar_profesores_a_ocurrencia();
