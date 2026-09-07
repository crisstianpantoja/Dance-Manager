-- Dance Manager: identificar a un profesor por su token QR sin exponer
-- nunca una consulta genérica por token desde el cliente. Admin-only:
-- por ahora el flujo real es "el profesor presenta el QR, recepción
-- (admin) lo escanea y confirma".

create function public.identificar_profesor_por_qr(p_token uuid)
returns table (profesor_id uuid, nombre text, foto text, activo boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  return query
  select t.id, t.nombre, t.foto, t.activo
  from public.teacher_qr_tokens qt
  join public.teachers t on t.id = qt.teacher_id
  where qt.qr_token = p_token;
end;
$$;

create function public.regenerar_qr_token(p_teacher_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  update public.teacher_qr_tokens
  set qr_token = gen_random_uuid(), regenerated_at = now()
  where teacher_id = p_teacher_id
  returning qr_token into v_token;

  if v_token is null then
    raise exception 'Este profesor no tiene token QR.';
  end if;

  return v_token;
end;
$$;
