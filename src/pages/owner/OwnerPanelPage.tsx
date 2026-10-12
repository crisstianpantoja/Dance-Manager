import { Building2, Crown, GraduationCap, Trash2, UserCircle } from "lucide-react"
import { useEffect, useState } from "react"

import { MetricCard } from "@/components/admin/MetricCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatearFechaObjeto } from "@/lib/format"
import { alternarActivaAcademia, cargarResumenPlataforma, eliminarAcademia } from "@/lib/ownerPanel"
import type { AcademiaResumen, ResumenPlataforma } from "@/types/owner"

export function OwnerPanelPage() {
  const [resumen, setResumen] = useState<ResumenPlataforma | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actualizando, setActualizando] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setResumen(await cargarResumenPlataforma())
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el panel.")
    }
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function manejarCambioActiva(academia: AcademiaResumen, activo: boolean) {
    if (
      !activo &&
      !confirm(
        `¿Desactivar "${academia.nombre}"? Sus usuarios no podrán iniciar sesión mientras esté desactivada.`,
      )
    ) {
      return
    }

    setActualizando(academia.id)
    try {
      await alternarActivaAcademia(academia.id, activo)
      setResumen((actual) =>
        actual
          ? {
              ...actual,
              academias: actual.academias.map((a) =>
                a.id === academia.id ? { ...a, activo } : a,
              ),
            }
          : actual,
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo actualizar la academia.")
    }
    setActualizando(null)
  }

  async function manejarEliminar(academia: AcademiaResumen) {
    const escrito = prompt(
      `Esto borra PERMANENTEMENTE "${academia.nombre}" y todos sus datos: alumnos, profesores, clases, pagos, eventos, liquidaciones... todo. No se puede deshacer.\n\nEscribe el nombre exacto de la academia para confirmar:`,
    )

    if (escrito === null) return

    if (escrito.trim() !== academia.nombre) {
      alert("El nombre no coincide. No se eliminó nada.")
      return
    }

    setEliminando(academia.id)
    try {
      await eliminarAcademia(academia.id, escrito.trim())
      await cargar()
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar la academia.")
    }
    setEliminando(null)
  }

  if (cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  if (error || !resumen) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <p className="text-center text-sm text-error">{error ?? "No se pudo cargar el panel."}</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center gap-3">
          <Crown className="size-7 text-brand" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-text">Panel de dueño</h1>
            <p className="text-sm text-text-muted">
              Visión global de todas las academias registradas en Dance Manager.
            </p>
          </div>
        </header>

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard titulo="Academias" valor={String(resumen.totales.academias)} />
          <MetricCard titulo="Alumnos totales" valor={String(resumen.totales.alumnos)} />
          <MetricCard titulo="Profesores totales" valor={String(resumen.totales.profesores)} />
          <MetricCard
            titulo="Academias nuevas"
            valor={String(resumen.totales.altas_30_dias)}
            nota="últimos 30 días"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Academia</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>
                    <GraduationCap className="inline size-4" />
                  </TableHead>
                  <TableHead>
                    <UserCircle className="inline size-4" />
                  </TableHead>
                  <TableHead>Registrada</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Eliminar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumen.academias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-text-muted">
                      Todavía no hay academias registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  resumen.academias.map((academia) => (
                    <TableRow key={academia.id}>
                      <TableCell className="font-medium text-text">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 shrink-0 text-text-muted" />
                          {academia.nombre}
                        </div>
                      </TableCell>
                      <TableCell className="text-text-muted">{academia.codigo}</TableCell>
                      <TableCell>{academia.alumnos}</TableCell>
                      <TableCell>{academia.profesores}</TableCell>
                      <TableCell className="text-text-muted">
                        {formatearFechaObjeto(new Date(academia.created_at))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={academia.activo}
                            disabled={actualizando === academia.id}
                            onCheckedChange={(valor) => manejarCambioActiva(academia, valor)}
                          />
                          <Badge variant={academia.activo ? "success" : "muted"}>
                            {academia.activo ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          disabled={eliminando === academia.id}
                          onClick={() => manejarEliminar(academia)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
