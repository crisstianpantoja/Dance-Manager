-- Dance Manager: backfill para ocurrencias creadas antes de esta
-- funcionalidad.
--
-- LIMITACIÓN DOCUMENTADA: se asigna el profesor ACTUAL de cada serie
-- (class_series_teachers, ya sincronizado desde profesor_ids[] en la
-- migración 0017). Si una serie cambió de profesor antes de hoy, las
-- ocurrencias viejas no pueden recuperar quién la dictó realmente
-- porque ese dato nunca se guardó. Ninguna ocurrencia pasada se marca
-- "presente" ni se le congela pago automáticamente: quedan en
-- "programada", disponibles para revisión manual si se necesita pago
-- retroactivo.

insert into public.class_occurrence_teachers (occurrence_id, profesor_id, valor_previsto)
select
  co.id,
  cst.profesor_id,
  coalesce(
    cst.amount_override,
    (
      select tpa.amount_per_class
      from public.teacher_payment_agreements tpa
      where tpa.teacher_id = cst.profesor_id
        and tpa.effective_from <= co.fecha
        and (tpa.effective_to is null or tpa.effective_to >= co.fecha)
      order by tpa.effective_from desc
      limit 1
    )
  )
from public.class_occurrences co
join public.class_series_teachers cst on cst.serie_id = co.serie_id
on conflict (occurrence_id, profesor_id) do nothing;

-- RPC de mantenimiento: si al momento del backfill un profesor todavía
-- no tenía teacher_payment_agreements configurado, su valor_previsto
-- quedó en NULL. Esta función recalcula valor_previsto para cualquier
-- fila pendiente (todas, o solo las de un profesor) SIN tocar nunca
-- una fila ya resuelta (presente/ausente) o congelada.
--
-- NOTA: en esta etapa todavía no existe teacher_liquidation_items, así
-- que el resguardo "no pertenece a una liquidación activa" no aplica
-- aún (no puede haber liquidaciones sin que exista primero el flujo de
-- asistencia QR). La migración que crea teacher_liquidation_items
-- reemplaza esta función (CREATE OR REPLACE) agregando ese resguardo.
create function public.recalcular_valores_previstos_pendientes(p_profesor_id uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actualizadas int;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede recalcular tarifas previstas.';
  end if;

  with candidatas as (
    select cot.id, cot.profesor_id, co.serie_id, co.fecha
    from public.class_occurrence_teachers cot
    join public.class_occurrences co on co.id = cot.occurrence_id
    where cot.estado_asistencia = 'programada'
      and cot.valor_generado is null
      and cot.valor_congelado_en is null
      and (p_profesor_id is null or cot.profesor_id = p_profesor_id)
  ),
  calculadas as (
    select
      c.id,
      coalesce(
        cst.amount_override,
        (
          select tpa.amount_per_class
          from public.teacher_payment_agreements tpa
          where tpa.teacher_id = c.profesor_id
            and tpa.effective_from <= c.fecha
            and (tpa.effective_to is null or tpa.effective_to >= c.fecha)
          order by tpa.effective_from desc
          limit 1
        )
      ) as nuevo_valor
    from candidatas c
    left join public.class_series_teachers cst
      on cst.serie_id = c.serie_id and cst.profesor_id = c.profesor_id
  )
  update public.class_occurrence_teachers cot
  set valor_previsto = calculadas.nuevo_valor
  from calculadas
  where cot.id = calculadas.id
    and calculadas.nuevo_valor is not null
    and cot.valor_previsto is distinct from calculadas.nuevo_valor;

  get diagnostics v_actualizadas = row_count;
  return v_actualizadas;
end;
$$;
