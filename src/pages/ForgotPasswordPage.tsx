import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { documentoToEmail, supabase } from "@/lib/supabase"

export function ForgotPasswordPage() {
  const [codigoAcademia, setCodigoAcademia] = useState("")
  const [documento, setDocumento] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)

    const { error } = await supabase.auth.resetPasswordForEmail(
      documentoToEmail(documento, codigoAcademia),
      { redirectTo: `${window.location.origin}/actualizar-password` },
    )

    setEnviando(false)

    if (error) {
      setError("No pudimos procesar la solicitud. Verifica tu documento.")
      return
    }

    setEnviado(true)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <h1 className="mb-6 text-center text-2xl font-bold text-text">
          Recuperar contraseña
        </h1>

        <Card>
          <CardContent className="pt-6">
            {enviado ? (
              <p className="text-center text-sm text-success">
                Si el documento está registrado, recibirás instrucciones para
                restablecer tu contraseña.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="codigoAcademia">Código de academia</Label>
                  <Input
                    id="codigoAcademia"
                    placeholder="Código de tu academia"
                    value={codigoAcademia}
                    onChange={(e) => setCodigoAcademia(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="documento">Documento</Label>
                  <Input
                    id="documento"
                    placeholder="Número de documento"
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">
                    {error}
                  </p>
                )}

                <Button type="submit" disabled={enviando}>
                  {enviando ? "Enviando..." : "Enviar instrucciones"}
                </Button>
              </form>
            )}

            <Link
              to="/login"
              className="mt-4 block text-center text-sm text-text-muted transition-colors hover:text-brand-light"
            >
              Volver a iniciar sesión
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
