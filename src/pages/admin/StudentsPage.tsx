import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { StudentFormDialog } from "@/pages/admin/StudentFormDialog"
import { EvaluarDialog } from "@/pages/profesor/EvaluarDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import type { Academy } from "@/types/academy"
import type { Student } from "@/types/student"

export function StudentsPage() {
  const [alumnos, setAlumnos] = useState<Student[]>([])
  const [academias, setAcademias] = useState<Academy[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [alumnoEditando, setAlumnoEditando] = useState<Student | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [alumnoEvaluando, setAlumnoEvaluando] = useState<Student | null>(null)

  const academiasPorId = useMemo(
    () => new Map(academias.map((academia) => [academia.id, academia.nombre])),
    [academias],
  )

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Alumnos</h1>
        <Button onClick={abrirCrear} size="sm">
          <Plus className="size-4" />
          Nuevo alumno
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : alumnos.length === 0 ? (
        <p className="text-sm text-text-muted">Aún no hay alumnos registrados.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alumno</TableHead>
              <TableHead>Academia</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alumnos.map((alumno) => (
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
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Evaluar"
                      onClick={() => setAlumnoEvaluando(alumno)}
                    >
                      <ClipboardList className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => abrirEditar(alumno)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={eliminando === alumno.id}
                      onClick={() => eliminar(alumno)}
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

      <StudentFormDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        alumno={alumnoEditando}
        academias={academias}
        onSaved={cargarDatos}
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
