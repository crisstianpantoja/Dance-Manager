import { Wallet } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { obtenerEnlaceWallet } from "@/lib/wallet"

export function GoogleWalletButton() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setCargando(true)
    try {
      const url = await obtenerEnlaceWallet()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el carnet de Wallet.")
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={cargando}>
        <Wallet className="size-4" />
        {cargando ? "Generando..." : "Guardar en Google Wallet"}
      </Button>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}
