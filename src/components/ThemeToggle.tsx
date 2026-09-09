import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/hooks/useTheme"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { tema, alternar } = useTheme()

  return (
    <button
      type="button"
      onClick={alternar}
      title={tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={cn("text-text-muted transition-colors hover:text-text", className)}
    >
      {tema === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  )
}
