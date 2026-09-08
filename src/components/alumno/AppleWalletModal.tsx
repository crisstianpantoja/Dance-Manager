import { QRCodeCanvas } from "qrcode.react"
import { CheckCircle2, Wallet } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { temaDeCarnet } from "@/lib/carnet"
import { agregarAppleWalletDemo } from "@/lib/walletService"
import type { Student } from "@/types/student"

interface AppleWalletModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alumno: Student
  nombreAcademia: string
}

/**
 * Simulación visual de "Añadir a Apple Wallet" — NO es una integración
 * real. No genera ningún .pkpass, no firma nada, no llama a ninguna API
 * de Apple. Ver src/lib/walletService.ts para el porqué y cómo se
 * reemplazaría esto por la integración real más adelante.
 */
export function AppleWalletModal({
  open,
  onOpenChange,
  alumno,
  nombreAcademia,
}: AppleWalletModalProps) {
  const [agregando, setAgregando] = useState(false)
  const [agregado, setAgregado] = useState(false)
  const tema = temaDeCarnet(alumno.tema_carnet)

  function cerrar() {
    onOpenChange(false)
    // Pequeño respiro antes de resetear, para no ver el cambio de vista
    // mientras el modal todavía se está cerrando.
    setTimeout(() => setAgregado(false), 200)
  }

  async function handleAgregar() {
    setAgregando(true)
    await agregarAppleWalletDemo()
    setAgregando(false)
    setAgregado(true)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && cerrar()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Añadir a Apple Wallet</span>
            <Badge variant="muted">Demo</Badge>
          </DialogTitle>
        </DialogHeader>

        {agregado ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-12 text-success" />
            <p className="font-semibold text-text">Carnet agregado correctamente</p>
            <p className="text-xs text-text-muted">Modo demostración</p>
            <Button variant="outline" size="sm" onClick={cerrar} className="mt-2">
              Listo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            <div
              className="relative flex w-full flex-col items-center gap-3 overflow-hidden rounded-2xl border p-5 text-center"
              style={{ background: tema.bg, borderColor: `rgba(${tema.rgb},0.4)` }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 50% 20%, rgba(${tema.rgb},0.3), transparent 70%)`,
                }}
              />
              <p className="relative text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70">
                {nombreAcademia}
              </p>
              <p className="relative text-lg font-extrabold uppercase leading-tight text-white">
                {alumno.nombre}
              </p>
              <p className="relative text-xs font-medium text-white/70">
                Alumno · Nivel {alumno.nivel}
              </p>

              <div className="relative flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                <span className="size-1.5 rounded-full bg-success" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                  Membresía activa
                </span>
              </div>

              <div className="relative rounded-xl bg-white p-2.5">
                <QRCodeCanvas value={alumno.documento} size={90} />
              </div>
            </div>

            <Button onClick={handleAgregar} disabled={agregando} className="w-full">
              <Wallet className="size-4" />
              {agregando ? "Agregando..." : "Añadir"}
            </Button>
            <p className="text-center text-[11px] text-text-muted">
              Esto es una simulación visual; todavía no agrega un pase real a Apple Wallet.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
