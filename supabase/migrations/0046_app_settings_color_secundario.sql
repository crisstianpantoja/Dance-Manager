-- Dance Manager: color secundario opcional, para academias cuya marca
-- tiene dos colores en vez de uno solo derivado por luminosidad (ver
-- 0039_app_settings_color.sql). Nulo por defecto: sin él, la app sigue
-- viéndose exactamente igual que hoy.

alter table public.app_settings
  add column color_secundario text
  constraint app_settings_color_secundario_formato check (
    color_secundario is null or color_secundario ~ '^#[0-9A-Fa-f]{6}$'
  );
