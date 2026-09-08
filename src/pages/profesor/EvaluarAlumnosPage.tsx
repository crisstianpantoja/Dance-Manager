import { ClipboardList, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EvaluarDialog } from "@/pages/profesor/EvaluarDialog"
import { supabase } from "@/lib/supabase"
import type { Student } from "@/types/student"

export function EvaluarAlumnosPage() {
  const [alumnos, setAlumnos] = useState<Student[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [cargando, setCargando] = useState(true)
  const [alumnoEvaluar, setAlumnoEvaluar] = useState<Student | null>(null)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const { data } = await supabase
        .from("students")
        .select("*")
        .order("nombre")

      setAlumnos((data as Student[]) ?? [])
      setCargando(false)
    }

    cargar()
  }, [])

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return alumnos
    return alumnos.filter((a) => a.nombre.toLowerCase().includes(q))
  }, [alumnos, busqueda])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Evaluar alumnos</h1>
      <p className="text-sm text-text-muted">
        Registra la evaluación de competencias de tus alumnos de clases privadas.
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <Input
          placeholder="Buscar alumno por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-9"
        />
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : visibles.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-text-muted">
            {alumnos.length === 0
              ? "No tienes alumnos de clases privadas para evaluar."
              : "No se encontró ningún alumno con ese nombre."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((alumno) => (
            <Card key={alumno.id}>
              <CardContent className="flex items-center gap-3 py-4">
                <Avatar className="size-11 shrink-0">
                  <AvatarImage src={alumno.foto ?? undefined} alt={alumno.nombre} />
                  <AvatarFallback>{alumno.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text">{alumno.nombre}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    <Badge variant="muted">{alumno.nivel}</Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setAlumnoEvaluar(alumno)}
                >
                  <ClipboardList className="size-4" />
                  Evaluar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {alumnoEvaluar && (
        <EvaluarDialog
          open={!!alumnoEvaluar}
          onOpenChange={(open) => !open && setAlumnoEvaluar(null)}
          alumno={alumnoEvaluar}
          onRegistrada={() => {}}
        />
      )}
    </div>
  )
}
