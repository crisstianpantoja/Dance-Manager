import { QRCodeCanvas } from "qrcode.react"
import { Download } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  ESCALA_CARNET,
  dibujarCarnet,
  guardarCarnet,
  nombreArchivoCarnet,
  temaDeCarnet,
} from "@/lib/carnet"
import type { Student } from "@/types/student"

interface CarnetDownloadButtonProps {
  alumno: Student
}

const QR_LADO = 110

const TIPO_LABEL: Record<Student["tipo"], string> = {
  academia: "Academia",
  privada: "Privada",
  ambas: "Academia + privada",
}

export function CarnetDownloadButton({ alumno }: CarnetDownloadButtonProps) {
  const qrRef = useRef<HTMLCanvasElement>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDescargar() {
    if (!qrRef.current) return
    setError(null)
    setGuardando(true)

    try {
      const tema = temaDeCarnet(alumno.tema_carnet)
      const canvas = await dibujarCarnet(
        {
          nombre: alumno.nombre,
          nivel: alumno.nivel,
          tipo: TIPO_LABEL[alumno.tipo],
          fotoUrl: alumno.foto,
          qrCanvas: qrRef.current,
        },
        tema,
      )
      await guardarCarnet(canvas, nombreArchivoCarnet(alumno.nombre))
    } catch {
      setError("No se pudo generar el carnet. Intenta de nuevo.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="pointer-events-none absolute -left-[9999px] opacity-0" aria-hidden>
        <QRCodeCanvas ref={qrRef} value={alumno.documento} size={QR_LADO * ESCALA_CARNET} />
      </div>
      <Button variant="outline" size="sm" onClick={handleDescargar} disabled={guardando}>
        <Download className="size-4" />
        {guardando ? "Generando..." : "Descargar carnet"}
      </Button>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}
