import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"

/** Cantidad de pagos "en revisión", para la insignia de la nav de admin. */
export function usePagosPendientes(): number {
  const [cantidad, setCantidad] = useState(0)

  useEffect(() => {
    let activo = true

    async function cargar() {
      const { count } = await supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("estado", "pendiente")

      if (activo) setCantidad(count ?? 0)
    }

    cargar()

    function alVolverAEnfocar() {
      if (document.visibilityState === "visible") cargar()
    }

    window.addEventListener("focus", alVolverAEnfocar)
    document.addEventListener("visibilitychange", alVolverAEnfocar)
    const intervalo = window.setInterval(cargar, 20000)

    return () => {
      activo = false
      window.removeEventListener("focus", alVolverAEnfocar)
      document.removeEventListener("visibilitychange", alVolverAEnfocar)
      window.clearInterval(intervalo)
    }
  }, [])

  return cantidad
}
