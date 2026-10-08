import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { registrarAcademia } from "@/lib/signup"
import { guardarCodigoAcademia } from "@/lib/supabase"
import { mensajeDeError } from "@/lib/errors"

function normalizarCodigo(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
}

export function SignupPage() {
  const navigate = useNavigate()
  const [nombreAcademia, setNombreAcademia] = useState("")
  const [codigoAcademia, setCodigoAcademia] = useState("")
  const [adminNombre, setAdminNombre] = useState("")
  const [adminDocumento, setAdminDocumento] = useState("")
  const [password, setPassword] = useState("")
  const [confirmarPassword, setConfirmarPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)

    const codigoNormalizado = normalizarCodigo(codigoAcademia)
    if (codigoNormalizado.length < 3) {
      setError("El código de academia debe tener al menos 3 caracteres.")
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (password !== confirmarPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setEnviando(true)
    try {
      const resultado = await registrarAcademia({
        nombreAcademia,
        codigoAcademia: codigoNormalizado,
        adminNombre,
        adminDocumento,
        adminPassword: password,
      })
      guardarCodigoAcademia(resultado.codigo)
      navigate("/login", {
        state: { mensaje: "Tu academia quedó creada. Ingresa con tu documento y contraseña." },
      })
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear la academia."))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text">Crea tu academia</h1>
          <p className="text-sm text-text-muted">
            Empieza a gestionar tu academia de baile en Dance Manager.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nombreAcademia">Nombre de la academia</Label>
                <Input
                  id="nombreAcademia"
                  placeholder="Ej: Bachata Fusion"
                  value={nombreAcademia}
                  onChange={(e) => setNombreAcademia(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="codigoAcademia">Código de tu academia</Label>
                <Input
                  id="codigoAcademia"
                  placeholder="Ej: bachata-fusion"
                  value={codigoAcademia}
                  onChange={(e) => setCodigoAcademia(e.target.value)}
                  required
                />
                <p className="text-xs text-text-muted">
                  Tus alumnos y profesores lo usarán para ingresar. Solo letras, números y guiones.
                </p>
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <Label htmlFor="adminNombre">Tu nombre (administrador)</Label>
                <Input
                  id="adminNombre"
                  placeholder="Nombre completo"
                  value={adminNombre}
                  onChange={(e) => setAdminNombre(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="adminDocumento">Tu documento</Label>
                <Input
                  id="adminDocumento"
                  placeholder="Número de documento"
                  value={adminDocumento}
                  onChange={(e) => setAdminDocumento(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmarPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmarPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
              )}

              <Button type="submit" disabled={enviando} className="mt-2">
                {enviando ? "Creando academia..." : "Crear academia"}
              </Button>

              <Link
                to="/login"
                className="text-center text-sm text-text-muted transition-colors hover:text-brand-light"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
