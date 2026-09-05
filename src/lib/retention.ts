interface PagoConAlumno {
  alumno_id: string
  fecha_vencimiento: string | null
  students: { nombre: string; contacto: string | null } | null
}

export interface AlumnoSinRenovar {
  alumnoId: string
  nombre: string
  contacto: string | null
  fechaVencimiento: string
  diasVencido: number
}

/**
 * Alumnos con al menos un plan pagado ya vencido y ningún plan pagado
 * vigente (ilimitada sin vencimiento, o fecha_vencimiento >= hoy) — o
 * sea, vencieron y no han renovado.
 */
export function calcularAlumnosSinRenovar(
  pagos: PagoConAlumno[],
  hoy: string,
): AlumnoSinRenovar[] {
  const porAlumno = new Map<string, PagoConAlumno[]>()

  for (const pago of pagos) {
    const lista = porAlumno.get(pago.alumno_id) ?? []
    lista.push(pago)
    porAlumno.set(pago.alumno_id, lista)
  }

  const resultado: AlumnoSinRenovar[] = []

  for (const [alumnoId, planes] of porAlumno) {
    const tieneVigente = planes.some(
      (p) => !p.fecha_vencimiento || p.fecha_vencimiento >= hoy,
    )
    if (tieneVigente) continue

    const vencidos = planes.filter((p) => p.fecha_vencimiento) as (PagoConAlumno & {
      fecha_vencimiento: string
    })[]
    if (vencidos.length === 0) continue

    const masReciente = vencidos.reduce((a, b) =>
      a.fecha_vencimiento > b.fecha_vencimiento ? a : b,
    )

    const diasVencido = Math.floor(
      (new Date(`${hoy}T00:00:00`).getTime() -
        new Date(`${masReciente.fecha_vencimiento}T00:00:00`).getTime()) /
        (1000 * 60 * 60 * 24),
    )

    resultado.push({
      alumnoId,
      nombre: masReciente.students?.nombre ?? "Alumno",
      contacto: masReciente.students?.contacto ?? null,
      fechaVencimiento: masReciente.fecha_vencimiento,
      diasVencido,
    })
  }

  return resultado.sort((a, b) => b.diasVencido - a.diasVencido)
}

export function construirEnlaceWhatsApp(
  contacto: string,
  nombre: string,
  fechaVencimiento: string,
) {
  const numero = contacto.replace(/[^0-9]/g, "")
  const mensaje = `Hola ${nombre}, notamos que tu plan en Dance Manager venció el ${fechaVencimiento} y aún no lo has renovado. ¿Te gustaría continuar con tus clases?`
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}
