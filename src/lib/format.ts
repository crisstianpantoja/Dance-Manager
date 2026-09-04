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
