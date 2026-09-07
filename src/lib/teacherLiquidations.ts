import { supabase } from "@/lib/supabase"
import type { TeacherLiquidation } from "@/types/teacherLiquidation"

export async function crearLiquidacionMensual(teacherId: string, anio: number, mes: number) {
  const { data, error } = await supabase.rpc("crear_liquidacion_mensual", {
    p_teacher_id: teacherId,
    p_year: anio,
    p_month: mes,
  })
  if (error) throw error
  return data as string | null
}

export async function aprobarLiquidacion(id: string) {
  const { error } = await supabase.rpc("aprobar_liquidacion", { p_liquidacion_id: id })
  if (error) throw error
}

export async function marcarLiquidacionPagada(
  id: string,
  fechaPago: string,
  metodoPago: string,
  observaciones?: string,
  comprobanteUrl?: string,
) {
  const { error } = await supabase.rpc("marcar_liquidacion_pagada", {
    p_liquidacion_id: id,
    p_fecha_pago: fechaPago,
    p_metodo_pago: metodoPago,
    p_observaciones: observaciones || null,
    p_comprobante_url: comprobanteUrl || null,
  })
  if (error) throw error
}

export async function anularLiquidacion(id: string) {
  const { error } = await supabase.rpc("anular_liquidacion", { p_liquidacion_id: id })
  if (error) throw error
}

export async function listarLiquidacionesPeriodo(anio: number, mes: number) {
  const { data, error } = await supabase
    .from("teacher_liquidations")
    .select("*")
    .eq("year", anio)
    .eq("month", mes)

  if (error) throw error
  return (data as TeacherLiquidation[]) ?? []
}

export interface ItemLiquidacion {
  id: string
  amount: number
  fecha_clase: string
  voided_at: string | null
  titulo: string
}

interface FilaItemCruda {
  id: string
  amount: number
  fecha_clase: string
  voided_at: string | null
  class_occurrence_teachers: {
    class_occurrences: {
      class_series: { titulo: string } | { titulo: string }[] | null
    } | null
  } | null
}

export async function listarItemsLiquidacion(liquidacionId: string) {
  const { data, error } = await supabase
    .from("teacher_liquidation_items")
    .select(
      "id, amount, fecha_clase, voided_at, class_occurrence_teachers(class_occurrences(class_series(titulo)))",
    )
    .eq("liquidation_id", liquidacionId)
    .order("fecha_clase")

  if (error) throw error

  return ((data as unknown as FilaItemCruda[]) ?? []).map((f): ItemLiquidacion => {
    const serie = Array.isArray(f.class_occurrence_teachers?.class_occurrences?.class_series)
      ? f.class_occurrence_teachers?.class_occurrences?.class_series[0]
      : f.class_occurrence_teachers?.class_occurrences?.class_series
    return {
      id: f.id,
      amount: f.amount,
      fecha_clase: f.fecha_clase,
      voided_at: f.voided_at,
      titulo: serie?.titulo ?? "Clase",
    }
  })
}
