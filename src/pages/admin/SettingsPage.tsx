import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { actualizarAjustes, obtenerAjustes, COLOR_PRIMARIO_POR_DEFECTO } from "@/lib/settings"
import { subirFoto } from "@/lib/storage"
import { mensajeDeError } from "@/lib/errors"

export function SettingsPage() {
  const { profile } = useAuth()
  const organizationId = profile?.organization_id
  const [nombreApp, setNombreApp] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [archivoLogo, setArchivoLogo] = useState<File | null>(null)
  const [colorPrimario, setColorPrimario] = useState(COLOR_PRIMARIO_POR_DEFECTO)
  const [colorSecundario, setColorSecundario] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    if (!organizationId) return

    setCargando(true)
    obtenerAjustes(organizationId).then((ajustes) => {
      setNombreApp(ajustes.nombre_app)
      setLogoUrl(ajustes.logo_url)
      setColorPrimario(ajustes.color_primario)
      setColorSecundario(ajustes.color_secundario)
      setCargando(false)
    })
  }, [organizationId])

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    if (!organizationId) return
    setError(null)
    setExito(false)
    setGuardando(true)

    try {
      let urlLogo = logoUrl

      if (archivoLogo) {
        urlLogo = await subirFoto(archivoLogo, "marca")
      }

      await actualizarAjustes(organizationId, {
        nombre_app: nombreApp,
        logo_url: urlLogo,
        color_primario: colorPrimario,
        color_secundario: colorSecundario,
      })
      setLogoUrl(urlLogo)
      setArchivoLogo(null)
      setExito(true)
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar los ajustes."))
    } finally {
      setGuardando(false)
    }
  }

  const vistaPrevia = archivoLogo ? URL.createObjectURL(archivoLogo) : logoUrl

  if (cargando) {
    return <p className="text-sm text-text-muted">Cargando...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Ajustes</h1>

      <Card>
        <CardContent className="py-6">
          <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-surface-hover">
                {vistaPrevia ? (
                  <img src={vistaPrevia} alt="Logo" className="size-full object-contain" />
                ) : (
                  <span className="text-xs text-text-muted">Sin logo</span>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <Label htmlFor="logo">Logo de la app</Label>
                <input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setArchivoLogo(e.target.files?.[0] ?? null)}
                  className="w-full max-w-full text-sm text-text-muted file:mr-3 file:rounded-control file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:text-text"
                />
                <p className="text-xs text-text-muted">
                  Aparece en el menú de tu academia. Déjalo vacío para usar el diseño por defecto.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="nombreApp">Nombre de la app</Label>
              <Input
                id="nombreApp"
                value={nombreApp}
                onChange={(e) => setNombreApp(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="colorPrimario">Color de marca</Label>
              <div className="flex items-center gap-3">
                <input
                  id="colorPrimario"
                  type="color"
                  value={colorPrimario}
                  onChange={(e) => setColorPrimario(e.target.value.toUpperCase())}
                  className="h-11 w-14 cursor-pointer rounded-control border border-border-strong bg-surface"
                />
                <Input
                  value={colorPrimario}
                  onChange={(e) => setColorPrimario(e.target.value.toUpperCase())}
                  className="max-w-32 font-mono uppercase"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-text-muted">
                Se usa en los botones y acentos del menú de tu academia. Dance Manager sigue
                mostrando su propia marca en la pantalla de inicio de sesión.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="colorSecundario">Color secundario (opcional)</Label>
              <div className="flex items-center gap-3">
                <input
                  id="colorSecundario"
                  type="color"
                  value={colorSecundario ?? colorPrimario}
                  onChange={(e) => setColorSecundario(e.target.value.toUpperCase())}
                  className="h-11 w-14 cursor-pointer rounded-control border border-border-strong bg-surface"
                />
                <Input
                  value={colorSecundario ?? ""}
                  onChange={(e) => setColorSecundario(e.target.value ? e.target.value.toUpperCase() : null)}
                  placeholder="Sin definir"
                  className="max-w-32 font-mono uppercase"
                  maxLength={7}
                />
                {colorSecundario && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setColorSecundario(null)}>
                    Quitar
                  </Button>
                )}
              </div>
              <p className="text-xs text-text-muted">
                Si tu marca tiene dos colores, pon aquí el segundo. Déjalo vacío para que se
                calcule automáticamente a partir del color de marca.
              </p>
            </div>

            {error && (
              <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
            )}
            {exito && (
              <p className="rounded-control bg-success/10 px-3 py-2 text-sm text-success">
                Ajustes guardados.
              </p>
            )}

            <Button type="submit" disabled={guardando} className="self-start">
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
