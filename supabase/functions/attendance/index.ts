// Edge Function: registra y anula asistencias siguiendo exactamente la
// lógica de negocio de la sección 7 (elegirPlan, registrarAsistencia,
// desacople privada/grupo, doble escaneo, anular). Corre con la service
// role porque, por regla del RLS, nadie escribe attendance_records ni
// payments desde el cliente — ni siquiera el admin.
// Deploy: supabase functions deploy attendance

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

type ClaseTipo = "academia" | "programada" | "sesion" | "evento" | "manual"
type Origen = "qr" | "manual"

interface RegisterPayload {
  action: "register"
  alumno_id: string
  origen: Origen
  clase: {
    clase_tipo: ClaseTipo
    clase_id?: string | null
    titulo: string
    categoria?: string | null
    fecha: string // YYYY-MM-DD
    hora: string // HH:mm
    academia_id?: string | null
  }
}

interface AnularPayload {
  action: "anular"
  attendance_id: string
}

interface Plan {
  id: string
  modalidad: string
  clases_incluidas: number
  clases_usadas: number
  fecha: string
  fecha_vencimiento: string | null
}

function noVencido(plan: Plan, hoy: string) {
  return !plan.fecha_vencimiento || plan.fecha_vencimiento >= hoy
}

function clasesRestantes(plan: Plan) {
  return Math.max(0, plan.clases_incluidas - plan.clases_usadas)
}

function elegirPlan(planes: Plan[], hoy: string) {
  const cobrables = planes // ya vienen filtrados por estado='pagado'

  const conCupo = cobrables
    .filter((p) => p.modalidad !== "ilimitada" && noVencido(p, hoy) && clasesRestantes(p) > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  if (conCupo.length > 0) {
    return { estado: "cupo" as const, consume: true, plan: conCupo[0] }
  }

  const ilimitados = cobrables
    .filter((p) => p.modalidad === "ilimitada" && noVencido(p, hoy))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  if (ilimitados.length > 0) {
    return { estado: "ilimitada" as const, consume: false, plan: ilimitados[0] }
  }

  const hayCuposAgotados = cobrables.some(
    (p) => p.modalidad !== "ilimitada" && noVencido(p, hoy) && clasesRestantes(p) === 0,
  )
  if (hayCuposAgotados) return { estado: "sin_cupo" as const, consume: false, plan: null }

  const hayVencidos = cobrables.some((p) => !noVencido(p, hoy))
  if (hayVencidos) return { estado: "vencido" as const, consume: false, plan: null }

  return { estado: "sin_plan" as const, consume: false, plan: null }
}

function construirClaseKey(alumnoId: string, clase: RegisterPayload["clase"]) {
  if (clase.clase_tipo === "manual") {
    return `M:${alumnoId}:${clase.fecha}:${clase.hora}`
  }
  if (clase.clase_id) return `O:${clase.clase_id}`
  return `${clase.clase_tipo}:${alumnoId}:${clase.fecha}:${clase.hora}`
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

  if (!callerProfile || !["admin", "profesor"].includes(callerProfile.rol)) {
    return json(
      { error: "Solo un admin o profesor puede registrar/anular asistencia." },
      403,
    )
  }

  const organizationId = callerProfile.organization_id

  const payload: RegisterPayload | AnularPayload = await req.json()

  if (payload.action === "register") {
    const { alumno_id, clase, origen } = payload

    const { data: alumno } = await admin
      .from("students")
      .select("id, tipo")
      .eq("id", alumno_id)
      .eq("organization_id", organizationId)
      .single()

    if (!alumno) return json({ error: "Alumno no encontrado." }, 404)

    // Backstop: una privada nunca se registra en una clase de grupo.
    if (
      alumno.tipo === "privada" &&
      ["academia", "programada", "sesion"].includes(clase.clase_tipo)
    ) {
      return json(
        { error: "Este alumno tiene plan privado: no puede registrarse en una clase grupal." },
        400,
      )
    }

    const claseKey = construirClaseKey(alumno_id, clase)

    const { data: duplicado } = await admin
      .from("attendance_records")
      .select("id")
      .eq("alumno_id", alumno_id)
      .eq("clase_key", claseKey)
      .eq("anulado", false)
      .maybeSingle()

    if (duplicado) {
      return json({ error: "Este alumno ya tiene asistencia registrada en esta clase." }, 409)
    }

    const hoy = clase.fecha
    const { data: planesPagados } = await admin
      .from("payments")
      .select("id, modalidad, clases_incluidas, clases_usadas, fecha, fecha_vencimiento")
      .eq("alumno_id", alumno_id)
      .eq("estado", "pagado")

    const eleccion = elegirPlan((planesPagados as Plan[]) ?? [], hoy)

    const { data: registro, error: errorInsert } = await admin
      .from("attendance_records")
      .insert({
        alumno_id,
        clase_key: claseKey,
        clase_tipo: clase.clase_tipo,
        clase_id: clase.clase_id ?? null,
        fecha: clase.fecha,
        hora: clase.hora,
        titulo: clase.titulo,
        categoria: clase.categoria ?? null,
        origen,
        academia_id: clase.academia_id ?? null,
        consumio_cupo: eleccion.consume,
        estado_plan: eleccion.estado,
        payment_id: eleccion.plan?.id ?? null,
        organization_id: organizationId,
      })
      .select()
      .single()

    if (errorInsert) return json({ error: errorInsert.message }, 400)

    if (eleccion.consume && eleccion.plan) {
      await admin
        .from("payments")
        .update({ clases_usadas: eleccion.plan.clases_usadas + 1 })
        .eq("id", eleccion.plan.id)
    }

    return json({ registro, estado_plan: eleccion.estado })
  }

  if (payload.action === "anular") {
    const { data: registro } = await admin
      .from("attendance_records")
      .select("*")
      .eq("id", payload.attendance_id)
      .eq("organization_id", organizationId)
      .single()

    if (!registro) return json({ error: "Registro no encontrado." }, 404)
    if (registro.anulado) return json({ ok: true })

    const { error: errorUpdate } = await admin
      .from("attendance_records")
      .update({ anulado: true })
      .eq("id", registro.id)

    if (errorUpdate) return json({ error: errorUpdate.message }, 400)

    if (registro.consumio_cupo && registro.payment_id) {
      const { data: plan } = await admin
        .from("payments")
        .select("clases_usadas")
        .eq("id", registro.payment_id)
        .single()

      if (plan) {
        await admin
          .from("payments")
          .update({ clases_usadas: Math.max(0, plan.clases_usadas - 1) })
          .eq("id", registro.payment_id)
      }
    }

    return json({ ok: true })
  }

  return json({ error: "Acción inválida." }, 400)
})
