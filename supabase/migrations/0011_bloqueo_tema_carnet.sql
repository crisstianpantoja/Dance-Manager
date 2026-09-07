-- Dance Manager: el alumno solo puede cambiar el color del carnet una vez
-- cada 12 meses (el admin no tiene esta restricción).

alter table public.students
  add column tema_carnet_actualizado_en timestamptz;

create function public.proteger_tema_carnet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.tema_carnet is distinct from old.tema_carnet then
    if old.tema_carnet_actualizado_en is not null
      and now() < old.tema_carnet_actualizado_en + interval '12 months'
    then
      raise exception 'Solo puedes cambiar el tema del carnet una vez cada 12 meses.';
    end if;

    new.tema_carnet_actualizado_en := now();
  end if;

  return new;
end;
$$;

create trigger proteger_tema_carnet_trigger
  before update on public.students
  for each row execute function public.proteger_tema_carnet();
