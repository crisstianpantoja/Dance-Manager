import { Wallet } from "lucide-react"
import { useEffect, useState } from "react"

import { AppleWalletModal } from "@/components/alumno/AppleWalletModal"
import { CarnetDownloadButton } from "@/components/alumno/CarnetDownloadButton"
import { DigitalCard } from "@/components/alumno/DigitalCard"
import { GoogleWalletButton } from "@/components/alumno/GoogleWalletButton"
import { ThemePicker } from "@/components/alumno/ThemePicker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import type { ThemeId } from "@/lib/carnet"
import { formatearFechaObjeto } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import type { Student } from "@/types/student"

function proximoCambioTemaDe(alumno: Student): Date | null {
  if (!alumno.tema_carnet_actualizado_en) return null
  const fecha = new Date(alumno.tema_carnet_actualizado_en)
  fecha.setMonth(fecha.getMonth() + 12)
  return fecha
}

function puedeCambiarTema(alumno: Student): boolean {
  const proximo = proximoCambioTemaDe(alumno)
  return !proximo || proximo <= new Date()
}

export function CarnetPage() {
  const { profile } = useAuth()
  const [alumno, setAlumno] = useState<Student | null>(null)
  const [nombreAcademia, setNombreAcademia] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [walletAbierto, setWalletAbierto] = useState(false)

  useEffect(() => {
    async function cargar() {
      if (!profile?.id) return
      setCargando(true)

      const { data: alumnoData } = await supabase
        .from("students")
        .select("*")
        .eq("id", profile.id)
        .single()

      setAlumno((alumnoData as Student) ?? null)

      if (alumnoData?.academia_id) {
        const { data: academia } = await supabase
          .from("academies")
          .select("nombre")
          .eq("id", alumnoData.academia_id)
          .single()
        setNombreAcademia(academia?.nombre ?? null)
      }

      setCargando(false)
    }

    cargar()
  }, [profile?.id])

  async function handleCambiarTema(id: ThemeId) {
    if (!alumno || !puedeCambiarTema(alumno)) return
    const anterior = { tema_carnet: alumno.tema_carnet, actualizado: alumno.tema_carnet_actualizado_en }
    const ahora = new Date().toISOString()
    setAlumno({ ...alumno, tema_carnet: id, tema_carnet_actualizado_en: ahora })

    const { error } = await supabase
      .from("students")
      .update({ tema_carnet: id, tema_carnet_actualizado_en: ahora })
      .eq("id", alumno.id)

    if (error) {
      setAlumno((actual) =>
        actual
          ? { ...actual, tema_carnet: anterior.tema_carnet, tema_carnet_actualizado_en: anterior.actualizado }
          : actual,
      )
    }
  }

  if (cargando || !alumno) {
    return <p className="text-sm text-text-muted">Cargando...</p>
  }

  const proximoCambioTema = proximoCambioTemaDe(alumno)
  const temaBloqueado = !puedeCambiarTema(alumno)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Mi carnet</h1>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <DigitalCard alumno={alumno} />
          <ThemePicker
            value={alumno.tema_carnet}
            onChange={handleCambiarTema}
            disabled={temaBloqueado}
          />
          <p className="text-xs text-text-muted">
            {temaBloqueado && proximoCambioTema
              ? `Podrás cambiar el color del carnet a partir del ${formatearFechaObjeto(proximoCambioTema)}.`
              : "Puedes elegir el color del carnet una vez cada 12 meses."}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <CarnetDownloadButton alumno={alumno} />
            <GoogleWalletButton />
            <Button variant="outline" size="sm" onClick={() => setWalletAbierto(true)}>
              <Wallet className="size-4" />
              Añadir a Apple Wallet
            </Button>
          </div>
          <p className="text-center text-[11px] text-text-muted">
            "Añadir a Apple Wallet" es una demostración visual; todavía no agrega un pase real.
          </p>

          <p className="text-xs text-text-muted">
            Muestra este código en la puerta para registrar tu asistencia.
          </p>
        </CardContent>
      </Card>

      <AppleWalletModal
        open={walletAbierto}
        onOpenChange={setWalletAbierto}
        alumno={alumno}
        nombreAcademia={nombreAcademia ?? "Dance Manager"}
      />
    </div>
  )
}
