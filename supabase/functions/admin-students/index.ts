// Edge Function: crea o elimina el usuario de Auth (+ perfil) de un alumno.
// Necesita la service role key, por eso no puede hacerse desde el cliente.
// Deploy: supabase functions deploy admin-students

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const AUTH_EMAIL_DOMAIN = "dance.local"

// La organización "principal" (el negocio original, antes de que
// existieran organizaciones) ya tiene sus usuarios en Supabase Auth
// como "documento@dance.local", sin prefijo: se mantiene así para no
// migrar ninguna cuenta existente. Toda organización nueva sí usa
// "documento@<codigo>.dance.local", evitando choques cuando dos
// academias tienen alumnos con el mismo número de documento. Mismo
// esquema que src/lib/supabase.ts (los edge functions se despliegan
// aparte y no pueden importar del frontend).
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
  foto?: string
  tipo: "academia" | "privada" | "ambas"
  nivel: "Básica" | "Intermedia" | "Avanzada"
  academia_id?: string | null
  password?: string
  confirm_attach?: boolean
}

// Prioridad de rol principal: al adjuntar un rol a una persona que ya
// tiene cuenta, profiles.rol solo sube (nunca baja), para que siga
// cumpliendo los chequeos de RLS que comparan current_user_role() con
// 'profesor'/'admin' en vez de exigir downgrade alguno.
const PRIORIDAD_ROL: Record<string, number> = { admin: 3, profesor: 2, alumno: 1 }

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
    const documento = payload.documento.trim()

    const { data: perfilExistente } = await admin
      .from("profiles")
      .select("id, nombre, rol")
      .eq("organization_id", organizationId)
      .eq("documento", documento)
      .maybeSingle()

    if (perfilExistente && !payload.confirm_attach) {
      return json({
        attach_candidate: {
          id: perfilExistente.id,
          nombre: perfilExistente.nombre,
          rol: perfilExistente.rol,
        },
      })
    }

    if (perfilExistente && payload.confirm_attach) {
      const { data: yaAlumno } = await admin
        .from("students")
        .select("id")
        .eq("id", perfilExistente.id)
        .maybeSingle()

      if (yaAlumno) {
        return json({ error: "Esta persona ya tiene el rol de alumno." }, 409)
      }

      const { error: errorAlumno } = await admin.from("students").insert({
        id: perfilExistente.id,
        nombre: payload.nombre,
        documento,
        contacto: payload.contacto ?? null,
        foto: payload.foto ?? null,
        tipo: payload.tipo,
        nivel: payload.nivel,
        academia_id: payload.academia_id ?? null,
        organization_id: organizationId,
      })

      if (errorAlumno) return json({ error: errorAlumno.message }, 400)

      if (PRIORIDAD_ROL["alumno"] > (PRIORIDAD_ROL[perfilExistente.rol] ?? 0)) {
        await admin.from("profiles").update({ rol: "alumno" }).eq("id", perfilExistente.id)
      }

      return json({ id: perfilExistente.id, attached: true })
    }

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
      rol: "alumno",
      organization_id: organizationId,
    })

    if (errorPerfil) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: errorPerfil.message }, 400)
    }

    const { error: errorAlumno } = await admin.from("students").insert({
      id: userId,
      nombre: payload.nombre,
      documento: payload.documento.trim(),
      contacto: payload.contacto ?? null,
      foto: payload.foto ?? null,
      tipo: payload.tipo,
      nivel: payload.nivel,
      academia_id: payload.academia_id ?? null,
      organization_id: organizationId,
    })

    if (errorAlumno) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: errorAlumno.message }, 400)
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
