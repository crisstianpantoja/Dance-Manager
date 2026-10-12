import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface PromptOptions {
  title?: string
  description: string
  confirmText?: string
  placeholder?: string
  /** Si se da, el botón de confirmar solo se habilita cuando el texto
   * escrito coincide exactamente (ej. "escribe el nombre para borrar"). */
  esperado?: string
}

let resolverActual: ((valor: string | null) => void) | null = null
let actualizarEstado: ((estado: PromptOptions | null) => void) | null = null

/**
 * Reemplazo de window.prompt() con el diseño de la app, para pedir un
 * texto escrito a mano (ej. confirmar un borrado escribiendo el nombre
 * exacto). Un solo <PromptDialogHost /> montado en App.tsx atiende
 * cualquier llamada.
 */
export function promptDialog(options: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    resolverActual?.(null)
    resolverActual = resolve
    actualizarEstado?.(options)
  })
}

export function PromptDialogHost() {
  const [estado, setEstado] = useState<PromptOptions | null>(null)
  const [valor, setValor] = useState("")

  actualizarEstado = (nuevo) => {
    setEstado(nuevo)
    setValor("")
  }

  function cerrar(resultado: string | null) {
    setEstado(null)
    resolverActual?.(resultado)
    resolverActual = null
  }

  const deshabilitado = estado?.esperado !== undefined && valor.trim() !== estado.esperado

  return (
    <Dialog open={estado !== null} onOpenChange={(open) => !open && cerrar(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{estado?.title ?? "Confirmar"}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {estado?.description}
          </DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          value={valor}
          placeholder={estado?.placeholder}
          onChange={(e) => setValor(e.target.value)}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => cerrar(null)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deshabilitado}
            onClick={() => cerrar(valor)}
          >
            {estado?.confirmText ?? "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
