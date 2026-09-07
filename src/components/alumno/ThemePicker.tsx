import { Check } from "lucide-react"

import { THEMES, type ThemeId } from "@/lib/carnet"
import { cn } from "@/lib/utils"

interface ThemePickerProps {
  value: string | null
  onChange: (id: ThemeId) => void
  disabled?: boolean
}

export function ThemePicker({ value, onChange, disabled }: ThemePickerProps) {
  const actual = (value || "purple") as ThemeId

  return (
    <div className="flex items-center gap-3">
      {(Object.keys(THEMES) as ThemeId[]).map((id) => {
        const tema = THEMES[id]
        const seleccionado = actual === id

        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(id)}
            title={tema.name}
            aria-label={`Tema ${tema.name}`}
            className={cn(
              "flex size-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 disabled:opacity-50 disabled:hover:scale-100",
              seleccionado ? "border-white" : "border-transparent",
            )}
            style={{ backgroundColor: tema.hex }}
          >
            {seleccionado && <Check className="size-4 text-black/70" />}
          </button>
        )
      })}
    </div>
  )
}
