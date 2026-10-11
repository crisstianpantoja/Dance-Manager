import { Navigate } from "react-router-dom"

import { useAuth } from "@/context/AuthContext"

// Mismo documento verificado en el servidor (supabase/functions/owner-panel).
// Este chequeo en el cliente es solo para no mostrar el enlace/ruta a nadie
// más; la Edge Function es la que realmente protege los datos.
export const DOCUMENTO_DUENO = "1018502604"

interface OwnerRouteProps {
  children: React.ReactNode
}

export function OwnerRoute({ children }: OwnerRouteProps) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />
  }

  if (profile.documento !== DOCUMENTO_DUENO) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
