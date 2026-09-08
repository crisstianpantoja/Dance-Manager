import { Sparkles } from "lucide-react"
import { useState, type FormEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"

interface Turno {
  pregunta: string
  respuesta: string
}

const SUGERENCIAS = [
  "¿Qué alumnos están en riesgo de no renovar?",
  "¿Cómo van las finanzas del último mes?",
  "¿Qué clases tienen menos inscritos?",
]

async function preguntarAsistente(pregunta: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("admin-assistant", { body: { pregunta } })
  if (error) {
    // El cliente de Supabase da un mensaje genérico ("Edge Function
    // returned a non-2xx status code"); el motivo real viene en el
    // cuerpo de la respuesta que dejó en error.context.
    const contexto = (error as { context?: Response }).context
    let mensajeReal: string | null = null
    if (contexto) {
      try {
        const cuerpo = await contexto.clone().json()
        if (cuerpo?.error) mensajeReal = cuerpo.error
      } catch {
        /* si el cuerpo no es JSON, se usa el mensaje genérico de abajo */
      }
    }
    throw new Error(mensajeReal ?? error.message)
  }
  if (data?.error) throw new Error(data.error)
  return data.respuesta as string
}

export function AdminAssistantWidget() {
  const [pregunta, setPregunta] = useState("")
  const [historial, setHistorial] = useState<Turno[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(textoPregunta: string) {
    const texto = textoPregunta.trim()
    if (!texto || cargando) return
    setCargando(true)
    setError(null)
    try {
      const respuesta = await preguntarAsistente(texto)
      setHistorial((actual) => [...actual, { pregunta: texto, respuesta }])
      setPregunta("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo obtener respuesta.")
    } finally {
      setCargando(false)
    }
  }

  function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    enviar(pregunta)
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold text-text">
            <Sparkles className="size-5 text-brand-light" />
            Asistente IA
          </h2>
          <Badge variant="muted">Retención · Finanzas · Ocupación</Badge>
        </div>

        {historial.length === 0 && !cargando && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-muted">
              Pregúntame sobre retención de alumnos, finanzas del último mes u ocupación de clases.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.map((sugerencia) => (
                <button
                  key={sugerencia}
                  type="button"
                  onClick={() => enviar(sugerencia)}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-text-muted transition-colors hover:border-brand/40 hover:text-text"
                >
                  {sugerencia}
                </button>
              ))}
            </div>
          </div>
        )}

        {historial.length > 0 && (
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
            {historial.map((turno, indice) => (
              <div key={indice} className="flex flex-col gap-1.5">
                <p className="self-end rounded-control bg-brand/10 px-3 py-1.5 text-sm text-text">
                  {turno.pregunta}
                </p>
                <p className="whitespace-pre-line rounded-control border border-white/10 px-3 py-2 text-sm text-text-muted">
                  {turno.respuesta}
                </p>
              </div>
            ))}
          </div>
        )}

        {cargando && <p className="text-sm text-text-muted">Pensando...</p>}

        {error && (
          <div className="flex items-center justify-between gap-2 rounded-control bg-error/10 px-3 py-2 text-sm text-error">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => enviar(historial.at(-1)?.pregunta ?? pregunta)}>
              Reintentar
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Textarea
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Escribe tu pregunta..."
            rows={1}
            className="min-h-10 flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                enviar(pregunta)
              }
            }}
          />
          <Button type="submit" disabled={cargando || !pregunta.trim()}>
            Preguntar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
