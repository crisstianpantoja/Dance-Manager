import { Navigate } from "react-router-dom"

import { useAuth } from "@/context/AuthContext"
import type { Rol } from "@/types/auth"

interface ProtectedRouteProps {
  children: React.ReactNode
  rolesPermitidos?: Rol[]
}

export function ProtectedRoute({ children, rolesPermitidos }: ProtectedRouteProps) {
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

  if (rolesPermitidos && !rolesPermitidos.includes(profile.rol)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
