-- Evita ocurrencias duplicadas para la misma serie en la misma fecha
-- cuando el admin regenera el calendario.
create unique index class_occurrences_serie_fecha_unica
  on public.class_occurrences (serie_id, fecha);
