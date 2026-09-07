import { useEffect, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { TeacherDigitalCard } from "@/components/profesor/TeacherDigitalCard"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import type { Teacher } from "@/types/teacher"

export function TeacherCarnetPage() {
  const { profile } = useAuth()
  const [profesor, setProfesor] = useState<Teacher | null>(null)
  const [academiaNombre, setAcademiaNombre] = useState<string | null>(null)
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (!profile?.id) return
      setCargando(true)

      const [{ data: profesorData }, { data: tokenData }, { data: sedesData }] = await Promise.all([
        supabase.from("teachers").select("*").eq("id", profile.id).single(),
        supabase.from("teacher_qr_tokens").select("qr_token").eq("teacher_id", profile.id).single(),
        supabase
          .from("teacher_academies")
          .select("academia_id, is_primary, academies(nombre)")
          .eq("teacher_id", profile.id),
      ])

      setProfesor((profesorData as Teacher) ?? null)
      setQrToken(tokenData?.qr_token ?? null)

      const sedes = (sedesData as { is_primary: boolean; academies: { nombre: string } | { nombre: string }[] | null }[]) ?? []
      const principal = sedes.find((s) => s.is_primary) ?? sedes[0]
      const academia = Array.isArray(principal?.academies) ? principal?.academies[0] : principal?.academies
      setAcademiaNombre(academia?.nombre ?? null)

      setCargando(false)
    }

    cargar()
  }, [profile?.id])

  if (cargando || !profesor) {
    return <p className="text-sm text-text-muted">Cargando...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-text">Mi carnet</h1>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <TeacherDigitalCard profesor={profesor} academiaNombre={academiaNombre} qrToken={qrToken} />
          <p className="text-xs text-text-muted">
            Muestra este código en recepción para registrar tu asistencia.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
