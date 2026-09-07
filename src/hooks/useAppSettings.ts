import { useEffect, useState } from "react"

import { AJUSTES_POR_DEFECTO, obtenerAjustes, type AppSettings } from "@/lib/settings"

export function useAppSettings(): AppSettings {
  const [ajustes, setAjustes] = useState<AppSettings>(AJUSTES_POR_DEFECTO)

  useEffect(() => {
    let activo = true
    obtenerAjustes().then((valor) => {
      if (activo) setAjustes(valor)
    })
    return () => {
      activo = false
    }
  }, [])

  return ajustes
}
