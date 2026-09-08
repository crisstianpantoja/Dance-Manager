import type { NivelAlumno } from "@/types/student"

export type VarianteEtiquetaClase = "default" | "success" | "warning" | "error"

/** Etiqueta + color para una clase: "Privada" (morado) si algún alumno
 * inscrito tiene un plan pagado de modalidad "paquete_privado" (ver
 * lib/clasePrivada.ts), o el nivel con un color por dificultad
 * (verde/amarillo/rojo) si es una clase grupal. Devuelve null si no hay
 * nada que mostrar. */
export function etiquetaClase(
  nivel: NivelAlumno | null,
  esPrivada: boolean,
): { texto: string; variant: VarianteEtiquetaClase } | null {
  if (esPrivada) return { texto: "Privada", variant: "default" }
  if (nivel === "Básica") return { texto: "Básica", variant: "success" }
  if (nivel === "Intermedia") return { texto: "Intermedia", variant: "warning" }
  if (nivel === "Avanzada") return { texto: "Avanzada", variant: "error" }
  return null
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
