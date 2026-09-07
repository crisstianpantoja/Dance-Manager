-- Dance Manager: identificador QR del profesor. Vive en su propia
-- tabla (no como columna de "teachers") porque "teachers" es de
-- lectura pública para cualquier usuario autenticado, y este token
-- puede llegar a generar un registro financiero si se filtra.

create table public.teacher_qr_tokens (
  teacher_id uuid primary key references public.teachers (id) on delete cascade,
  qr_token uuid unique not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  regenerated_at timestamptz
);

alter table public.teacher_qr_tokens enable row level security;

-- El profesor solo lee su propio token (para pintar su carnet); el
-- admin puede leerlos todos. No hay política de insert/update/delete:
-- la tabla solo se escribe mediante el trigger de abajo o las RPC de
-- asistencia (SECURITY DEFINER, no sujetas a estas políticas).
create policy "teacher_qr_tokens_select_propio_o_admin"
  on public.teacher_qr_tokens for select
  using (teacher_id = auth.uid() or public.is_admin());

-- Garantiza que todo profesor YA existente tenga un token.
insert into public.teacher_qr_tokens (teacher_id)
select id from public.teachers
on conflict (teacher_id) do nothing;

-- Garantiza que todo profesor FUTURO tenga un token automáticamente,
-- sin depender de que una Edge Function se acuerde de crearlo.
create function public.crear_qr_token_profesor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.teacher_qr_tokens (teacher_id)
  values (new.id)
  on conflict (teacher_id) do nothing;
  return new;
end;
$$;

create trigger crear_qr_token_profesor_trigger
  after insert on public.teachers
  for each row execute function public.crear_qr_token_profesor();
