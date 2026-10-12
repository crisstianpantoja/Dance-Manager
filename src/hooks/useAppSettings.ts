import { useEffect, useState } from "react"

import {
  aplicarColorDeMarca,
  aplicarColorSecundario,
  restaurarColorDeMarcaPorDefecto,
  restaurarColorSecundarioPorDefecto,
} from "@/lib/brandTheme"
import { AJUSTES_POR_DEFECTO, obtenerAjustes, type AppSettings } from "@/lib/settings"

// SettingsPage guarda los ajustes directo en Supabase, sin pasar por
// este hook: cada <xxxLayout> que use useAppSettings tiene su propia
// copia en memoria, que nadie más actualiza. Este mini pub-sub permite
// que, justo después de guardar, todas esas copias se refresquen al
// instante en vez de esperar a que el usuario recargue la página.
const oyentesPorOrganizacion = new Map<string, Set<(ajustes: AppSettings) => void>>()

// Mientras se resuelve la consulta a Supabase (medio segundo, pero se
// nota), el hook no tiene más remedio que devolver algo: sin esta
// caché devolvía siempre la marca genérica de Dance Manager, así que
// cada recarga mostraba un parpadeo "Dance Manager" -> marca real de
// la academia. Guardando el último valor conocido por organización en
// localStorage, la recarga arranca directo con la marca correcta.
function claveCache(organizationId: string) {
  return `dm-ajustes-${organizationId}`
}

function leerCache(organizationId: string): AppSettings | null {
  try {
    const bruto = localStorage.getItem(claveCache(organizationId))
    return bruto ? (JSON.parse(bruto) as AppSettings) : null
  } catch {
    return null
  }
}

function guardarCache(organizationId: string, ajustes: AppSettings) {
  try {
    localStorage.setItem(claveCache(organizationId), JSON.stringify(ajustes))
  } catch {
    // localStorage puede no estar disponible (navegación privada, etc.); no es crítico.
  }
}

export function notificarAjustesActualizados(organizationId: string, ajustes: AppSettings) {
  guardarCache(organizationId, ajustes)
  oyentesPorOrganizacion.get(organizationId)?.forEach((oyente) => oyente(ajustes))
}

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
  const [ajustes, setAjustes] = useState<AppSettings>(
    () => (organizationId && leerCache(organizationId)) || AJUSTES_POR_DEFECTO,
  )

  useEffect(() => {
    if (!organizationId) {
      setAjustes(AJUSTES_POR_DEFECTO)
      restaurarColorDeMarcaPorDefecto()
      restaurarColorSecundarioPorDefecto()
      return
    }

    const cacheado = leerCache(organizationId)
    if (cacheado) setAjustes(cacheado)

    let activo = true
    obtenerAjustes(organizationId).then((valor) => {
      if (activo) {
        setAjustes(valor)
        guardarCache(organizationId, valor)
      }
    })

    const oyente = (nuevosAjustes: AppSettings) => {
      if (activo) setAjustes(nuevosAjustes)
    }
    const oyentes = oyentesPorOrganizacion.get(organizationId) ?? new Set()
    oyentes.add(oyente)
    oyentesPorOrganizacion.set(organizationId, oyentes)

    return () => {
      activo = false
      oyentes.delete(oyente)
    }
  }, [organizationId])

  useEffect(() => {
    aplicarColorDeMarca(ajustes.color_primario)
    return () => restaurarColorDeMarcaPorDefecto()
  }, [ajustes.color_primario])

  useEffect(() => {
    aplicarColorSecundario(ajustes.color_secundario)
    return () => restaurarColorSecundarioPorDefecto()
  }, [ajustes.color_secundario])

  return ajustes
}
