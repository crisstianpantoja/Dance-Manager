/**
 * Aplica el color de marca de la organización a las variables CSS que
 * ya usa toda la app (--color-brand y sus variantes, definidas en
 * src/index.css) — así ninguna pantalla necesita saber qué color usar,
 * solo heredan la clase Tailwind de siempre (bg-brand, text-brand...).
 * Las variantes claro/oscuro se derivan del color elegido por HSL en
 * vez de pedirle tres colores al admin.
 */

const VARIABLES_TEMA = ["--color-brand", "--color-brand-light", "--color-brand-dark"] as const

function hexAHsl(hex: string): [number, number, number] | null {
  const coincide = /^#([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!coincide) return null

  const r = parseInt(coincide[1].slice(0, 2), 16) / 255
  const g = parseInt(coincide[1].slice(2, 4), 16) / 255
  const b = parseInt(coincide[1].slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return [0, 0, l * 100]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0)
      break
    case g:
      h = (b - r) / d + 2
      break
    default:
      h = (r - g) / d + 4
  }
  h *= 60

  return [h, s * 100, l * 100]
}

function hslAHex(h: number, s: number, l: number): string {
  const sN = s / 100
  const lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2

  let [r, g, b] = [0, 0, 0]
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  const canal = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0")

  return `#${canal(r)}${canal(g)}${canal(b)}`.toUpperCase()
}

/** Aplica el color de marca dado (o restaura el diseño por defecto si es inválido/nulo). */
export function aplicarColorDeMarca(colorBase: string | null | undefined) {
  const hsl = colorBase ? hexAHsl(colorBase) : null

  if (!hsl) {
    VARIABLES_TEMA.forEach((variable) => document.documentElement.style.removeProperty(variable))
    return
  }

  const [h, s, l] = hsl
  const claro = hslAHex(h, s, Math.min(88, l + 20))
  const oscuro = hslAHex(h, s, Math.max(12, l - 20))

  document.documentElement.style.setProperty("--color-brand", colorBase!)
  document.documentElement.style.setProperty("--color-brand-light", claro)
  document.documentElement.style.setProperty("--color-brand-dark", oscuro)
}

export function restaurarColorDeMarcaPorDefecto() {
  VARIABLES_TEMA.forEach((variable) => document.documentElement.style.removeProperty(variable))
}
