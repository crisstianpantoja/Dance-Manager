// Edge Function: el alumno reporta un pago (sube comprobante) y queda en
// estado "pendiente" hasta que el admin lo verifica. "payments" es una de
// las tablas con RLS admin-only de la sección 5, así que el propio alumno
// no puede insertar ahí desde el cliente: esta función lo hace con la
// service role, verificando que el alumno solo reporte pagos para sí
// mismo.
// Deploy: supabase functions deploy report-payment

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!

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

function sumarDias(fechaISO: string, dias: number) {
  const fecha = new Date(`${fechaISO}T00:00:00`)
  fecha.setDate(fecha.getDate() + dias)
  return fecha.toISOString().slice(0, 10)
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
    .select("organization_id")
    .eq("id", caller.id)
    .single()

  if (!callerProfile) return json({ error: "No autorizado." }, 401)

  const organizationId = callerProfile.organization_id

  const { plan_id, comprobante_url, metodo } = await req.json()

  if (!plan_id || !comprobante_url) {
    return json({ error: "Falta el plan o el comprobante." }, 400)
  }

  const { data: plan } = await admin
    .from("plans")
    .select("*")
    .eq("id", plan_id)
    .eq("activo", true)
    .eq("organization_id", organizationId)
    .single()

  if (!plan) return json({ error: "El plan no existe o ya no está disponible." }, 404)

  const hoy = new Date().toISOString().slice(0, 10)

  const { data: pago, error } = await admin
    .from("payments")
    .insert({
      alumno_id: caller.id,
      plan_id: plan.id,
      modalidad: plan.modalidad,
      concepto: plan.nombre,
      clases_incluidas: plan.clases_incluidas ?? 0,
      clases_usadas: 0,
      fecha: hoy,
      fecha_vencimiento: plan.dias_vigencia ? sumarDias(hoy, plan.dias_vigencia) : null,
      monto: plan.precio,
      estado: "pendiente",
      comprobante_url,
      metodo: metodo ?? null,
      organization_id: organizationId,
    })
    .select()
    .single()

  if (error) return json({ error: error.message }, 400)

  return json({ pago })
})
