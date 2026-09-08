import { ClipboardList, LayoutGrid, List, Pencil, Plus, Trash2, Upload } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { BulkImportDialog } from "@/pages/admin/BulkImportDialog"
import { StudentFormDialog } from "@/pages/admin/StudentFormDialog"
import { EvaluarDialog } from "@/pages/profesor/EvaluarDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { eliminarAlumno } from "@/lib/adminStudents"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import type { Academy } from "@/types/academy"
import type { Student } from "@/types/student"

type Vista = "lista" | "tarjetas"

const CLAVE_VISTA = "alumnos_vista"
const TODAS_LAS_SEDES = "todas"
const SIN_SEDE = "sin-sede"

interface AccionesAlumnoProps {
  alumno: Student
  eliminando: string | null
  onEvaluar: (alumno: Student) => void
  onEditar: (alumno: Student) => void
  onEliminar: (alumno: Student) => void
}

function AccionesAlumno({
  alumno,
  eliminando,
  onEvaluar,
  onEditar,
  onEliminar,
}: AccionesAlumnoProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" title="Evaluar" onClick={() => onEvaluar(alumno)}>
        <ClipboardList className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onEditar(alumno)}>
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={eliminando === alumno.id}
        onClick={() => onEliminar(alumno)}
      >
        <Trash2 className="size-4 text-error" />
      </Button>
    </div>
  )
}

export function StudentsPage() {
  const [alumnos, setAlumnos] = useState<Student[]>([])
  const [academias, setAcademias] = useState<Academy[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [alumnoEditando, setAlumnoEditando] = useState<Student | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [alumnoEvaluando, setAlumnoEvaluando] = useState<Student | null>(null)
  const [importAbierto, setImportAbierto] = useState(false)
  const [vista, setVista] = useState<Vista>(
    () => (localStorage.getItem(CLAVE_VISTA) as Vista | null) ?? "lista",
  )
  const [filtroSede, setFiltroSede] = useState<string>(TODAS_LAS_SEDES)

  const academiasPorId = useMemo(
    () => new Map(academias.map((academia) => [academia.id, academia.nombre])),
    [academias],
  )

  const alumnosFiltrados = useMemo(() => {
    if (filtroSede === TODAS_LAS_SEDES) return alumnos
    if (filtroSede === SIN_SEDE) return alumnos.filter((a) => !a.academia_id)
    return alumnos.filter((a) => a.academia_id === filtroSede)
  }, [alumnos, filtroSede])

  async function cargarDatos() {
    setCargando(true)
    const [{ data: alumnosData }, { data: academiasData }] = await Promise.all([
      supabase.from("students").select("*").order("nombre"),
      supabase.from("academies").select("*").order("nombre"),
    ])
    setAlumnos((alumnosData as Student[]) ?? [])
    setAcademias((academiasData as Academy[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  function cambiarVista(nueva: Vista) {
    setVista(nueva)
    localStorage.setItem(CLAVE_VISTA, nueva)
  }

  function abrirCrear() {
    setAlumnoEditando(null)
    setDialogoAbierto(true)
  }

  function abrirEditar(alumno: Student) {
    setAlumnoEditando(alumno)
    setDialogoAbierto(true)
  }

  async function eliminar(alumno: Student) {
    if (
      !confirm(
        `¿Eliminar a "${alumno.nombre}"? Esto también elimina su acceso al sistema.`,
      )
    )
      return

    setEliminando(alumno.id)
    try {
      await eliminarAlumno(alumno.id)
      cargarDatos()
    } catch {
      alert("No se pudo eliminar el alumno.")
    } finally {
      setEliminando(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Alumnos</h1>
          {!cargando && (
            <p className="text-sm text-text-muted">
              {alumnosFiltrados.length === 0
                ? filtroSede === TODAS_LAS_SEDES
                  ? "Aún no hay alumnos registrados"
                  : "No hay alumnos en esta sede"
                : alumnosFiltrados.length === 1
                  ? "1 alumno registrado"
                  : `${alumnosFiltrados.length} alumnos registrados`}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <div className="flex items-center rounded-control border border-white/15 p-0.5">
            <button
              type="button"
              title="Vista de lista"
              onClick={() => cambiarVista("lista")}
              className={cn(
                "rounded-[0.5rem] p-2 transition-colors",
                vista === "lista" ? "bg-brand text-white" : "text-text-muted hover:text-text",
              )}
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              title="Vista de tarjetas"
              onClick={() => cambiarVista("tarjetas")}
              className={cn(
                "rounded-[0.5rem] p-2 transition-colors",
                vista === "tarjetas" ? "bg-brand text-white" : "text-text-muted hover:text-text",
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setImportAbierto(true)}>
            <Upload className="size-4" />
            Carga masiva
          </Button>

          <Button onClick={abrirCrear} size="sm">
            <Plus className="size-4" />
            Nuevo alumno
          </Button>
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : alumnos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-control border border-dashed border-white/15 py-16 text-center">
          <p className="text-sm text-text-muted">Aún no hay alumnos registrados.</p>
          <Button onClick={abrirCrear} size="sm" variant="outline">
            <Plus className="size-4" />
            Registrar el primero
          </Button>
        </div>
      ) : alumnosFiltrados.length === 0 ? (
        <p className="py-16 text-center text-sm text-text-muted">No hay alumnos en esta sede.</p>
      ) : vista === "tarjetas" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alumnosFiltrados.map((alumno) => (
            <Card key={alumno.id}>
              <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                <Avatar className="size-14">
                  <AvatarImage src={alumno.foto ?? undefined} alt={alumno.nombre} />
                  <AvatarFallback>{alumno.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-text">{alumno.nombre}</p>
                  <p className="text-xs text-text-muted">{alumno.documento}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant={alumno.tipo === "privada" ? "muted" : "default"}>
                    {alumno.nivel}
                  </Badge>
                  <Badge variant="muted">
                    {alumno.academia_id ? academiasPorId.get(alumno.academia_id) : "Sin sede"}
                  </Badge>
                </div>
                <AccionesAlumno
                  alumno={alumno}
                  eliminando={eliminando}
                  onEvaluar={setAlumnoEvaluando}
                  onEditar={abrirEditar}
                  onEliminar={eliminar}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alumno</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alumnosFiltrados.map((alumno) => (
              <TableRow key={alumno.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarImage src={alumno.foto ?? undefined} alt={alumno.nombre} />
                      <AvatarFallback>{alumno.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-text">{alumno.nombre}</p>
                      <p className="text-xs text-text-muted">{alumno.documento}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-text-muted">
                  {alumno.academia_id ? academiasPorId.get(alumno.academia_id) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={alumno.tipo === "privada" ? "muted" : "default"}>
                    {alumno.nivel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <AccionesAlumno
                    alumno={alumno}
                    eliminando={eliminando}
                    onEvaluar={setAlumnoEvaluando}
                    onEditar={abrirEditar}
                    onEliminar={eliminar}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <StudentFormDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        alumno={alumnoEditando}
        academias={academias}
        onSaved={cargarDatos}
      />

      <BulkImportDialog
        open={importAbierto}
        onOpenChange={setImportAbierto}
        academias={academias}
        onImportado={cargarDatos}
      />

      {alumnoEvaluando && (
        <EvaluarDialog
          open={!!alumnoEvaluando}
          onOpenChange={(open) => !open && setAlumnoEvaluando(null)}
          alumno={alumnoEvaluando}
          onRegistrada={() => {}}
        />
      )}
    </div>
  )
}
