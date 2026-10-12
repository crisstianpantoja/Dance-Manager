-- Dance Manager: borrado completo de una academia (panel de dueño).
-- Ninguna de las ~20 tablas con organization_id tiene "on delete
-- cascade" hacia organizations (fue deliberado: nunca antes hizo falta
-- borrar una academia completa). Esta función borra todo lo de una
-- organización en el orden correcto para no violar ninguna llave
-- foránea, en particular dos "on delete restrict" reales del esquema:
-- class_occurrence_teachers.profesor_id -> teachers, y
-- teacher_liquidation_items.occurrence_teacher_id ->
-- class_occurrence_teachers.
--
-- No borra profiles/auth.users: eso lo hace la Edge Function
-- owner-panel llamando a admin.auth.admin.deleteUser (profiles.id
-- referencia a auth.users con on delete cascade, así que basta con
-- borrar el usuario de Auth). La función tampoco borra la fila de
-- organizations: eso lo hace la Edge Function al final, una vez ya no
-- queda ningún profiles.organization_id apuntándola.
--
-- Bloqueada a propósito para que solo la Edge Function (vía service
-- role) pueda invocarla: ningún admin de academia debe poder llamarla
-- desde el cliente, ni siquiera sobre su propia organización.
create function public.eliminar_organizacion(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.teacher_liquidation_items where organization_id = p_organization_id;
  delete from public.class_occurrence_teachers where organization_id = p_organization_id;
  delete from public.teacher_liquidations where organization_id = p_organization_id;
  delete from public.class_series_teachers where organization_id = p_organization_id;
  delete from public.class_occurrences where organization_id = p_organization_id;
  delete from public.class_series where organization_id = p_organization_id;
  delete from public.attendance_records where organization_id = p_organization_id;
  delete from public.payments where organization_id = p_organization_id;
  delete from public.teacher_payment_agreements where organization_id = p_organization_id;
  delete from public.student_evaluations where organization_id = p_organization_id;
  delete from public.teacher_academies where organization_id = p_organization_id;
  delete from public.teacher_qr_tokens where organization_id = p_organization_id;
  delete from public.expenses where organization_id = p_organization_id;
  delete from public.gigs where organization_id = p_organization_id;
  delete from public.events where organization_id = p_organization_id;
  delete from public.notifications where organization_id = p_organization_id;
  delete from public.app_settings where organization_id = p_organization_id;
  delete from public.plans where organization_id = p_organization_id;
  delete from public.teachers where organization_id = p_organization_id;
  delete from public.students where organization_id = p_organization_id;
  delete from public.academies where organization_id = p_organization_id;
end;
$$;

revoke execute on function public.eliminar_organizacion(uuid) from public;
revoke execute on function public.eliminar_organizacion(uuid) from anon;
revoke execute on function public.eliminar_organizacion(uuid) from authenticated;
grant execute on function public.eliminar_organizacion(uuid) to service_role;
