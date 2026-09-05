import { Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

import { GigFormDialog } from "@/pages/admin/GigFormDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatearFecha, formatearMoneda } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import type { Gig, GigEstado } from "@/types/gig"

const ETIQUETA_TIPO: Record<string, string> = {
  dj: "DJ",
  tallerista: "Tallerista",
  contrato: "Contrato",
}

const ESTILO_ESTADO: Record<GigEstado, "warning" | "default" | "success"> = {
  cotizado: "warning",
  confirmado: "default",
  pagado: "success",
}

export function GigsPage() {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [gigEditando, setGigEditando] = useState<Gig | null>(null)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from("gigs").select("*").order("fecha", { ascending: false })
    setGigs((data as Gig[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function abrirCrear() {
    setGigEditando(null)
    setDialogoAbierto(true)
  }

  function abrirEditar(gig: Gig) {
    setGigEditando(gig)
    setDialogoAbierto(true)
  }

  async function eliminar(gig: Gig) {
    if (!confirm(`¿Eliminar el contrato "${gig.evento}"?`)) return
    const { error } = await supabase.from("gigs").delete().eq("id", gig.id)
    if (error) {
      alert("No se pudo eliminar el contrato.")
      return
    }
    cargar()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Contratos</h1>
        <Button onClick={abrirCrear} size="sm">
          <Plus className="size-4" />
          Nuevo contrato
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : gigs.length === 0 ? (
        <p className="text-sm text-text-muted">Aún no hay contratos registrados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {gigs.map((gig) => (
            <Card key={gig.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text">{gig.evento}</p>
                    <Badge variant="muted">{ETIQUETA_TIPO[gig.tipo]}</Badge>
                  </div>
                  <p className="text-xs text-text-muted">
                    {formatearFecha(gig.fecha)} · {gig.hora.slice(0, 5)}
                    {gig.lugar ? ` · ${gig.lugar}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge variant={ESTILO_ESTADO[gig.estado]}>
                      {gig.estado[0].toUpperCase() + gig.estado.slice(1)}
                    </Badge>
                    <p className="mt-1 text-sm font-bold text-success">
                      {formatearMoneda(gig.pago)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => abrirEditar(gig)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => eliminar(gig)}>
                      <Trash2 className="size-4 text-error" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GigFormDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        gig={gigEditando}
        onSaved={cargar}
      />
    </div>
  )
}
