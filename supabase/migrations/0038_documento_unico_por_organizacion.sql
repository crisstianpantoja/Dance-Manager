-- Dance Manager: el número de documento debía ser único solo dentro de
-- cada organización, no en todo el sistema. El esquema de email
-- sintético por academia (documento@<codigo>.dance.local, migración
-- 0037) ya evita choques en el login, pero esta restricción de base de
-- datos seguía impidiendo que dos academias distintas tuvieran cada
-- una un alumno/profesor/admin con el mismo número de documento —
-- justo el problema que ese esquema debía resolver.

alter table public.profiles drop constraint profiles_documento_key;
alter table public.profiles add constraint profiles_documento_organization_key
  unique (organization_id, documento);

alter table public.students drop constraint students_documento_key;
alter table public.students add constraint students_documento_organization_key
  unique (organization_id, documento);

alter table public.teachers drop constraint teachers_documento_key;
alter table public.teachers add constraint teachers_documento_organization_key
  unique (organization_id, documento);
