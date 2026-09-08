/** Construcción de la grilla de un calendario mensual (7 columnas, semanas completas). */

export const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const

export const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const

export interface CeldaCalendario {
  fecha: string
  dia: number
  enMes: boolean
  esHoy: boolean
}

export function aFechaISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(
    fecha.getDate(),
  ).padStart(2, "0")}`
}

export function construirGrillaMensual(anio: number, mes: number): CeldaCalendario[] {
  const primerDia = new Date(anio, mes, 1)
  const ultimoDia = new Date(anio, mes + 1, 0)
  const inicioGrilla = new Date(primerDia)
  inicioGrilla.setDate(inicioGrilla.getDate() - primerDia.getDay())
  const finGrilla = new Date(ultimoDia)
  finGrilla.setDate(finGrilla.getDate() + (6 - ultimoDia.getDay()))

  const hoyISO = aFechaISO(new Date())
  const celdas: CeldaCalendario[] = []
  const cursor = new Date(inicioGrilla)
  while (cursor <= finGrilla) {
    const fechaISO = aFechaISO(cursor)
    celdas.push({
      fecha: fechaISO,
      dia: cursor.getDate(),
      enMes: cursor.getMonth() === mes,
      esHoy: fechaISO === hoyISO,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return celdas
}

export function primerDiaDelMesActual(): Date {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
}

export function mesAnterior(mes: Date): Date {
  return new Date(mes.getFullYear(), mes.getMonth() - 1, 1)
}

export function mesSiguiente(mes: Date): Date {
  return new Date(mes.getFullYear(), mes.getMonth() + 1, 1)
}
