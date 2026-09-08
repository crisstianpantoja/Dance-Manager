// Edge Function: asistente de IA para el admin. Responde preguntas en
// lenguaje natural sobre 3 temas — retención, finanzas y ocupación de
// clases — usando SIEMPRE datos reales de la organización de quien
// pregunta (nunca inventa cifras). Corre con service role porque calcula
// datos de varias tablas protegidas por RLS; la organización se toma del
// perfil del que llama, nunca del cliente.
// Deploy: supabase functions deploy admin-assistant
// Requiere el secreto ANTHROPIC_API_KEY (supabase secrets set ANTHROPIC_API_KEY=sk-ant-...)

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")
const MODELO_IA = "claude-sonnet-5"

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

function fechaISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10)
}

// ===== Retención: misma lógica que src/lib/retention.ts (Edge Functions
// no pueden importar código del frontend, así que se duplica aquí). =====
interface PagoConAlumno {
  alumno_id: string
  fecha_vencimiento: string | null
  nombre: string
}

function calcularAlumnosSinRenovar(pagos: PagoConAlumno[], hoy: string) {
  const porAlumno = new Map<string, PagoConAlumno[]>()
  for (const pago of pagos) {
    const lista = porAlumno.get(pago.alumno_id) ?? []
    lista.push(pago)
    porAlumno.set(pago.alumno_id, lista)
  }

  const resultado: { nombre: string; fechaVencimiento: string; diasVencido: number }[] = []

  for (const planes of porAlumno.values()) {
    const tieneVigente = planes.some((p) => !p.fecha_vencimiento || p.fecha_vencimiento >= hoy)
    if (tieneVigente) continue

    const vencidos = planes.filter((p) => p.fecha_vencimiento) as (PagoConAlumno & {
      fecha_vencimiento: string
    })[]
    if (vencidos.length === 0) continue

    const masReciente = vencidos.reduce((a, b) => (a.fecha_vencimiento > b.fecha_vencimiento ? a : b))
    const diasVencido = Math.floor(
      (new Date(`${hoy}T00:00:00`).getTime() - new Date(`${masReciente.fecha_vencimiento}T00:00:00`).getTime()) /
        (1000 * 60 * 60 * 24),
    )
    resultado.push({ nombre: masReciente.nombre, fechaVencimiento: masReciente.fecha_vencimiento, diasVencido })
  }

  return resultado.sort((a, b) => b.diasVencido - a.diasVencido)
}

async function resumenRetencion(admin: ReturnType<typeof createClient>, organizationId: string, hoy: string) {
  const { data } = await admin
    .from("payments")
    .select("alumno_id, fecha_vencimiento, students(nombre)")
    .eq("organization_id", organizationId)
    .eq("estado", "pagado")

  type Fila = { alumno_id: string; fecha_vencimiento: string | null; students: { nombre: string } | null }
  const pagos = ((data as Fila[] | null) ?? []).map((p) => ({
    alumno_id: p.alumno_id,
    fecha_vencimiento: p.fecha_vencimiento,
    nombre: p.students?.nombre ?? "Alumno",
  }))

  const sinRenovar = calcularAlumnosSinRenovar(pagos, hoy)
  return {
    total_alumnos_sin_renovar: sinRenovar.length,
    top_10_mas_vencidos: sinRenovar.slice(0, 10),
  }
}

async function resumenFinanciero(admin: ReturnType<typeof createClient>, organizationId: string, hoy: string) {
  const hace30Dias = fechaISO(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))

  const [{ data: pagos }, { data: gastos }, { data: gigs }] = await Promise.all([
    admin
      .from("payments")
      .select("monto")
      .eq("organization_id", organizationId)
      .eq("estado", "pagado")
      .gte("fecha", hace30Dias)
      .lte("fecha", hoy),
    admin.from("expenses").select("monto").eq("organization_id", organizationId).gte("fecha", hace30Dias).lte("fecha", hoy),
    admin
      .from("gigs")
      .select("pago, pago_acompanante")
      .eq("organization_id", organizationId)
      .eq("estado", "pagado")
      .gte("fecha", hace30Dias)
      .lte("fecha", hoy),
  ])

  const ingresosMembresias = ((pagos as { monto: number }[] | null) ?? []).reduce((acc, p) => acc + Number(p.monto), 0)
  const totalGastos = ((gastos as { monto: number }[] | null) ?? []).reduce((acc, g) => acc + Number(g.monto), 0)
  const totalContratos = ((gigs as { pago: number; pago_acompanante: number | null }[] | null) ?? []).reduce(
    (acc, g) => acc + Number(g.pago) + Number(g.pago_acompanante ?? 0),
    0,
  )

  return {
    periodo: `${hace30Dias} a ${hoy}`,
    ingresos_por_membresias_cop: ingresosMembresias,
    gastos_cop: totalGastos,
    pagos_a_contratos_cop: totalContratos,
    balance_cop: ingresosMembresias - totalGastos - totalContratos,
  }
}

