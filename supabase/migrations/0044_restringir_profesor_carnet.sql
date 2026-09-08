-- El profesor ya no puede "controlar en la puerta": ese control de
-- asistencia/pago ahora lo hace el admin escaneando el carnet del propio
-- profesor. El profesor conserva acceso de solo lectura a los alumnos que
-- evalúa (tipo privada/ambas) y pierde el acceso amplio a students/payments.

drop policy "students_select_self_teacher_or_admin" on public.students;
create policy "students_select_self_teacher_or_admin"
  on public.students for select
  using (
    (
      id = auth.uid()
      or public.is_admin()
      or (public.current_user_role() = 'profesor' and tipo in ('privada', 'ambas'))
    )
    and organization_id = public.current_org_id()
  );

drop policy "payments_select_self_teacher_or_admin" on public.payments;
create policy "payments_select_self_teacher_or_admin"
  on public.payments for select
  using (
    (alumno_id = auth.uid() or public.is_admin())
    and organization_id = public.current_org_id()
  );

-- Comprobantes de pago: el profesor ya no forma parte del "control en la
-- puerta", así que tampoco necesita leer los comprobantes de los alumnos.
drop policy "comprobantes_lectura_propia_o_admin" on storage.objects;
create policy "comprobantes_lectura_propia_o_admin"
  on storage.objects for select
  using (
    bucket_id = 'comprobantes'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
