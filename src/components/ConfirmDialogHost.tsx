import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmOptions {
  title?: string
  confirmText?: string
  cancelText?: string
  /** Pinta el botón de confirmar en rojo, para acciones destructivas. */
  destructive?: boolean
}

interface ConfirmState extends ConfirmOptions {
  description: string
}

let resolverActual: ((valor: boolean) => void) | null = null
let actualizarEstado: ((estado: ConfirmState | null) => void) | null = null

/**
 * Reemplazo de window.confirm() con el diseño de la app. Un solo
 * <ConfirmDialogHost /> montado en App.tsx atiende cualquier llamada,
 * desde cualquier componente, sin que cada uno maneje su propio estado.
 */
export function confirmDialog(description: string, options?: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    resolverActual?.(false)
    resolverActual = resolve
    actualizarEstado?.({ description, ...options })
  })
}

export function ConfirmDialogHost() {
  const [estado, setEstado] = useState<ConfirmState | null>(null)
  actualizarEstado = setEstado

  function cerrar(valor: boolean) {
    setEstado(null)
    resolverActual?.(valor)
    resolverActual = null
  }

  return (
    <AlertDialog open={estado !== null} onOpenChange={(open) => !open && cerrar(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{estado?.title ?? "¿Estás seguro?"}</AlertDialogTitle>
          <AlertDialogDescription>{estado?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => cerrar(false)}>
            {estado?.cancelText ?? "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => cerrar(true)}
            className={
              estado?.destructive ? "bg-error text-white shadow-error/20 hover:bg-error/90" : undefined
            }
          >
            {estado?.confirmText ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
