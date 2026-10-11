import fullPurple from "@/assets/brand/dance-manager-full-purple.webp"
import fullWhite from "@/assets/brand/dance-manager-full-white.webp"
import wordmarkPurple from "@/assets/brand/dance-manager-wordmark-purple.webp"
import wordmarkWhite from "@/assets/brand/dance-manager-wordmark-white.webp"
import { useTheme } from "@/hooks/useTheme"

const FUENTES = {
  full: { light: fullPurple, dark: fullWhite },
  wordmark: { light: wordmarkPurple, dark: wordmarkWhite },
}

interface BrandLogoProps {
  variant: "full" | "wordmark"
  className?: string
}

/** Logo oficial de Dance Manager (el producto), no el de la academia.
 * Se usa donde la app todavía no sabe de qué academia es (login) o
 * cuando una academia no subió su propio logo. Cambia de color según
 * el tema claro/oscuro para mantener contraste. */
export function BrandLogo({ variant, className }: BrandLogoProps) {
  const { tema } = useTheme()
  const src = FUENTES[variant][tema]

  return <img src={src} alt="Dance Manager" className={className} />
}
