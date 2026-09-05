# Guía de despliegue — Dance Manager

Paso 9 del plan: llevar la app a producción sobre **Supabase** (backend) y
**Vercel** (frontend). Sin servidor propio, sin Netlify.

Necesitas:

- Una cuenta de [Supabase](https://supabase.com) y una de [Vercel](https://vercel.com).
- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado (`npm install -g supabase`).
- Este repositorio en GitHub (para conectar Vercel).

---

## 1. Crear el proyecto de Supabase

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Elige nombre, contraseña de base de datos y región (idealmente cerca de tus
   usuarios, ej. `us-east-1` o `sa-east-1`).
3. Cuando el proyecto esté listo, ve a **Project Settings → API** y copia:
   - `Project URL` → será `VITE_SUPABASE_URL`.
   - `anon public key` → será `VITE_SUPABASE_ANON_KEY`.

## 2. Aplicar las migraciones

Desde la raíz del repo:

```bash
supabase login
supabase link --project-ref <tu-project-ref>   # está en la URL del dashboard
supabase db push
```

Esto ejecuta en orden todo lo que hay en `supabase/migrations/` (perfiles,
academias, alumnos, planes, pagos, asistencia, programación, portal del
alumno, profesores y retención) y crea los buckets de Storage (`fotos`
público, `comprobantes` privado).

Si prefieres no usar el CLI, puedes pegar el contenido de cada archivo
`supabase/migrations/000X_*.sql` **en orden** en el **SQL Editor** del
dashboard.

## 3. Desplegar las Edge Functions

Estas funciones corren con la *service role key* de Supabase (nunca
expuesta al cliente) para las acciones que el RLS le prohíbe hacer
directamente a alumnos/profesores: crear cuentas, registrar asistencia,
reportar pagos y gestionar reservas.

```bash
supabase functions deploy admin-students
supabase functions deploy admin-teachers
supabase functions deploy attendance
supabase functions deploy report-payment
supabase functions deploy reservations
```

No necesitas configurar variables de entorno para ellas: Supabase les
inyecta automáticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY`.

### `pg_cron` (alertas de renovación) — opcional

La migración `0008_retencion.sql` intenta habilitar `pg_cron` para
generar automáticamente las alertas de no renovación cada día a las 8am
UTC. Si tu plan de Supabase no lo soporta, la migración no falla (el
`generar_alertas_renovacion()` se puede seguir usando en cualquier
momento con el botón **"Actualizar alertas"** del panel de Retención).

Para confirmar si quedó programado:

```sql
select * from cron.job;
```

## 4. Crear el primer usuario admin

No hay registro público: todas las cuentas las crea un admin desde el
panel. Por eso el **primer** admin hay que crearlo a mano, una sola vez:

1. En el dashboard de Supabase, ve a **Authentication → Users → Add user**.
   - Email: `<documento-del-admin>@dance.local` (ej. `123456@dance.local`).
   - Password: la que vaya a usar para entrar.
   - Marca **Auto Confirm User**.
2. Copia el `User UID` que se generó.
3. En el **SQL Editor**, ejecuta (reemplaza los valores):

   ```sql
   insert into public.profiles (id, documento, nombre, rol)
   values ('<UUID-del-usuario>', '123456', 'Nombre del admin', 'admin');
   ```

Con eso ya puedes iniciar sesión en la app con documento `123456` y esa
contraseña, y crear el resto de alumnos/profesores desde el panel.

## 5. Configurar las URLs de redirección (recuperar contraseña)

En **Authentication → URL Configuration**:

- **Site URL**: la URL final de Vercel (ej. `https://dance-manager.vercel.app`).
- **Redirect URLs**: agrega `https://<tu-dominio>.vercel.app/actualizar-password`
  (y `http://localhost:5173/actualizar-password` si vas a probar en local).

## 6. Desplegar en Vercel

1. En [vercel.com/new](https://vercel.com/new), importa este repositorio.
2. Vercel detecta Vite automáticamente:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. En **Environment Variables**, agrega:
   - `VITE_SUPABASE_URL` = la URL del proyecto (paso 1).
   - `VITE_SUPABASE_ANON_KEY` = la anon key (paso 1).
4. **Deploy**.

El archivo `vercel.json` ya incluido hace el *rewrite* necesario para que
las rutas de React Router (`/admin/...`, `/alumno/...`, `/profesor/...`)
funcionen al recargar o compartir un link directo, en vez de dar 404.

## 7. Verificación post-deploy

- [ ] Entrar con el admin creado en el paso 4.
- [ ] Crear al menos una academia (**Academias**).
- [ ] Crear un plan en el catálogo (**Planes**).
- [ ] Crear un alumno de prueba (**Alumnos**) — esto ya prueba que la
      función `admin-students` quedó bien desplegada.
- [ ] Crear una clase recurrente (**Clases**) y confirmar que aparecen
      ocurrencias en **Calendario**.
- [ ] Iniciar sesión como ese alumno y ver su carnet QR en **Perfil**.
- [ ] Registrar su asistencia desde **Asistencia** (admin o profesor) con
      el documento o el QR — confirma que `attendance` quedó bien
      desplegada y que el estado del plan se calcula correctamente.
- [ ] Reportar un pago desde el portal del alumno y verificarlo desde
      **Pagos** — confirma `report-payment`.
- [ ] Reservar una clase o evento desde el portal del alumno — confirma
      `reservations`.

Si cualquiera de estas acciones falla con un error de red o 401/403,
revisa primero que la Edge Function correspondiente esté desplegada
(`supabase functions list`) y que las variables de entorno de Vercel
apunten al proyecto correcto.
