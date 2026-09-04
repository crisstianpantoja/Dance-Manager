# Dance Manager

Plataforma web (mobile-first) para gestionar academias de baile latino.

## Stack

- React + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres + Auth + Storage + RLS)
- Despliegue en Vercel

## Desarrollo

```bash
npm install
cp .env.example .env   # completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

Comandos disponibles:

- `npm run dev`: servidor de desarrollo
- `npm run lint`: typecheck (`tsc --noEmit`)
- `npm run build`: build de producción

## Base de datos (Supabase)

Las migraciones SQL viven en `supabase/migrations/`. La migración inicial
(`0001_profiles.sql`) crea la tabla `profiles` (documento, nombre, rol) con
Row Level Security: cada usuario solo puede leer su propio perfil, y solo el
rol `admin` puede escribir.

## Autenticación

El login se hace con **documento + contraseña**. Internamente se mapea el
documento a un correo sintético (`documento@dance.local`) sobre Supabase
Auth. El portal no se pinta hasta que la sesión y el perfil del usuario
terminan de cargar, para evitar pantallas vacías por condición de carrera.
