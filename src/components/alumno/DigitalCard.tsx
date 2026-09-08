import { QRCodeCanvas } from "qrcode.react"
import type { RefObject } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { temaDeCarnet } from "@/lib/carnet"
import type { Student } from "@/types/student"

interface DigitalCardProps {
  alumno: Student
  qrRef?: RefObject<HTMLCanvasElement | null>
  logoAcademia?: string | null
}

const TIPO_LABEL: Record<Student["tipo"], string> = {
  academia: "Academia",
  privada: "Privada",
  ambas: "Academia + privada",
}

export function DigitalCard({ alumno, qrRef, logoAcademia }: DigitalCardProps) {
  const tema = temaDeCarnet(alumno.tema_carnet)

  return (
    <div
      className="relative mx-auto flex w-full max-w-[320px] flex-col items-center gap-3 overflow-hidden rounded-2xl border p-6 text-center shadow-lg"
      style={{ background: tema.bg, borderColor: `rgba(${tema.rgb},0.4)` }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 25%, rgba(${tema.rgb},0.3), transparent 70%)`,
        }}
      />

      <div className="relative flex items-center justify-center gap-2.5">
        {logoAcademia && (
          <>
            <img src={logoAcademia} alt="" className="h-6 w-auto max-w-20 object-contain" />
            <span className="h-4 w-px bg-white/25" />
          </>
        )}
        <p className="font-heading text-lg font-black italic tracking-tight">
          <span className="text-white">Dance</span>
          <span style={{ color: tema.hex }}>M</span>
        </p>
      </div>
      <p className="relative text-[10px] font-medium tracking-[0.3em] text-white/80">
        CARNET DIGITAL
      </p>

      <Avatar className="relative size-20 border-2" style={{ borderColor: tema.hex }}>
        <AvatarImage src={alumno.foto ?? undefined} alt={alumno.nombre} />
        <AvatarFallback className="text-lg">
          {alumno.nombre.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="relative flex flex-col gap-0.5">
        <p className="text-lg font-extrabold uppercase leading-tight text-white">
          {alumno.nombre}
        </p>
        <p className="text-xs font-semibold tracking-[0.2em] text-white/80">
          {alumno.nivel.toUpperCase()}
        </p>
      </div>

      <div className="relative rounded-xl bg-white p-3">
        <QRCodeCanvas ref={qrRef} value={alumno.documento} size={110} />
      </div>
      <p className="relative text-[10px] tracking-widest text-white/60">
        ÚNICO E INTRANSFERIBLE
      </p>

      <span
        className="relative rounded-full px-3 py-1 text-xs font-medium text-white"
        style={{
          backgroundColor: `rgba(${tema.rgb},0.25)`,
          border: `1px solid rgba(${tema.rgb},0.5)`,
        }}
      >
        {TIPO_LABEL[alumno.tipo]}
      </span>
    </div>
  )
}
