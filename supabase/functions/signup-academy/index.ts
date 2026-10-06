// Edge Function: registro público de una academia nueva (tenant) junto
// con su primer usuario admin. A propósito no exige sesión previa: es
// el punto de entrada para que una academia que nunca ha usado Dance
// Manager pueda crear su propia cuenta sin que nadie la dé de alta a
// mano desde Supabase.
// Deploy: supabase functions deploy signup-academy --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const AUTH_EMAIL_DOMAIN = "dance.local"

// Mismo esquema que src/lib/supabase.ts (los edge functions se
// despliegan aparte y no pueden importar del frontend).
const CODIGO_ACADEMIA_PRINCIPAL = "principal"

function documentoToEmail(documento: string, codigoAcademia: string) {
  const doc = documento.trim()
  const codigo = codigoAcademia.trim().toLowerCase()

  if (codigo === CODIGO_ACADEMIA_PRINCIPAL) {
    return `${doc}@${AUTH_EMAIL_DOMAIN}`
  }

  return `${doc}@${codigo}.${AUTH_EMAIL_DOMAIN}`
}

function normalizarCodigo(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
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

interface SignupPayload {
  nombre_academia: string
  codigo_academia: string
  admin_nombre: string
  admin_documento: string
  admin_password: string
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const payload: SignupPayload = await req.json()

  const nombreAcademia = (payload.nombre_academia ?? "").trim()
  const adminNombre = (payload.admin_nombre ?? "").trim()
  const adminDocumento = (payload.admin_documento ?? "").trim()
  const adminPassword = payload.admin_password ?? ""
  const codigo = normalizarCodigo(payload.codigo_academia ?? "")

  if (!nombreAcademia || !adminNombre || !adminDocumento || !adminPassword) {
    return json({ error: "Completa todos los campos." }, 400)
  }
  if (codigo.length < 3) {
    return json(
      { error: "El código de academia debe tener al menos 3 caracteres (letras, números o guiones)." },
      400,
    )
  }
  if (codigo === CODIGO_ACADEMIA_PRINCIPAL) {
    return json({ error: "Ese código de academia no está disponible." }, 400)
  }
  if (adminPassword.length < 6) {
    return json({ error: "La contraseña debe tener al menos 6 caracteres." }, 400)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: existente } = await admin
    .from("organizations")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle()

  if (existente) {
    return json({ error: "Ese código de academia ya está en uso. Elige otro." }, 409)
  }

  const { data: organizacion, error: errorOrg } = await admin
    .from("organizations")
    .insert({ nombre: nombreAcademia, codigo })
    .select()
    .single()

  if (errorOrg || !organizacion) {
    return json({ error: errorOrg?.message ?? "No se pudo crear la academia." }, 400)
  }

  const email = documentoToEmail(adminDocumento, codigo)

  const { data: nuevoUsuario, error: errorAuth } = await admin.auth.admin.createUser({
    email,
    password: adminPassword,
    email_confirm: true,
  })

  if (errorAuth || !nuevoUsuario.user) {
    await admin.from("app_settings").delete().eq("organization_id", organizacion.id)
    await admin.from("organizations").delete().eq("id", organizacion.id)
    return json({ error: errorAuth?.message ?? "No se pudo crear el usuario administrador." }, 400)
  }

  const userId = nuevoUsuario.user.id

  const { error: errorPerfil } = await admin.from("profiles").insert({
    id: userId,
    documento: adminDocumento,
    nombre: adminNombre,
    rol: "admin",
    organization_id: organizacion.id,
  })

  if (errorPerfil) {
    await admin.auth.admin.deleteUser(userId)
    await admin.from("app_settings").delete().eq("organization_id", organizacion.id)
    await admin.from("organizations").delete().eq("id", organizacion.id)
    return json({ error: errorPerfil.message }, 400)
  }

  return json({ organization_id: organizacion.id, codigo })
})
