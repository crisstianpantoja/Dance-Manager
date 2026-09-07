import { QRCodeCanvas } from "qrcode.react"
import { useEffect, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import type { Teacher } from "@/types/teacher"

interface TeacherQrDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profesor: Teacher | null
}

export function TeacherQrDialog({ open, onOpenChange, profesor }: TeacherQrDialogProps) {
  const [token, setToken] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!open || !profesor) return
    setCargando(true)
    supabase
      .from("teacher_qr_tokens")
      .select("qr_token")
      .eq("teacher_id", profesor.id)
      .single()
      .then(({ data }) => {
        setToken(data?.qr_token ?? null)
        setCargando(false)
      })
  }, [open, profesor])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR de {profesor?.nombre}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="size-16">
            <AvatarImage src={profesor?.foto ?? undefined} alt={profesor?.nombre} />
            <AvatarFallback>{profesor?.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          {cargando ? (
            <p className="text-sm text-text-muted">Cargando...</p>
          ) : token ? (
            <div className="rounded-xl bg-white p-4">
              <QRCodeCanvas value={token} size={200} />
            </div>
          ) : (
            <p className="text-sm text-text-muted">Este profesor no tiene token QR todavía.</p>
          )}

          <p className="text-center text-xs text-text-muted">
            Este código identifica al profesor para registrar su asistencia. Es temporal, más
            adelante irá dentro de su carnet digital.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