async function resumenOcupacion(admin: ReturnType<typeof createClient>, organizationId: string, hoy: string) {
  const hace14Dias = fechaISO(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))

  const [{ data: series }, { data: ocurrencias }] = await Promise.all([
    admin
      .from("class_series")
      .select("id, titulo, cupo_maximo")
      .eq("organization_id", organizationId),
    admin
      .from("class_occurrences")
      .select("serie_id, alumno_ids")
      .eq("organization_id", organizationId)
      .eq("estado", "programada")
      .gte("fecha", hace14Dias)
      .lte("fecha", hoy),
  ])

  type Serie = { id: string; titulo: string; cupo_maximo: number | null }
  type Ocurrencia = { serie_id: string; alumno_ids: string[] }

  const porSerie = new Map<string, number[]>()
  for (const oc of (ocurrencias as Ocurrencia[] | null) ?? []) {
    const lista = porSerie.get(oc.serie_id) ?? []
    lista.push(oc.alumno_ids?.length ?? 0)
    porSerie.set(oc.serie_id, lista)
  }

  const resultado = ((series as Serie[] | null) ?? [])
    .filter((s) => s.cupo_maximo && porSerie.has(s.id))
    .map((s) => {
      const inscritos = porSerie.get(s.id) ?? []
      const promedio = inscritos.reduce((a, b) => a + b, 0) / inscritos.length
      return {
        clase: s.titulo,
        cupo_maximo: s.cupo_maximo,
        promedio_inscritos_ultimos_14_dias: Math.round(promedio * 10) / 10,
        ocupacion_pct: Math.round((promedio / (s.cupo_maximo ?? 1)) * 100),
      }
    })
    .sort((a, b) => a.ocupacion_pct - b.ocupacion_pct)

  return {
    clases_con_menor_ocupacion: resultado.slice(0, 5),
    clases_casi_llenas_o_llenas: resultado.filter((r) => r.ocupacion_pct >= 90),
  }
}

const SYSTEM_PROMPT = `Eres el asistente de IA del panel de administración de Dance Manager, una app para academias de baile.

Solo puedes responder preguntas sobre estos 3 temas, usando EXCLUSIVAMENTE los datos reales que se te dan a continuación en JSON. Nunca inventes cifras, nombres o datos que no estén en el JSON.

Si la pregunta no se puede responder con estos 3 conjuntos de datos (retención, finanzas de los últimos 30 días, ocupación de clases de los últimos 14 días), dilo claramente en una frase y sugiere que use el módulo correspondiente del panel en vez de inventar una respuesta.

Responde en español, en tono profesional y directo, breve (máximo un párrafo corto o una lista corta). Los montos están en pesos colombianos (COP).`

async function preguntarIA(pregunta: string, datos: unknown): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "El asistente de IA no está configurado todavía: falta la variable ANTHROPIC_API_KEY en Supabase.",
    )
  }

  const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODELO_IA,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Datos disponibles (JSON):\n${JSON.stringify(datos)}\n\nPregunta del admin: ${pregunta}`,
        },
      ],
    }),
  })

  if (!respuesta.ok) {
    const detalle = await respuesta.text()
    throw new Error(`No se pudo obtener respuesta de la IA (${respuesta.status}): ${detalle}`)
  }

  const cuerpo = await respuesta.json()
  const texto = cuerpo?.content?.[0]?.text
  if (typeof texto !== "string") throw new Error("La IA no devolvió una respuesta de texto.")
  return texto
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

  if (!callerProfile || callerProfile.rol !== "admin" || !callerProfile.organization_id) {
    return json({ error: "Solo un admin puede usar el asistente." }, 403)
  }

  const { pregunta } = (await req.json()) as { pregunta?: string }
  if (!pregunta || !pregunta.trim()) return json({ error: "Escribe una pregunta." }, 400)

  const organizationId = callerProfile.organization_id as string
  const hoy = fechaISO(new Date())

  try {
    const [retencion, finanzas, ocupacion] = await Promise.all([
      resumenRetencion(admin, organizationId, hoy),
      resumenFinanciero(admin, organizationId, hoy),
      resumenOcupacion(admin, organizationId, hoy),
    ])

    const respuesta = await preguntarIA(pregunta, { retencion, finanzas, ocupacion })
    return json({ respuesta })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Error inesperado." }, 500)
  }
})
