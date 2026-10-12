// Edge Function: panel de dueño de la plataforma (todas las
// academias/organizaciones, no solo una). Usa la service role porque
// necesita leer y escribir a través de organizaciones distintas, algo
// que ninguna política RLS permite desde el cliente.
// Deploy: supabase functions deploy owner-panel

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!

// Única cuenta autorizada a usar este panel: una cuenta de Supabase
// Auth aparte, sin fila en `profiles` y sin pertenecer a ninguna
// organización (no es un admin más de una academia que gane acceso
// por su documento). Se identifica solo por su email fijo.
const OWNER_EMAIL = "1088593872@owner.dance.local"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

interface TogglePayload {
  action: "toggle_active"
  organization_id: string
  activo: boolean
}

interface ListPayload {
  action: "list"
}

interface DeletePayload {
  action: "delete_academia"
  organization_id: string
  // El dueño debe escribir el nombre exacto de la academia: una
  // confirmación real en el servidor, no solo un diálogo en pantalla.
  confirmar_nombre: string
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return json({ error: "No autorizado." }, 401)

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user: caller },
  } = await callerClient.auth.getUser()

  if (!caller) return json({ error: "No autorizado." }, 401)

  if (caller.email !== OWNER_EMAIL) {
    return json({ error: "No tienes acceso a este panel." }, 403)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const payload: ListPayload | TogglePayload | DeletePayload = await req.json()

  if (payload.action === "delete_academia") {
    const { data: organizacion, error: errorOrg } = await admin
      .from("organizations")
      .select("nombre")
      .eq("id", payload.organization_id)
      .single()

    if (errorOrg || !organizacion) return json({ error: "La academia no existe." }, 404)

    if (payload.confirmar_nombre?.trim() !== organizacion.nombre) {
      return json({ error: "El nombre escrito no coincide con el de la academia." }, 400)
    }

    const { data: perfiles, error: errorPerfiles } = await admin
      .from("profiles")
      .select("id")
      .eq("organization_id", payload.organization_id)

    if (errorPerfiles) return json({ error: errorPerfiles.message }, 400)

    // Borra todo lo que cuelga de la organización (clases, pagos,
    // liquidaciones, etc.) en el orden correcto para no violar ninguna
    // llave foránea. Ver supabase/migrations/0048_eliminar_organizacion.sql.
    const { error: errorRpc } = await admin.rpc("eliminar_organizacion", {
      p_organization_id: payload.organization_id,
    })
    if (errorRpc) return json({ error: errorRpc.message }, 400)

    // Borrar el usuario de Auth elimina en cascada su fila de profiles
    // (y de ahí students/teachers, ya vacíos de todas formas).
    for (const perfil of perfiles ?? []) {
      const { error: errorUsuario } = await admin.auth.admin.deleteUser(perfil.id)
      if (errorUsuario && !errorUsuario.message.toLowerCase().includes("not found")) {
        return json(
          { error: `La academia quedó parcialmente borrada: ${errorUsuario.message}` },
          400,
        )
      }
    }

    const { error: errorBorrarOrg } = await admin
      .from("organizations")
      .delete()
      .eq("id", payload.organization_id)

    if (errorBorrarOrg) return json({ error: errorBorrarOrg.message }, 400)

    return json({ ok: true })
  }

  if (payload.action === "toggle_active") {
    const { error } = await admin
      .from("organizations")
      .update({ activo: payload.activo })
      .eq("id", payload.organization_id)

    if (error) return json({ error: error.message }, 400)
    return json({ ok: true })
  }

  if (payload.action === "list") {
    const { data: organizaciones, error: errorOrgs } = await admin
      .from("organizations")
      .select("id, nombre, codigo, activo, created_at")
      .order("created_at", { ascending: false })

    if (errorOrgs) return json({ error: errorOrgs.message }, 400)

    const academias = await Promise.all(
      (organizaciones ?? []).map(async (org) => {
        const [alumnos, profesores, admins] = await Promise.all([
          admin
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", org.id),
          admin
            .from("teachers")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", org.id),
          admin
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", org.id)
            .eq("rol", "admin"),
        ])

        return {
          id: org.id,
          nombre: org.nombre,
          codigo: org.codigo,
          activo: org.activo,
          created_at: org.created_at,
          alumnos: alumnos.count ?? 0,
          profesores: profesores.count ?? 0,
          admins: admins.count ?? 0,
        }
      }),
    )

    const hace30Dias = new Date()
    hace30Dias.setDate(hace30Dias.getDate() - 30)

    const totales = {
      academias: academias.length,
      alumnos: academias.reduce((suma, a) => suma + a.alumnos, 0),
      profesores: academias.reduce((suma, a) => suma + a.profesores, 0),
      altas_30_dias: (organizaciones ?? []).filter(
        (org) => new Date(org.created_at) >= hace30Dias,
      ).length,
    }

    return json({ academias, totales })
  }

  return json({ error: "Acción inválida." }, 400)
})
