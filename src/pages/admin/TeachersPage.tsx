import { DollarSign, Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

import { TeacherAgreementDialog } from "@/pages/admin/TeacherAgreementDialog"
import { TeacherFormDialog } from "@/pages/admin/TeacherFormDialog"
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
import { eliminarProfesor } from "@/lib/adminTeachers"
import { supabase } from "@/lib/supabase"
import type { Academy } from "@/types/academy"
import type { Teacher } from "@/types/teacher"

export function TeachersPage() {
  const [profesores, setProfesores] = useState<Teacher[]>([])
  const [academias, setAcademias] = useState<Academy[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [profesorEditando, setProfesorEditando] = useState<Teacher | null>(null)
  const [acuerdoAbierto, setAcuerdoAbierto] = useState(false)
  const [profesorAcuerdo, setProfesorAcuerdo] = useState<Teacher | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)

  async function cargarProfesores() {
    setCargando(true)
    const [{ data: profesoresData }, { data: academiasData }] = await Promise.all([
      supabase.from("teachers").select("*").order("nombre"),
      supabase.from("academies").select("*").order("nombre"),
    ])
    setProfesores((profesoresData as Teacher[]) ?? [])
    setAcademias((academiasData as Academy[]) ?? [])
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Profesores</h1>
        <Button onClick={abrirCrear} size="sm">
          <Plus className="size-4" />
          Nuevo profesor
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : profesores.length === 0 ? (
        <p className="text-sm text-text-muted">Aún no hay profesores registrados.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profesor</TableHead>
              <TableHead>Rol interno</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profesores.map((profesor) => (
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
