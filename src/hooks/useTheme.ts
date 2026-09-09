import { useEffect, useState } from "react"

type Tema = "light" | "dark"

function leerTemaInicial(): Tema {
  if (typeof document !== "undefined") {
    const actual = document.documentElement.dataset.theme
    if (actual === "light" || actual === "dark") return actual
  }
  return "dark"
}

/** Tema claro/oscuro de la app (no del carnet, que siempre es oscuro fijo).
 * Persiste en localStorage y se aplica como data-theme en <html>; el
 * script inline de index.html ya lo fija antes del primer render para
 * evitar el parpadeo del tema equivocado. */
export function useTheme() {
  const [tema, setTema] = useState<Tema>(leerTemaInicial)

  useEffect(() => {
    document.documentElement.dataset.theme = tema
    localStorage.setItem("dm-theme", tema)
  }, [tema])

  function alternar() {
    setTema((actual) => (actual === "dark" ? "light" : "dark"))
  }

  return { tema, alternar }
}
