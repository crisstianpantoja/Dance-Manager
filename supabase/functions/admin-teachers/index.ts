// Edge Function: crea o elimina el usuario de Auth (+ perfil) de un
// profesor. Mismo patrón que admin-students: necesita la service role,
// así que no puede hacerse desde el cliente.
// Deploy: supabase functions deploy admin-teachers

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const AUTH_EMAIL_DOMAIN = "dance.local"

// Mismo esquema que admin-students/index.ts y src/lib/supabase.ts: la
// organización "principal" mantiene "documento@dance.local" (sin
// prefijo, para no migrar ninguna cuenta existente); toda organización
// nueva usa "documento@<codigo>.dance.local".
const CODIGO_ACADEMIA_PRINCIPAL = "principal"

function documentoToEmail(documento: string, codigoAcademia: string) {
  const doc = documento.trim()
  const codigo = codigoAcademia.trim().toLowerCase()

  if (codigo === CODIGO_ACADEMIA_PRINCIPAL) {
    return `${doc}@${AUTH_EMAIL_DOMAIN}`
  }

  return `${doc}@${codigo}.${AUTH_EMAIL_DOMAIN}`
}

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

interface CreatePayload {
  action: "create"
  documento: string
  nombre: string
  contacto?: string
  rol_interno?: string
  foto?: string
  password?: string
}

interface DeletePayload {
  action: "delete"
  id: string
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

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("rol, organization_id")
    .eq("id", caller.id)
    .single()

  if (callerProfile?.rol !== "admin") {
    return json({ error: "Solo un administrador puede realizar esta acción." }, 403)
  }

  const organizationId = callerProfile.organization_id

  const { data: organizacion } = await admin
    .from("organizations")
    .select("codigo")
    .eq("id", organizationId)
    .single()

  if (!organizacion) return json({ error: "No se pudo resolver la organización." }, 400)

  const payload: CreatePayload | DeletePayload = await req.json()

  if (payload.action === "create") {
    const email = documentoToEmail(payload.documento, organizacion.codigo)

    const { data: nuevoUsuario, error: errorAuth } = await admin.auth.admin.createUser({
      email,
      password: payload.password || payload.documento.trim(),
      email_confirm: true,
    })

    if (errorAuth || !nuevoUsuario.user) {
      return json({ error: errorAuth?.message ?? "No se pudo crear el usuario." }, 400)
    }

    const userId = nuevoUsuario.user.id

    const { error: errorPerfil } = await admin.from("profiles").insert({
      id: userId,
      documento: payload.documento.trim(),
      nombre: payload.nombre,
      rol: "profesor",
      organization_id: organizationId,
    })

    if (errorPerfil) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: errorPerfil.message }, 400)
    }

    const { error: errorProfesor } = await admin.from("teachers").insert({
      id: userId,
      nombre: payload.nombre,
      documento: payload.documento.trim(),
      contacto: payload.contacto ?? null,
      rol_interno: payload.rol_interno ?? null,
      foto: payload.foto ?? null,
      organization_id: organizationId,
    })

    if (errorProfesor) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: errorProfesor.message }, 400)
    }

    return json({ id: userId })
  }

  if (payload.action === "delete") {
    const { error } = await admin.auth.admin.deleteUser(payload.id)
    if (error) return json({ error: error.message }, 400)
    return json({ ok: true })
  }

  return json({ error: "Acción inválida." }, 400)
})
