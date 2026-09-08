import { aFechaISO } from "@/lib/calendarGrid"

export type Periodo = "hoy" | "semana" | "mes" | "mes_anterior" | "3m" | "6m" | "anio"

export const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "mes_anterior", label: "Mes anterior" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "anio", label: "Este año" },
]

export interface RangoFechas {
  desde: string
  hasta: string
}

function restarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha)
  copia.setDate(copia.getDate() - dias)
  return copia
}

/** Rango de fechas (inclusive) representado por cada opción de periodo del Dashboard. */
export function rangoDePeriodo(periodo: Periodo, hoy = new Date()): RangoFechas {
  const hastaHoy = aFechaISO(hoy)

  switch (periodo) {
    case "hoy":
      return { desde: hastaHoy, hasta: hastaHoy }

    case "semana": {
      const diaSemana = hoy.getDay()
      const diffLunes = diaSemana === 0 ? 6 : diaSemana - 1
      return { desde: aFechaISO(restarDias(hoy, diffLunes)), hasta: hastaHoy }
    }

    case "mes": {
      const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      return { desde: aFechaISO(desde), hasta: hastaHoy }
    }

    case "mes_anterior": {
      const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      return { desde: aFechaISO(desde), hasta: aFechaISO(hasta) }
    }

    case "3m":
      return { desde: aFechaISO(restarDias(hoy, 90)), hasta: hastaHoy }

    case "6m":
      return { desde: aFechaISO(restarDias(hoy, 180)), hasta: hastaHoy }

    case "anio": {
      const desde = new Date(hoy.getFullYear(), 0, 1)
      return { desde: aFechaISO(desde), hasta: hastaHoy }
    }
  }
}
