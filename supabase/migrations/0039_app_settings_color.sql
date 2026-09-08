-- Dance Manager: cada organización puede personalizar su color de
-- marca (además del nombre/logo que ya tenía desde la 0037), sin tocar
-- la identidad de Dance Manager como producto — el login sigue
-- mostrando su propia marca genérica, y dentro de la app queda un
-- "Hecho con Dance Manager" discreto.

alter table public.app_settings
  add column color_primario text not null default '#9542DF'
  constraint app_settings_color_formato check (color_primario ~ '^#[0-9A-Fa-f]{6}$');
