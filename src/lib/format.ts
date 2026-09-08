/** Convención del negocio: una clase con cupo para 1 o 2 personas es una
 * sesión privada (ver flyer de precios); con más cupo (o sin límite) es
 * una clase grupal, donde sí aplica mostrar el nivel (Básica/Intermedia/
 * Avanzada). */
export function esClasePrivada(cupoMaximo: number | null): boolean {
  return cupoMaximo != null && cupoMaximo <= 2
}

const formateadorMoneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

export function formatearMoneda(valor: number) {
  return formateadorMoneda.format(valor)
}

const formateadorFecha = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

export function formatearFecha(valor: string | null) {
  if (!valor) return "—"
  return formateadorFecha.format(new Date(`${valor}T00:00:00`))
}

export function formatearFechaObjeto(fecha: Date) {
  return formateadorFecha.format(fecha)
}

const formateadorFechaLarga = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
})

export function formatearFechaLarga(valor: string) {
  return formateadorFechaLarga.format(new Date(`${valor}T00:00:00`))
}
