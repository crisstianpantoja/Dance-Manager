import { Navigate } from "react-router-dom"

import { useAuth } from "@/context/AuthContext"

// Cuenta única y separada de cualquier academia: no es un admin más de
// una organización, es una cuenta de Supabase Auth aparte (ver
// OwnerLoginPage) identificada solo por su email. Mismo valor
// verificado en el servidor (supabase/functions/owner-panel); el
// chequeo aquí es solo para no renderizar la pantalla a nadie más, la
// Edge Function es la que realmente protege los datos.
export const OWNER_EMAIL = "1088593872@owner.dance.local"

interface OwnerRouteProps {
  children: React.ReactNode
}

export function OwnerRoute({ children }: OwnerRouteProps) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  if (!session || session.user.email !== OWNER_EMAIL) {
    return <Navigate to="/dueno/login" replace />
  }

  return <>{children}</>
}
