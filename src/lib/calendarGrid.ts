/** Construcción de la grilla de un calendario mensual (7 columnas, semanas completas). */

export const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const

export const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const

/** Igual que DIAS_CORTOS pero empezando en lunes, para la vista semanal. */
export const DIAS_CORTOS_DESDE_LUNES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const

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

/** Semana de lunes a domingo que contiene fechaBase. */
export function construirSemana(fechaBase: Date): CeldaCalendario[] {
  const diaSemana = fechaBase.getDay() // 0=domingo .. 6=sábado
  const offsetALunes = diaSemana === 0 ? -6 : 1 - diaSemana
  const lunes = new Date(fechaBase)
  lunes.setDate(lunes.getDate() + offsetALunes)

  const hoyISO = aFechaISO(new Date())
  const celdas: CeldaCalendario[] = []
  for (let i = 0; i < 7; i++) {
    const cursor = new Date(lunes)
    cursor.setDate(cursor.getDate() + i)
    const fechaISO = aFechaISO(cursor)
    celdas.push({ fecha: fechaISO, dia: cursor.getDate(), enMes: true, esHoy: fechaISO === hoyISO })
  }
  return celdas
}

export function semanaAnterior(fecha: Date): Date {
  const nueva = new Date(fecha)
  nueva.setDate(nueva.getDate() - 7)
  return nueva
}

export function semanaSiguiente(fecha: Date): Date {
  const nueva = new Date(fecha)
  nueva.setDate(nueva.getDate() + 7)
  return nueva
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
