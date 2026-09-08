import { useEffect, useState } from "react"

import { aplicarColorDeMarca, restaurarColorDeMarcaPorDefecto } from "@/lib/brandTheme"
import { AJUSTES_POR_DEFECTO, obtenerAjustes, type AppSettings } from "@/lib/settings"

/**
 * Ajustes de marca (nombre/logo/color) de la organización dada. Se usa
 * dentro de la app ya autenticada: sin organizationId (por ejemplo,
 * antes de iniciar sesión) devuelve la marca genérica por defecto,
 * porque no hay forma de saber de qué academia es el visitante hasta
 * que se autentica (eso llegará con el subdominio por academia).
 *
 * De paso aplica el color de marca a toda la app (variables CSS
 * globales), y lo restaura al valor por defecto al salir de la sesión.
 */
export function useAppSettings(organizationId: string | null | undefined): AppSettings {
  const [ajustes, setAjustes] = useState<AppSettings>(AJUSTES_POR_DEFECTO)

  useEffect(() => {
    if (!organizationId) {
      setAjustes(AJUSTES_POR_DEFECTO)
      restaurarColorDeMarcaPorDefecto()
      return
    }

    let activo = true
    obtenerAjustes(organizationId).then((valor) => {
      if (activo) setAjustes(valor)
    })
    return () => {
      activo = false
    }
  }, [organizationId])

  useEffect(() => {
    aplicarColorDeMarca(ajustes.color_primario)
    return () => restaurarColorDeMarcaPorDefecto()
  }, [ajustes.color_primario])

  return ajustes
}
