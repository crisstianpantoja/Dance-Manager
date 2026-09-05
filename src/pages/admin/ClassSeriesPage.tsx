import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

import { ClassSeriesFormDialog } from "@/pages/admin/ClassSeriesFormDialog"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { generarOcurrencias } from "@/lib/occurrences"
import { supabase } from "@/lib/supabase"
import type { Academy } from "@/types/academy"
import { DIAS_SEMANA, type ClassSeries } from "@/types/classSeries"
import type { Teacher } from "@/types/teacher"

export function ClassSeriesPage() {
  const [series, setSeries] = useState<ClassSeries[]>([])
  const [academias, setAcademias] = useState<Academy[]>([])
  const [profesores, setProfesores] = useState<Teacher[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [serieEditando, setSerieEditando] = useState<ClassSeries | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)

  async function cargarDatos() {
    setCargando(true)
    const [{ data: seriesData }, { data: academiasData }, { data: profesoresData }] =
      await Promise.all([
        supabase.from("class_series").select("*").order("dia_semana").order("hora"),
        supabase.from("academies").select("*").order("nombre"),
        supabase.from("teachers").select("*").order("nombre"),
      ])
    setSeries((seriesData as ClassSeries[]) ?? [])
    setAcademias((academiasData as Academy[]) ?? [])
    setProfesores((profesoresData as Teacher[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  function abrirCrear() {
    setSerieEditando(null)
    setDialogoAbierto(true)
  }

  function abrirEditar(serie: ClassSeries) {
    setSerieEditando(serie)
    setDialogoAbierto(true)
  }

  async function eliminar(serie: ClassSeries) {
    if (
      !confirm(
        `¿Eliminar "${serie.titulo}"? También se eliminan sus ocurrencias en el calendario.`,
      )
    )
      return

    const { error } = await supabase.from("class_series").delete().eq("id", serie.id)
    if (error) {
      alert("No se pudo eliminar la clase.")
      return
    }
    cargarDatos()
  }

  async function extenderOcurrencias(serie: ClassSeries) {
    setProcesando(serie.id)
    try {
      const creadas = await generarOcurrencias(serie)
      alert(creadas > 0 ? `Se generaron ${creadas} clases nuevas.` : "El calendario ya está al día.")
    } catch {
      alert("No se pudieron generar las ocurrencias.")
    } finally {
      setProcesando(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Clases recurrentes</h1>
        <Button onClick={abrirCrear} size="sm">
          <Plus className="size-4" />
          Nueva clase
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : series.length === 0 ? (
        <p className="text-sm text-text-muted">Aún no hay clases recurrentes programadas.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clase</TableHead>
              <TableHead>Día y hora</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.map((serie) => (
              <TableRow key={serie.id}>
                <TableCell>
                  <p className="font-medium text-text">{serie.titulo}</p>
                  <p className="text-xs text-text-muted">
                    {serie.categoria ?? "Sin categoría"}
                    {serie.lugar ? ` · ${serie.lugar}` : ""}
                    {serie.profesor_ids.length > 0
                      ? ` · ${serie.profesor_ids
                          .map((id) => profesores.find((p) => p.id === id)?.nombre)
                          .filter(Boolean)
                          .join(", ")}`
                      : ""}
                  </p>
                </TableCell>
                <TableCell className="text-text-muted">
                  {DIAS_SEMANA[serie.dia_semana]} · {serie.hora.slice(0, 5)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Generar más ocurrencias"
                      disabled={procesando === serie.id}
                      onClick={() => extenderOcurrencias(serie)}
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => abrirEditar(serie)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => eliminar(serie)}>
                      <Trash2 className="size-4 text-error" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ClassSeriesFormDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        serie={serieEditando}
        academias={academias}
        profesores={profesores}
        onSaved={cargarDatos}
      />
    </div>
  )
}
