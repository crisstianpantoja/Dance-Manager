import { AnimatePresence, motion } from "framer-motion"
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

interface ModalContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

interface ModalProviderProps {
  children: ReactNode
  /** Si se da (junto con onOpenChange), el modal queda controlado desde
   * afuera (ej. un botón "Editar" en una tabla), igual que el Dialog de
   * shadcn. Sin estas props, administra su propio estado con
   * ModalTrigger, como el componente original. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const ModalProvider = ({ children, open: openControlado, onOpenChange }: ModalProviderProps) => {
  const [openInterno, setOpenInterno] = useState(false)
  const esControlado = openControlado !== undefined
  const open = esControlado ? openControlado : openInterno

  function setOpen(valor: boolean) {
    if (!esControlado) setOpenInterno(valor)
    onOpenChange?.(valor)
  }

  return <ModalContext.Provider value={{ open, setOpen }}>{children}</ModalContext.Provider>
}

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error("useModal debe usarse dentro de un ModalProvider")
  }
  return context
}

export function Modal({ children, open, onOpenChange }: ModalProviderProps) {
  return (
    <ModalProvider open={open} onOpenChange={onOpenChange}>
      {children}
    </ModalProvider>
  )
}

export const ModalTrigger = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  const { setOpen } = useModal()
  return (
    <button
      type="button"
      className={cn(
        "relative overflow-hidden rounded-control px-4 py-2 text-center text-text",
        className,
      )}
      onClick={() => setOpen(true)}
    >
      {children}
    </button>
  )
}

export const ModalBody = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  const { open, setOpen } = useModal()

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto"
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [open])

  const modalRef = useRef<HTMLDivElement>(null)
  useOutsideClick(modalRef, () => setOpen(false))

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          className="fixed inset-0 z-50 flex h-full w-full items-center justify-center [perspective:800px] [transform-style:preserve-3d]"
        >
          <Overlay />

          <motion.div
            ref={modalRef}
            className={cn(
              "relative z-50 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface",
              className,
            )}
            initial={{ opacity: 0, scale: 0.5, rotateX: 40, y: 40 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 15 }}
          >
            <CloseIcon />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const ModalContent = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  return (
    <div className={cn("flex flex-1 flex-col gap-4 overflow-y-auto p-6", className)}>
      {children}
    </div>
  )
}

export const ModalHeader = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  return <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>
}

export const ModalTitle = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  return <h2 className={cn("text-lg font-semibold text-text", className)}>{children}</h2>
}

export const ModalDescription = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  return <p className={cn("text-sm text-text-muted", className)}>{children}</p>
}

export const ModalFooter = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  return (
    <div className={cn("flex justify-end gap-2 bg-surface-hover p-4", className)}>{children}</div>
  )
}

const Overlay = ({ className }: { className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      className={cn("fixed inset-0 z-50 h-full w-full bg-black/70", className)}
    />
  )
}

const CloseIcon = () => {
  const { setOpen } = useModal()
  return (
    <button
      type="button"
      onClick={() => setOpen(false)}
      className="group absolute right-4 top-4 z-10"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 text-text-muted transition duration-200 group-hover:rotate-3 group-hover:scale-125 group-hover:text-text"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M18 6l-12 12" />
        <path d="M6 6l12 12" />
      </svg>
      <span className="sr-only">Cerrar</span>
    </button>
  )
}

// Detecta clics fuera del modal para cerrarlo. Los menús de Radix (Select,
// DropdownMenu, Popover...) se renderizan en un portal fuera del modal, así
// que un clic en sus opciones cuenta como "afuera" aunque visualmente esté
// sobre el modal; por eso se ignoran los clics dentro de ese wrapper.
function useOutsideClick(ref: React.RefObject<HTMLElement | null>, callback: () => void) {
  useEffect(() => {
    function listener(event: MouseEvent | TouchEvent) {
      const objetivo = event.target as Node

      if (!ref.current || ref.current.contains(objetivo)) {
        return
      }

      if (objetivo instanceof Element && objetivo.closest("[data-radix-popper-content-wrapper]")) {
        return
      }

      callback()
    }

    document.addEventListener("mousedown", listener)
    document.addEventListener("touchstart", listener)

    return () => {
      document.removeEventListener("mousedown", listener)
      document.removeEventListener("touchstart", listener)
    }
  }, [ref, callback])
}
