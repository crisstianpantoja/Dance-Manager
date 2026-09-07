import QrScanner from "qr-scanner"
import { useEffect, useRef } from "react"

interface QrScannerViewProps {
  onScan: (valor: string) => void
  onError?: (mensaje: string) => void
  className?: string
}

/**
 * Lector de QR con qr-scanner (worker propio, más rápido y confiable que
 * escanear frame a frame en el hilo principal). Se detiene solo apenas
 * decodifica un código, antes de avisarle al padre — así la cámara nunca
 * se queda encendida esperando que alguien la apague a mano.
 */
export function QrScannerView({ onScan, onError, className }: QrScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const scanner = new QrScanner(
      video,
      (resultado) => {
        scanner.stop()
        onScanRef.current(resultado.data)
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 5,
      },
    )

    scanner.start().catch(() => onErrorRef.current?.("No se pudo acceder a la cámara."))

    return () => {
      scanner.stop()
      scanner.destroy()
    }
  }, [])

  return <video ref={videoRef} className={className} muted playsInline />
}
