import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LiquidacionDetalleDialog } from "@/pages/admin/LiquidacionDetalleDialog"
import { formatearMoneda } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import { cargarResumenFinanciero } from "@/lib/teacherFinance"
import { crearLiquidacionMensual, listarLiquidacionesPeriodo } from "@/lib/teacherLiquidations"
import type { Teacher } from "@/types/teacher"
import type { EstadoLiquidacion, TeacherLiquidation } from "@/types/teacherLiquidation"

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const ESTILO_ESTADO: Record<EstadoLiquidacion, "warning" | "muted" | "success" | "error"> = {
  pendiente: "warning",
  aprobada: "muted",
  pagada: "success",
  anulada: "error",
}

interface FilaProfesor {
  profesor: Teacher
  liquidacion: TeacherLiquidation | null
  generadoPreview: number
  clasesPreview: number
}

export function FinanzasProfesoresPage() {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [filas, setFilas] = useState<FilaProfesor[]>([])
  const [cargando, setCargando] = useState(true)
  const [creando, setCreando] = useState<string | null>(null)

  const [detalleAbierto, setDetalleAbierto] = useState(false)
  const [liquidacionActiva, setLiquidacionActiva] = useState<TeacherLiquidation | null>(null)
  const [profesorActivo, setProfesorActivo] = useState<Teacher | null>(null)

  async function cargar() {
    setCargando(true)
    const [{ data: teachersData }, liquidaciones] = await Promise.all([
      supabase.from("teachers").select("*").eq("activo", true).order("nombre"),
      listarLiquidacionesPeriodo(anio, mes),
    ])

    const teachers = (teachersData as Teacher[]) ?? []
    const liquidacionesPorProfesor = new Map(liquidaciones.map((l) => [l.teacher_id, l]))

    const filasCargadas = await Promise.all(
      teachers.map(async (profesor): Promise<FilaProfesor> => {
        const liquidacion = liquidacionesPorProfesor.get(profesor.id) ?? null
        if (liquidacion) {
          return { profesor, liquidacion, generadoPreview: 0, clasesPreview: 0 }
        }
        try {
          const resumen = await cargarResumenFinanciero(profesor.id, anio, mes)
          return {
            profesor,
            liquidacion: null,
            generadoPreview: resumen?.generado ?? 0,
            clasesPreview: resumen?.generado_clases ?? 0,
          }
        } catch {
          return { profesor, liquidacion: null, generadoPreview: 0, clasesPreview: 0 }
        }
      }),
    )

    setFilas(filasCargadas)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes])

  async function crear(fila: FilaProfesor) {
    setCreando(fila.profesor.id)
    try {
      await crearLiquidacionMensual(fila.profesor.id, anio, mes)
      await cargar()
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo crear la liquidación.")
    } finally {
      setCreando(null)
    }
  }

  function abrirDetalle(fila: FilaProfesor) {
    if (!fila.liquidacion) return
    setLiquidacionActiva(fila.liquidacion)
    setProfesorActivo(fila.profesor)
    setDetalleAbierto(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Finanzas de profesores</h1>
        <div className="flex gap-2">
          <Select value={mes.toString()} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((nombre, i) => (
                <SelectItem key={nombre} value={(i + 1).toString()}>
                  {nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={anio.toString()} onValueChange={(v) => setAnio(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1].map((a) => (
                <SelectItem key={a} value={a.toString()}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : filas.length === 0 ? (
        <p className="text-sm text-text-muted">Aún no hay profesores activos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profesor</TableHead>
              <TableHead>Clases</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-40 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila) => (
              <TableRow key={fila.profesor.id}>
                <TableCell className="font-medium text-text">{fila.profesor.nombre}</TableCell>
                <TableCell className="text-text-muted">
                  {fila.liquidacion ? "—" : fila.clasesPreview}
                </TableCell>
                <TableCell className="text-text">
                  {formatearMoneda(fila.liquidacion?.total_amount ?? fila.generadoPreview)}
                </TableCell>
                <TableCell>
                  {fila.liquidacion ? (
                    <Badge variant={ESTILO_ESTADO[fila.liquidacion.estado]}>
                      {fila.liquidacion.estado}
                    </Badge>
                  ) : (
                    <Badge variant="muted">Sin liquidar</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {fila.liquidacion ? (
                    <Button variant="outline" size="sm" onClick={() => abrirDetalle(fila)}>
                      Ver detalle
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={creando === fila.profesor.id || fila.generadoPreview === 0}
                      onClick={() => crear(fila)}
                    >
                      {creando === fila.profesor.id ? "Creando..." : "Crear liquidación"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <LiquidacionDetalleDialog
        open={detalleAbierto}
        onOpenChange={setDetalleAbierto}
        liquidacion={liquidacionActiva}
        profesorNombre={profesorActivo?.nombre ?? ""}
        onCambiada={cargar}
      />
    </div>
  )
}
