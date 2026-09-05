import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { formatearFecha } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import { ES_ESTADO_EXITOSO, ETIQUETA_ESTADO_PLAN, type AttendanceRecord } from "@/types/attendance"

export function HistoricoPage() {
  const { profile } = useAuth()
  const [registros, setRegistros] = useState<AttendanceRecord[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (!profile?.id) return
      setCargando(true)

      const { data } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("alumno_id", profile.id)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false })
        .limit(100)

      setRegistros((data as AttendanceRecord[]) ?? [])
      setCargando(false)
    }

    cargar()
  }, [profile?.id])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Histórico de asistencia</h1>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : registros.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-text-muted">
            Aún no tienes asistencias registradas.
          </CardContent>
        </Card>
      ) : (
        registros.map((registro) => (
          <Card key={registro.id} className={registro.anulado ? "opacity-50" : ""}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-text">
                  {formatearFecha(registro.fecha)} · {registro.hora.slice(0, 5)}
                </p>
                <p className="text-xs text-text-muted">
                  {registro.titulo}
                  {registro.categoria ? ` · ${registro.categoria}` : ""}
                </p>
              </div>
              {registro.anulado ? (
                <Badge variant="muted">Anulado</Badge>
              ) : (
                <Badge variant={ES_ESTADO_EXITOSO[registro.estado_plan] ? "success" : "warning"}>
                  {ETIQUETA_ESTADO_PLAN[registro.estado_plan]}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
