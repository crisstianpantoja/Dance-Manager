import { QRCodeCanvas } from "qrcode.react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Teacher } from "@/types/teacher"

interface TeacherDigitalCardProps {
  profesor: Teacher
  academiaNombre: string | null
  qrToken: string | null
}

const TEMA = {
  bg: "linear-gradient(160deg, #1A0B2E 0%, #4B1D52 50%, #11071F 100%)",
  rgb: "149,66,223",
  hex: "#9542DF",
}

export function TeacherDigitalCard({ profesor, academiaNombre, qrToken }: TeacherDigitalCardProps) {
  return (
    <div
      className="relative mx-auto flex w-full max-w-[320px] flex-col items-center gap-3 overflow-hidden rounded-2xl border p-6 text-center shadow-lg"
      style={{ background: TEMA.bg, borderColor: `rgba(${TEMA.rgb},0.4)` }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 25%, rgba(${TEMA.rgb},0.3), transparent 70%)`,
        }}
      />

      <p className="relative font-heading text-lg font-black italic tracking-tight">
        <span className="text-white">Dance</span>
        <span style={{ color: TEMA.hex }}>M</span>
      </p>
      <p className="relative text-[10px] font-medium tracking-[0.3em] text-white/80">
        CARNET DE PROFESOR
      </p>

      <Avatar className="relative size-20 border-2" style={{ borderColor: TEMA.hex }}>
        <AvatarImage src={profesor.foto ?? undefined} alt={profesor.nombre} />
        <AvatarFallback className="text-lg">
          {profesor.nombre.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="relative flex flex-col gap-0.5">
        <p className="text-lg font-extrabold uppercase leading-tight text-white">
          {profesor.nombre}
        </p>
        <p className="text-xs font-semibold tracking-[0.2em] text-white/80">PROFESOR</p>
      </div>

      {qrToken && (
        <div className="relative rounded-xl bg-white p-3">
          <QRCodeCanvas value={qrToken} size={110} />
        </div>
      )}

      <p className="relative text-[10px] tracking-widest text-white/60">
        {profesor.documento}
      </p>

      <div className="relative flex flex-wrap items-center justify-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{
            backgroundColor: `rgba(${TEMA.rgb},0.25)`,
            border: `1px solid rgba(${TEMA.rgb},0.5)`,
          }}
        >
          {academiaNombre ?? "Sin sede asignada"}
        </span>
        <span
          className={
            "rounded-full px-3 py-1 text-xs font-medium " +
            (profesor.activo ? "bg-success/20 text-success" : "bg-white/10 text-white/60")
          }
        >
          {profesor.activo ? "Activo" : "Inactivo"}
        </span>
      </div>
    </div>
  )
}
