import { Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

import { AcademyFormDialog } from "@/pages/admin/AcademyFormDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import type { Academy } from "@/types/academy"

export function AcademiesPage() {
  const [academias, setAcademias] = useState<Academy[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [academiaEditando, setAcademiaEditando] = useState<Academy | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)

  async function cargarAcademias() {
    setCargando(true)
    const { data } = await supabase.from("academies").select("*").order("nombre")
    setAcademias((data as Academy[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargarAcademias()
  }, [])

  function abrirCrear() {
    setAcademiaEditando(null)
    setDialogoAbierto(true)
  }

  function abrirEditar(academia: Academy) {
    setAcademiaEditando(academia)
    setDialogoAbierto(true)
  }

  async function eliminarAcademia(academia: Academy) {
    if (!confirm(`¿Eliminar la sede "${academia.nombre}"?`)) return

    setEliminando(academia.id)
    const { error } = await supabase.from("academies").delete().eq("id", academia.id)
    setEliminando(null)

    if (error) {
      alert("No se pudo eliminar la sede.")
      return
    }

    cargarAcademias()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Sedes</h1>
        <Button onClick={abrirCrear} size="sm">
          <Plus className="size-4" />
          Nueva sede
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : academias.length === 0 ? (
        <p className="text-sm text-text-muted">Aún no hay sedes registradas.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sede</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {academias.map((academia) => (
              <TableRow key={academia.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 rounded-control">
                      <AvatarImage src={academia.logo ?? undefined} alt={academia.nombre} />
                      <AvatarFallback className="rounded-control">
                        {academia.nombre.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">{academia.nombre}</span>
                      {academia.color && (
                        <span
                          className="size-3 rounded-full border border-white/20"
                          style={{ backgroundColor: academia.color }}
                        />
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirEditar(academia)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={eliminando === academia.id}
                      onClick={() => eliminarAcademia(academia)}
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

      <AcademyFormDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        academia={academiaEditando}
        onSaved={cargarAcademias}
      />
    </div>
  )
}
