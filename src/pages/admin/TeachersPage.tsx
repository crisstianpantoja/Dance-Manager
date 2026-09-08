import { DollarSign, Pencil, Plus, QrCode, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { TeacherAgreementDialog } from "@/pages/admin/TeacherAgreementDialog"
import { TeacherFormDialog } from "@/pages/admin/TeacherFormDialog"
import { TeacherQrDialog } from "@/pages/admin/TeacherQrDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { eliminarProfesor } from "@/lib/adminTeachers"
import { supabase } from "@/lib/supabase"
import type { Academy } from "@/types/academy"
import type { Teacher } from "@/types/teacher"
import type { TeacherAcademy } from "@/types/teacherAcademy"

const TODAS_LAS_SEDES = "todas"
const SIN_SEDE = "sin-sede"

export function TeachersPage() {
  const [profesores, setProfesores] = useState<Teacher[]>([])
  const [academias, setAcademias] = useState<Academy[]>([])
  const [sedesProfesores, setSedesProfesores] = useState<TeacherAcademy[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [profesorEditando, setProfesorEditando] = useState<Teacher | null>(null)
  const [acuerdoAbierto, setAcuerdoAbierto] = useState(false)
  const [profesorAcuerdo, setProfesorAcuerdo] = useState<Teacher | null>(null)
  const [qrAbierto, setQrAbierto] = useState(false)
  const [profesorQr, setProfesorQr] = useState<Teacher | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [filtroSede, setFiltroSede] = useState<string>(TODAS_LAS_SEDES)

  const academiasPorId = useMemo(
    () => new Map(academias.map((academia) => [academia.id, academia.nombre])),
    [academias],
  )

  const sedesPorProfesor = useMemo(() => {
    const mapa = new Map<string, string[]>()
    for (const fila of sedesProfesores) {
      const actuales = mapa.get(fila.teacher_id) ?? []
      actuales.push(fila.academia_id)
      mapa.set(fila.teacher_id, actuales)
    }
    return mapa
  }, [sedesProfesores])

  const profesoresFiltrados = useMemo(() => {
    if (filtroSede === TODAS_LAS_SEDES) return profesores
    if (filtroSede === SIN_SEDE) {
      return profesores.filter((p) => (sedesPorProfesor.get(p.id) ?? []).length === 0)
    }
    return profesores.filter((p) => (sedesPorProfesor.get(p.id) ?? []).includes(filtroSede))
  }, [profesores, sedesPorProfesor, filtroSede])

  async function cargarProfesores() {
    setCargando(true)
    const [{ data: profesoresData }, { data: academiasData }, { data: sedesData }] =
      await Promise.all([
        supabase.from("teachers").select("*").order("nombre"),
        supabase.from("academies").select("*").order("nombre"),
        supabase.from("teacher_academies").select("*"),
      ])
    setProfesores((profesoresData as Teacher[]) ?? [])
    setAcademias((academiasData as Academy[]) ?? [])
    setSedesProfesores((sedesData as TeacherAcademy[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargarProfesores()
  }, [])

  function abrirCrear() {
    setProfesorEditando(null)
    setDialogoAbierto(true)
  }

  function abrirEditar(profesor: Teacher) {
    setProfesorEditando(profesor)
    setDialogoAbierto(true)
  }

  function abrirAcuerdo(profesor: Teacher) {
    setProfesorAcuerdo(profesor)
    setAcuerdoAbierto(true)
  }

  function abrirQr(profesor: Teacher) {
    setProfesorQr(profesor)
    setQrAbierto(true)
  }

  async function eliminar(profesor: Teacher) {
    if (
      !confirm(`¿Eliminar a "${profesor.nombre}"? Esto también elimina su acceso al sistema.`)
    )
      return

    setEliminando(profesor.id)
    try {
      await eliminarProfesor(profesor.id)
      cargarProfesores()
    } catch {
      alert("No se pudo eliminar el profesor.")
    } finally {
      setEliminando(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text">Profesores</h1>
        <div className="flex items-center gap-2">
          {academias.length > 0 && (
            <Select value={filtroSede} onValueChange={setFiltroSede}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS_LAS_SEDES}>Todas las sedes</SelectItem>
                <SelectItem value={SIN_SEDE}>Sin sede</SelectItem>
                {academias.map((academia) => (
                  <SelectItem key={academia.id} value={academia.id}>
                    {academia.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={abrirCrear} size="sm">
            <Plus className="size-4" />
            Nuevo profesor
          </Button>
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : profesores.length === 0 ? (
        <p className="text-sm text-text-muted">Aún no hay profesores registrados.</p>
      ) : profesoresFiltrados.length === 0 ? (
        <p className="py-16 text-center text-sm text-text-muted">No hay profesores en esta sede.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profesor</TableHead>
              <TableHead>Sedes</TableHead>
              <TableHead>Rol interno</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profesoresFiltrados.map((profesor) => (
              <TableRow key={profesor.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarImage src={profesor.foto ?? undefined} alt={profesor.nombre} />
                      <AvatarFallback>{profesor.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-text">{profesor.nombre}</p>
                      <p className="text-xs text-text-muted">{profesor.documento}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-text-muted">
                  {(sedesPorProfesor.get(profesor.id) ?? [])
                    .map((id) => academiasPorId.get(id))
                    .filter(Boolean)
                    .join(", ") || "—"}
                </TableCell>
                <TableCell className="text-text-muted">
                  {profesor.rol_interno ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={profesor.activo ? "success" : "muted"}>
                    {profesor.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Ver QR"
                      onClick={() => abrirQr(profesor)}
                    >
                      <QrCode className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Acuerdo económico"
                      onClick={() => abrirAcuerdo(profesor)}
                    >
                      <DollarSign className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => abrirEditar(profesor)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={eliminando === profesor.id}
                      onClick={() => eliminar(profesor)}
                    >
                      <Trash2 className="size-4 text-error" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TeacherAgreementDialog
        open={acuerdoAbierto}
        onOpenChange={setAcuerdoAbierto}
        profesor={profesorAcuerdo}
      />

      <TeacherQrDialog open={qrAbierto} onOpenChange={setQrAbierto} profesor={profesorQr} />

      <TeacherFormDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        profesor={profesorEditando}
        academias={academias}
        onSaved={cargarProfesores}
      />
    </div>
  )
}
