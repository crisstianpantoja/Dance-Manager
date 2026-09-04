import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"

const TITULOS: Record<string, string> = {
  admin: "Panel de administración",
  profesor: "Portal del profesor",
  alumno: "Portal del alumno",
}

export function PortalPlaceholder() {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <CardTitle>{profile ? TITULOS[profile.rol] : "Dance Manager"}</CardTitle>
          <CardDescription>
            Hola, {profile?.nombre}. Este módulo se construirá en los siguientes
            pasos.
          </CardDescription>
          <Button variant="outline" onClick={signOut} className="mt-2">
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
