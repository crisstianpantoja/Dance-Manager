import { useState, type FormEvent } from "react"
import { Navigate } from "react-router-dom"

import { BrandLogo } from "@/components/BrandLogo"
import { OWNER_EMAIL } from "@/components/OwnerRoute"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

/**
 * Login separado del de las academias: es una sola cuenta de Supabase
 * Auth sin fila en `profiles` (no pertenece a ninguna organización), así
 * que no puede pasar por AuthContext.signIn (ese exige un perfil). Entra
 * directo con supabase.auth.signInWithPassword.
 */
export function OwnerLoginPage() {
  const { session, loading } = useAuth()
  const [documento, setDocumento] = useState("")
  const [password, setPassword] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && session?.user.email === OWNER_EMAIL) {
    return <Navigate to="/dueno" replace />
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: `${documento.trim()}@owner.dance.local`,
      password,
    })

    if (error) {
      setError("Documento o contraseña incorrectos.")
    }

    setEnviando(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8 shadow-xl">
        <BrandLogo variant="wordmark" className="mb-8 h-6 w-auto" />
        <h1 className="mb-1 text-xl font-extrabold tracking-tight text-text">Panel de dueño</h1>
        <p className="mb-8 text-sm text-text-muted">Acceso exclusivo, separado de las academias.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="documento" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Documento
            </label>
            <input
              id="documento"
              name="documento"
              autoComplete="username"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              required
              className="w-full rounded-control border border-border bg-background px-3 py-2.5 text-sm text-text outline-none focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-control border border-border bg-background px-3 py-2.5 text-sm text-text outline-none focus:border-brand"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-control bg-brand py-3 text-sm font-bold uppercase tracking-wider text-white transition-opacity disabled:opacity-60"
          >
            {enviando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  )
}
