import { QRCodeCanvas } from "qrcode.react"
import { Wallet } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  ESCALA_CARNET,
  dibujarCarnetAppleWallet,
  guardarCarnet,
  nombreArchivoCarnetAppleWallet,
  temaDeCarnet,
} from "@/lib/carnet"
import type { Student } from "@/types/student"

interface AppleWalletPreviewButtonProps {
  alumno: Student
}

const QR_LADO = 56

const TIPO_LABEL: Record<Student["tipo"], string> = {
  academia: "Academia",
  privada: "Privada",
  ambas: "Academia + privada",
}

/**
 * No es un pase real de Apple Wallet: instalar un .pkpass exige
 * firmarlo con un certificado de Apple Developer Program (cuenta de
 * pago), que todavía no existe para este proyecto. Esto genera una
 * imagen de vista previa con la distribución típica de un pase, útil
 * para mostrar en demos comerciales.
 */
export function AppleWalletPreviewButton({ alumno }: AppleWalletPreviewButtonProps) {
  const qrRef = useRef<HTMLCanvasElement>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDescargar() {
    if (!qrRef.current) return
    setError(null)
    setGuardando(true)

    try {
      const tema = temaDeCarnet(alumno.tema_carnet)
      const canvas = await dibujarCarnetAppleWallet(
        {
          nombre: alumno.nombre,
          documento: alumno.documento,
          nivel: alumno.nivel,
          tipo: TIPO_LABEL[alumno.tipo],
          qrCanvas: qrRef.current,
        },
        tema,
      )
      await guardarCarnet(canvas, nombreArchivoCarnetAppleWallet(alumno.nombre))
    } catch {
      setError("No se pudo generar la vista previa. Intenta de nuevo.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="pointer-events-none absolute -left-[9999px] opacity-0" aria-hidden>
        <QRCodeCanvas ref={qrRef} value={alumno.documento} size={QR_LADO * ESCALA_CARNET} />
      </div>
      <Button variant="outline" size="sm" onClick={handleDescargar} disabled={guardando}>
        <Wallet className="size-4" />
        {guardando ? "Generando..." : "Vista previa Apple Wallet"}
      </Button>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}
