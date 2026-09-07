// Edge Function: genera el enlace para "Guardar en Google Wallet" del
// carnet del propio alumno. Crea/actualiza el objeto en Google Wallet vía
// su API REST (autenticado con la cuenta de servicio) y firma un JWT de
// referencia para el enlace de guardado. El alumno solo puede pedir su
// propio carnet (auth.uid() = students.id).
// Deploy: supabase functions deploy wallet-pass

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!

const WALLET_ISSUER_ID = Deno.env.get("GOOGLE_WALLET_ISSUER_ID")!
const WALLET_CLASS_SUFFIX = Deno.env.get("GOOGLE_WALLET_CLASS_SUFFIX") || "carnet_alumno"
const WALLET_SERVICE_ACCOUNT_EMAIL = Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL")!
const WALLET_PRIVATE_KEY = Deno.env.get("GOOGLE_WALLET_PRIVATE_KEY")!
const WALLET_ORIGIN = Deno.env.get("GOOGLE_WALLET_ORIGIN") || "https://dance-manager-woad.vercel.app"

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

// Mismos temas que src/lib/carnet.ts (los edge functions se despliegan
// aparte y no pueden importar del frontend).
const TEMA_HEX: Record<string, string> = {
  purple: "#9542DF",
  magenta: "#F72585",
  cyan: "#37D9A6",
  amber: "#F5B841",
}

function hexDeTema(id: string | null) {
  return TEMA_HEX[id ?? ""] ?? TEMA_HEX.purple
}

const TIPO_LABEL: Record<string, string> = {
  academia: "Academia",
  privada: "Privada",
  ambas: "Academia + privada",
}

function base64url(bytes: Uint8Array): string {
  let binario = ""
  for (const byte of bytes) binario += String.fromCharCode(byte)
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64urlDeTexto(texto: string): string {
  return base64url(new TextEncoder().encode(texto))
}

async function importarLlavePrivada(pem: string): Promise<CryptoKey> {
  const cuerpo = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    // El valor "private_key" del JSON trae \n literales (dos caracteres,
    // no un salto de línea real) al pegarlo tal cual en un secreto.
    .replace(/\\n/g, "")
    .replace(/\s+/g, "")
  const binario = Uint8Array.from(atob(cuerpo), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    "pkcs8",
    binario,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )
}

async function firmarJWT(payload: unknown, llavePem: string): Promise<string> {
  const encabezado = base64urlDeTexto(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const cuerpo = base64urlDeTexto(JSON.stringify(payload))
  const entrada = `${encabezado}.${cuerpo}`

  const llave = await importarLlavePrivada(llavePem)
  const firma = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    llave,
    new TextEncoder().encode(entrada),
  )

  return `${entrada}.${base64url(new Uint8Array(firma))}`
}

async function obtenerAccessToken(): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000)
  const claims = {
    iss: WALLET_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    iat: ahora,
    exp: ahora + 3600,
  }
  const assertion = await firmarJWT(claims, WALLET_PRIVATE_KEY)

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`No se pudo autenticar con Google (${res.status}): ${JSON.stringify(data)}`)
  }
  return data.access_token as string
}

interface ResultadoUpsert {
  ok: boolean
  accion: string
  status?: number
  error?: unknown
}

async function upsertGenericObject(
  token: string,
  objeto: Record<string, unknown>,
): Promise<ResultadoUpsert> {
  const base = "https://walletobjects.googleapis.com/walletobjects/v1/genericObject"

  const insertRes = await fetch(base, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(objeto),
  })

  if (insertRes.ok) return { ok: true, accion: "insert" }

  if (insertRes.status !== 409) {
    return { ok: false, accion: "insert", status: insertRes.status, error: await insertRes.json() }
  }

  const patchRes = await fetch(`${base}/${objeto.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(objeto),
  })

  if (!patchRes.ok) {
    return { ok: false, accion: "patch", status: patchRes.status, error: await patchRes.json() }
  }

  return { ok: true, accion: "patch" }
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

  const { data: alumno } = await admin
    .from("students")
    .select("*")
    .eq("id", caller.id)
    .single()

  if (!alumno) return json({ error: "No se encontró tu ficha de alumno." }, 404)

  const tema = hexDeTema(alumno.tema_carnet)
  const objectId = `${WALLET_ISSUER_ID}.${alumno.id}`
  const classId = `${WALLET_ISSUER_ID}.${WALLET_CLASS_SUFFIX}`

  const genericObject = {
    id: objectId,
    classId,
    genericType: "GENERIC_TYPE_UNSPECIFIED",
    hexBackgroundColor: tema,
    cardTitle: { defaultValue: { language: "es", value: "Dance Manager" } },
    header: { defaultValue: { language: "es", value: alumno.nombre } },
    subheader: { defaultValue: { language: "es", value: alumno.nivel } },
    textModulesData: [
      { id: "documento", header: "Documento", body: alumno.documento },
      { id: "tipo", header: "Tipo", body: TIPO_LABEL[alumno.tipo] ?? alumno.tipo },
    ],
    barcode: {
      type: "QR_CODE",
      value: alumno.documento,
      alternateText: alumno.documento,
    },
  }

  try {
    const token = await obtenerAccessToken()
    const resultado = await upsertGenericObject(token, genericObject)

    if (!resultado.ok) {
      return json(
        {
          error: `Google rechazó el carnet (${resultado.accion}, status ${resultado.status}): ${JSON.stringify(resultado.error)}`,
        },
        400,
      )
    }

    const jwt = await firmarJWT(
      {
        iss: WALLET_SERVICE_ACCOUNT_EMAIL,
        aud: "google",
        typ: "savetowallet",
        origins: [WALLET_ORIGIN],
        iat: Math.floor(Date.now() / 1000),
        payload: { genericObjects: [{ id: objectId }] },
      },
      WALLET_PRIVATE_KEY,
    )

    return json({ saveUrl: `https://pay.google.com/gp/v/save/${jwt}` })
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "No se pudo generar el carnet de Wallet." },
      500,
    )
  }
})
