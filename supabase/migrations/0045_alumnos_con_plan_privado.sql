-- Una clase se muestra como "Privada" (en vez del nivel Básica/Intermedia/
-- Avanzada) cuando algún alumno inscrito tiene un plan pagado de modalidad
-- "paquete_privado" (ver catálogo de planes: Gold, Plan Silver, etc.).
--
-- Esto requiere leer payments.modalidad para alumnos que no son el propio
-- caller, algo que el profesor ya no puede hacer directamente (migración
-- 0044). Por eso se expone como una función de superficie mínima: solo
-- devuelve qué ids de la lista tienen plan privado, sin exponer montos,
-- fechas ni ningún otro dato de payments.
create or replace function public.alumnos_con_plan_privado(p_alumno_ids uuid[])
returns table (alumno_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.alumno_id
  from public.payments p
  where p.alumno_id = any(p_alumno_ids)
    and p.estado = 'pagado'
    and p.modalidad = 'paquete_privado'
    and p.organization_id = public.current_org_id()
$$;

grant execute on function public.alumnos_con_plan_privado(uuid[]) to authenticated;
