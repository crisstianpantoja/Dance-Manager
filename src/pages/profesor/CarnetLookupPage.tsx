import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner"
import { Camera, CameraOff, ClipboardList, Search } from "lucide-react"
import { useRef, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EvaluarDialog } from "@/pages/profesor/EvaluarDialog"
import { fechaHoy } from "@/lib/attendance"
import { formatearFecha } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import type { Payment } from "@/types/payment"
import type { Student } from "@/types/student"

export function CarnetLookupPage() {
  const [documento, setDocumento] = useState("")
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alumno, setAlumno] = useState<Student | null>(null)
  const [pagos, setPagos] = useState<Payment[]>([])
  const [evaluarAbierto, setEvaluarAbierto] = useState(false)
  const ultimoEscaneo = useRef<{ valor: string; ts: number } | null>(null)

  async function buscar(valor: string) {
    const doc = valor.trim()
    if (!doc) return

    setBuscando(true)
    setError(null)
    setAlumno(null)
    setPagos([])

    const { data: encontrado } = await supabase
      .from("students")
      .select("*")
      .eq("documento", doc)
      .maybeSingle()

    if (!encontrado) {
      setError(`No se encontró ningún alumno con el documento ${doc}.`)
      setBuscando(false)
      return
    }

    const { data: pagosData } = await supabase
      .from("payments")
      .select("*")
      .eq("alumno_id", encontrado.id)
      .order("fecha", { ascending: false })

    setAlumno(encontrado as Student)
    setPagos((pagosData as Payment[]) ?? [])
    setBuscando(false)
  }

  function handleDetectado(codigos: IDetectedBarcode[]) {
    const valor = codigos[0]?.rawValue
    if (!valor) return

    const ahora = Date.now()
    if (
      ultimoEscaneo.current &&
      ultimoEscaneo.current.valor === valor &&
      ahora - ultimoEscaneo.current.ts < 4000
    ) {
      return
    }
    ultimoEscaneo.current = { valor, ts: ahora }
    buscar(valor)
  }

  const hoy = fechaHoy()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Consultar carnet</h1>
      <p className="text-sm text-text-muted">
        Escanea o busca el documento de un alumno para ver su plan y pago al día.
      </p>

      <div className="flex flex-col gap-3 rounded-control border border-white/10 bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text">Escanear carnet (QR)</p>
          <Button variant="outline" size="sm" onClick={() => setCamaraActiva((v) => !v)}>
            {camaraActiva ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
            {camaraActiva ? "Detener lectura" : "Leer QR"}
          </Button>
        </div>

        {camaraActiva && (
          <div className="overflow-hidden rounded-control">
            <Scanner
              onScan={handleDetectado}
              onError={() => setError("No se pudo acceder a la cámara.")}
              formats={["qr_code"]}
              styles={{ container: { width: "100%" } }}
            />
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            buscar(documento)
          }}
        >
          <Input
            placeholder="O escribe el documento del alumno"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={buscando}>
            <Search className="size-4" />
            Buscar
          </Button>
        </form>
      </div>

      {error && (
        <p className="rounded-control bg-warning/10 px-4 py-3 text-sm text-warning">{error}</p>
      )}

      {alumno && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <Avatar className="size-16">
              <AvatarImage src={alumno.foto ?? undefined} alt={alumno.nombre} />
              <AvatarFallback>{alumno.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-text">{alumno.nombre}</p>
              <p className="text-sm text-text-muted">{alumno.documento}</p>
            </div>
            <div className="flex gap-2">
              <Badge>{alumno.nivel}</Badge>
              <Badge variant="muted">
                {alumno.tipo === "privada"
                  ? "Privada"
                  : alumno.tipo === "ambas"
                    ? "Academia + privada"
                    : "Academia"}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEvaluarAbierto(true)}>
              <ClipboardList className="size-4" />
              Evaluar
            </Button>
          </CardContent>
        </Card>
      )}

      {alumno && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-text-muted">Planes</p>
          {pagos.length === 0 ? (
            <Card>
              <CardContent className="py-4 text-center text-sm text-text-muted">
                Este alumno no tiene planes registrados.
              </CardContent>
            </Card>
          ) : (
            pagos.map((pago) => {
              const vencido = pago.fecha_vencimiento ? pago.fecha_vencimiento < hoy : false
              const restantes = Math.max(0, pago.clases_incluidas - pago.clases_usadas)

              return (
                <Card key={pago.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-text">{pago.concepto}</p>
                      <p className="text-xs text-text-muted">
                        {pago.modalidad === "ilimitada"
                          ? "Clases ilimitadas"
                          : `${restantes} clases restantes`}
                        {pago.fecha_vencimiento
                          ? ` · vence ${formatearFecha(pago.fecha_vencimiento)}`
                          : ""}
                      </p>
                    </div>
                    <Badge
                      variant={
                        pago.estado === "pendiente"
                          ? "warning"
                          : pago.estado === "rechazado"
                            ? "error"
                            : vencido
                              ? "muted"
                              : "success"
                      }
                    >
                      {pago.estado === "pagado"
                        ? vencido
                          ? "Vencido"
                          : "Activo"
                        : pago.estado === "pendiente"
                          ? "En revisión"
                          : "Rechazado"}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {alumno && (
        <EvaluarDialog
          open={evaluarAbierto}
          onOpenChange={setEvaluarAbierto}
          alumno={alumno}
          onRegistrada={() => {}}
        />
      )}
    </div>
  )
}
