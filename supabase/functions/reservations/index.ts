// Edge Function: reservar/cancelar cupo en una clase (class_occurrences)
// o en un evento (events). class_occurrences es una de las tablas
// admin-only de la sección 5, así que el alumno no puede tocar
// alumno_ids desde el cliente: esta función valida cupo disponible y
// que el alumno solo se reserve o cancele a sí mismo.
// Deploy: supabase functions deploy reservations

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

type Accion = "reservar_clase" | "cancelar_clase" | "reservar_evento" | "cancelar_evento"

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

  const { accion, id }: { accion: Accion; id: string } = await req.json()

  if (accion === "reservar_clase" || accion === "cancelar_clase") {
    const { data: ocurrencia } = await admin
      .from("class_occurrences")
      .select("id, alumno_ids, estado, class_series(cupo_maximo)")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single()

    if (!ocurrencia) return json({ error: "Clase no encontrada." }, 404)
    if (ocurrencia.estado === "cancelada") {
      return json({ error: "Esta clase fue cancelada." }, 400)
    }

    const yaReservado = ocurrencia.alumno_ids.includes(caller.id)
    let nuevosAlumnoIds: string[]

    if (accion === "reservar_clase") {
      if (yaReservado) return json({ ok: true })

      const cupoMaximo = (ocurrencia.class_series as { cupo_maximo: number | null } | null)
        ?.cupo_maximo
      if (cupoMaximo && ocurrencia.alumno_ids.length >= cupoMaximo) {
        return json({ error: "Ya no hay cupos disponibles para esta clase." }, 400)
      }

      nuevosAlumnoIds = [...ocurrencia.alumno_ids, caller.id]
    } else {
      nuevosAlumnoIds = ocurrencia.alumno_ids.filter((a: string) => a !== caller.id)
    }

    const { error } = await admin
      .from("class_occurrences")
      .update({ alumno_ids: nuevosAlumnoIds })
      .eq("id", id)

    if (error) return json({ error: error.message }, 400)
    return json({ ok: true })
  }

  if (accion === "reservar_evento" || accion === "cancelar_evento") {
    // NOTA: "events" todavía no tiene organization_id (es parte de la
    // siguiente tanda de migraciones); se actualizará este filtro cuando
    // esa columna exista.
    const { data: evento } = await admin
      .from("events")
      .select("id, reservas, cupo_maximo")
      .eq("id", id)
      .single()

    if (!evento) return json({ error: "Evento no encontrado." }, 404)

    const yaReservado = evento.reservas.includes(caller.id)
    let nuevasReservas: string[]

    if (accion === "reservar_evento") {
      if (yaReservado) return json({ ok: true })

      if (evento.cupo_maximo && evento.reservas.length >= evento.cupo_maximo) {
        return json({ error: "Ya no hay cupos disponibles para este evento." }, 400)
      }

      nuevasReservas = [...evento.reservas, caller.id]
    } else {
      nuevasReservas = evento.reservas.filter((a: string) => a !== caller.id)
    }

    const { error } = await admin
      .from("events")
      .update({ reservas: nuevasReservas })
      .eq("id", id)

    if (error) return json({ error: error.message }, 400)
    return json({ ok: true })
  }

  return json({ error: "Acción inválida." }, 400)
})
