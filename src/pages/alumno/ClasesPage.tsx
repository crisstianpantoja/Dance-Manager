import { useEffect, useMemo, useState } from "react"

import { MonthNavHeader } from "@/components/calendar/MonthNavHeader"
import { claseDeItem, WeekGrid } from "@/components/calendar/WeekGrid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/context/AuthContext"
import {
  aFechaISO,
  construirGrillaMensual,
  construirSemana,
  DIAS_CORTOS,
  mesAnterior,
  mesSiguiente,
  NOMBRES_MES,
  primerDiaDelMesActual,
  semanaAnterior,
  semanaSiguiente,
} from "@/lib/calendarGrid"
import { fechaHoy } from "@/lib/attendance"
import { formatearFecha, formatearFechaLarga } from "@/lib/format"
import { gestionarReserva } from "@/lib/studentPortal"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import type { AgendaItem } from "@/types/agendaItem"
import type { NivelAlumno } from "@/types/student"

type SubTab = "calendario" | "proximas" | "misclases"
type VistaCalendario = "mes" | "semana"

interface FilaOcurrencia {
  id: string
  academia_id: string | null
  fecha: string
  hora: string
  alumno_ids: string[]
  estado: "programada" | "cancelada"
  class_series: {
    titulo: string
    categoria: string | null
    nivel: NivelAlumno | null
    lugar: string | null
    cupo_maximo: number | null
    profesor_ids: string[]
  } | null
}

function nombresProfesores(ids: string[], profesoresPorId: Map<string, string>): string | null {
  const nombres = ids.map((id) => profesoresPorId.get(id)).filter(Boolean) as string[]
  return nombres.length > 0 ? nombres.join(", ") : null
}

function colorPuntoDia(items: AgendaItem[]): string | null {
  if (items.length === 0) return null
  if (items.some((item) => item.tipo === "clase" && item.estado !== "cancelada")) return "bg-brand"
  if (items.some((item) => item.tipo === "evento")) return "bg-warning"
  return "bg-white/30"
}

function puntoDeItem(item: AgendaItem): string {
  if (item.estado === "cancelada") return "bg-white/30"
  if (item.tipo === "evento") return "bg-warning"
  return "bg-brand"
}

export function ClasesPage() {
  const { profile } = useAuth()
  const [academiaId, setAcademiaId] = useState<string | null>(null)
  const [profesoresPorId, setProfesoresPorId] = useState<Map<string, string>>(new Map())
  const [subTab, setSubTab] = useState<SubTab>("calendario")

  // ===== Calendario (mes/semana) =====
  const [vista, setVista] = useState<VistaCalendario>("mes")
  const [fechaBase, setFechaBase] = useState(() => primerDiaDelMesActual())
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => fechaHoy())
  const [itemsCalendario, setItemsCalendario] = useState<AgendaItem[]>([])
  const [cargandoCalendario, setCargandoCalendario] = useState(true)
  const [itemSeleccionado, setItemSeleccionado] = useState<AgendaItem | null>(null)

  const celdas = useMemo(
    () => (vista === "mes" ? construirGrillaMensual(fechaBase.getFullYear(), fechaBase.getMonth()) : construirSemana(fechaBase)),
    [vista, fechaBase],
  )

  useEffect(() => {
    if (vista !== "mes") return
    const desde = celdas[0]?.fecha
    const hasta = celdas[celdas.length - 1]?.fecha
    if (!desde || !hasta) return
    if (diaSeleccionado >= desde && diaSeleccionado <= hasta) return
    const hoy = fechaHoy()
    setDiaSeleccionado(hoy >= desde && hoy <= hasta ? hoy : (celdas.find((c) => c.enMes)?.fecha ?? desde))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celdas, vista])

  // ===== Próximas / Mis clases =====
  const [proximas, setProximas] = useState<AgendaItem[]>([])
  const [cargandoProximas, setCargandoProximas] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)

  useEffect(() => {
    async function resolverAcademia() {
      if (!profile?.id) return
      const { data } = await supabase
        .from("students")
        .select("academia_id")
        .eq("id", profile.id)
        .single()
      setAcademiaId(data?.academia_id ?? null)
    }
    resolverAcademia()
  }, [profile?.id])

  useEffect(() => {
    async function cargarProfesores() {
      const { data } = await supabase.from("teachers").select("id, nombre")
      setProfesoresPorId(new Map((data ?? []).map((t) => [t.id as string, t.nombre as string])))
    }
    cargarProfesores()
  }, [])

  async function cargarItems(desde: string, hasta: string): Promise<AgendaItem[]> {
    const alumnoId = profile?.id ?? ""

    const [{ data: ocurrenciasData }, { data: eventosData }] = await Promise.all([
      academiaId
        ? supabase
            .from("class_occurrences")
            .select("*, class_series(titulo, categoria, nivel, lugar, cupo_maximo, profesor_ids)")
            .eq("academia_id", academiaId)
            .gte("fecha", desde)
            .lte("fecha", hasta)
            .order("fecha")
            .order("hora")
        : Promise.resolve({ data: [] as FilaOcurrencia[] }),
      supabase
        .from("events")
        .select("*")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha")
        .order("hora"),
    ])

    const filas = (ocurrenciasData as FilaOcurrencia[] | null) ?? []
    const itemsClases: AgendaItem[] = filas.map((f) => ({
      id: f.id,
      tipo: "clase",
      fecha: f.fecha,
      hora: f.hora,
      titulo: f.class_series?.titulo ?? "Clase",
      profesor: nombresProfesores(f.class_series?.profesor_ids ?? [], profesoresPorId),
      lugar: f.class_series?.lugar ?? null,
      nivel: f.class_series?.nivel ?? null,
      estado: f.estado,
      cupoMaximo: f.class_series?.cupo_maximo ?? null,
      inscritos: f.alumno_ids.length,
      inscrito: f.alumno_ids.includes(alumnoId),
    }))

    const eventos = (eventosData ?? []) as {
      id: string
      titulo: string
      fecha: string
      hora: string
      lugar: string | null
      cupo_maximo: number | null
      reservas: string[]
      profesores: string | null
    }[]
    const itemsEventos: AgendaItem[] = eventos.map((e) => ({
      id: e.id,
      tipo: "evento",
      fecha: e.fecha,
      hora: e.hora,
      titulo: e.titulo,
      profesor: e.profesores,
      lugar: e.lugar,
      nivel: null,
      estado: null,
      cupoMaximo: e.cupo_maximo,
      inscritos: e.reservas.length,
      inscrito: e.reservas.includes(alumnoId),
    }))

    return [...itemsClases, ...itemsEventos]
  }

  useEffect(() => {
    async function cargar() {
      setCargandoCalendario(true)
      const desde = celdas[0]?.fecha ?? aFechaISO(fechaBase)
      const hasta = celdas[celdas.length - 1]?.fecha ?? aFechaISO(fechaBase)
      const items = await cargarItems(desde, hasta)
      setItemsCalendario(items)
      setCargandoCalendario(false)
    }
    if (profile?.id) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celdas, profile?.id, academiaId, profesoresPorId])

  useEffect(() => {
    async function cargar() {
      setCargandoProximas(true)
      const hoy = fechaHoy()
      const en60Dias = new Date()
      en60Dias.setDate(en60Dias.getDate() + 60)
      const items = await cargarItems(hoy, aFechaISO(en60Dias))
      setProximas(items.filter((i) => i.tipo === "clase" && i.estado === "programada"))
      setCargandoProximas(false)
    }
    if (profile?.id) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, academiaId, profesoresPorId])

  const itemsPorFecha = useMemo(() => {
    const mapa = new Map<string, AgendaItem[]>()
    for (const item of itemsCalendario) {
      const lista = mapa.get(item.fecha) ?? []
      lista.push(item)
      mapa.set(item.fecha, lista)
    }
    return mapa
  }, [itemsCalendario])

  const misClases = useMemo(() => proximas.filter((i) => i.inscrito), [proximas])

  function recargarTodo() {
    setItemSeleccionado(null)
    const desde = celdas[0]?.fecha ?? aFechaISO(fechaBase)
    const hasta = celdas[celdas.length - 1]?.fecha ?? aFechaISO(fechaBase)
    cargarItems(desde, hasta).then(setItemsCalendario)
    const hoy = fechaHoy()
    const en60Dias = new Date()
    en60Dias.setDate(en60Dias.getDate() + 60)
    cargarItems(hoy, aFechaISO(en60Dias)).then((items) =>
      setProximas(items.filter((i) => i.tipo === "clase" && i.estado === "programada")),
    )
  }

  async function toggleInscripcion(item: AgendaItem) {
    setProcesando(item.id)
    try {
      const accion =
        item.tipo === "clase"
          ? item.inscrito
            ? "cancelar_clase"
            : "reservar_clase"
          : item.inscrito
            ? "cancelar_evento"
            : "reservar_evento"
      await gestionarReserva(accion, item.id)
      recargarTodo()
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo procesar la reserva.")
    } finally {
      setProcesando(null)
    }
  }

  function irAnterior() {
    setFechaBase((actual) => (vista === "mes" ? mesAnterior(actual) : semanaAnterior(actual)))
  }
  function irSiguiente() {
    setFechaBase((actual) => (vista === "mes" ? mesSiguiente(actual) : semanaSiguiente(actual)))
  }
  function irHoy() {
    setFechaBase(vista === "mes" ? primerDiaDelMesActual() : new Date())
  }

  const etiquetaPeriodo =
    vista === "mes"
      ? `${NOMBRES_MES[fechaBase.getMonth()]} ${fechaBase.getFullYear()}`
      : celdas.length === 7
        ? `${celdas[0].dia} ${NOMBRES_MES[new Date(`${celdas[0].fecha}T00:00:00`).getMonth()].slice(0, 3)} - ${celdas[6].dia} ${NOMBRES_MES[new Date(`${celdas[6].fecha}T00:00:00`).getMonth()].slice(0, 3)}`
        : ""

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Clases</h1>

      <div className="flex items-center gap-1 rounded-control border border-white/15 p-1">
        {(
          [
            ["calendario", "Calendario"],
            ["proximas", "Próximas"],
            ["misclases", "Mis clases"],
          ] as [SubTab, string][]
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setSubTab(valor)}
            className={cn(
              "flex-1 rounded-[0.5rem] py-2 text-sm font-medium transition-colors",
              subTab === valor ? "bg-brand text-white" : "text-text-muted hover:text-text",
            )}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {subTab === "calendario" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center rounded-control border border-white/15 p-0.5">
              <button
                type="button"
                onClick={() => setVista("mes")}
                className={cn(
                  "rounded-[0.5rem] px-3 py-1.5 text-sm font-medium transition-colors",
                  vista === "mes" ? "bg-brand text-white" : "text-text-muted",
                )}
              >
                Mes
              </button>
              <button
                type="button"
                onClick={() => setVista("semana")}
                className={cn(
                  "rounded-[0.5rem] px-3 py-1.5 text-sm font-medium transition-colors",
                  vista === "semana" ? "bg-brand text-white" : "text-text-muted",
                )}
              >
                Semana
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-text-muted">
                <span className="size-2 rounded-full bg-brand" /> Clase
                <span className="ml-2 size-2 rounded-full bg-warning" /> Evento
                <span className="ml-2 size-2 rounded-full bg-white/30" /> Cancelada
              </span>
            </div>
          </div>

          <MonthNavHeader
            etiqueta={etiquetaPeriodo}
            onAnterior={irAnterior}
            onSiguiente={irSiguiente}
            onHoy={irHoy}
          />

          {cargandoCalendario ? (
            <p className="text-sm text-text-muted">Cargando...</p>
          ) : vista === "semana" ? (
            <WeekGrid dias={celdas} itemsPorFecha={itemsPorFecha} onItemClick={setItemSeleccionado} />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
              <div className="overflow-hidden rounded-control border border-white/10">
                <div className="grid grid-cols-7 border-b border-white/10 bg-surface">
                  {DIAS_CORTOS.map((dia) => (
                    <div
                      key={dia}
                      className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted sm:text-xs"
                    >
                      {dia}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {celdas.map((celda) => {
                    const seleccionado = celda.fecha === diaSeleccionado
                    const punto = colorPuntoDia(itemsPorFecha.get(celda.fecha) ?? [])
                    return (
                      <button
                        key={celda.fecha}
                        type="button"
                        onClick={() => setDiaSeleccionado(celda.fecha)}
                        className={cn(
                          "flex flex-col items-center gap-1 border-b border-r border-white/5 py-2.5 transition-colors last:border-r-0",
                          celda.enMes ? "bg-background" : "bg-surface/40",
                          seleccionado && "bg-brand/5",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                            seleccionado
                              ? "bg-brand text-white"
                              : celda.esHoy
                                ? "border border-brand text-brand-light"
                                : celda.enMes
                                  ? "text-text"
                                  : "text-text-muted/50",
                          )}
                        >
                          {celda.dia}
                        </span>
                        <span className={cn("size-1.5 rounded-full", punto ?? "bg-transparent")} />
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold capitalize text-text-muted">
                  Clases del {formatearFechaLarga(diaSeleccionado)}
                </p>

                {(itemsPorFecha.get(diaSeleccionado) ?? []).length === 0 ? (
                  <Card>
                    <CardContent className="py-4 text-center text-sm text-text-muted">
                      No hay nada programado este día.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col">
                    {(itemsPorFecha.get(diaSeleccionado) ?? [])
                      .slice()
                      .sort((a, b) => a.hora.localeCompare(b.hora))
                      .map((item, indice, lista) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setItemSeleccionado(item)}
                          className="flex gap-3 text-left"
                        >
                          <span className="w-11 shrink-0 pt-2.5 text-right text-xs font-semibold text-text">
                            {item.hora.slice(0, 5)}
                          </span>
                          <div className="flex flex-col items-center">
                            <span
                              className={cn(
                                "mt-3 size-2.5 shrink-0 rounded-full",
                                puntoDeItem(item),
                              )}
                            />
                            {indice < lista.length - 1 && (
                              <span className="w-px flex-1 bg-white/10" />
                            )}
                          </div>
                          <div
                            className={cn(
                              "mb-3 flex-1 rounded-control border px-3 py-2",
                              claseDeItem(item),
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{item.titulo}</p>
                              {item.nivel && (
                                <span className="shrink-0 rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-medium">
                                  {item.nivel}
                                </span>
                              )}
                            </div>
                            <p className="text-xs opacity-80">
                              {item.profesor ?? ""}
                              {item.profesor && item.lugar ? " · " : ""}
                              {item.lugar ?? ""}
                            </p>
                            {item.estado === "cancelada" && (
                              <p className="text-xs font-semibold">Cancelada</p>
                            )}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === "proximas" && (
        <ListaClases
          items={proximas}
          cargando={cargandoProximas}
          procesando={procesando}
          onToggle={toggleInscripcion}
          onVerDetalle={setItemSeleccionado}
          vacioTexto="No tienes clases programadas próximamente."
        />
      )}

      {subTab === "misclases" && (
        <ListaClases
          items={misClases}
          cargando={cargandoProximas}
          procesando={procesando}
          onToggle={toggleInscripcion}
          onVerDetalle={setItemSeleccionado}
          vacioTexto="Aún no estás inscrito en ninguna clase próxima."
        />
      )}

      <Dialog open={!!itemSeleccionado} onOpenChange={(open) => !open && setItemSeleccionado(null)}>
        <DialogContent>
          {itemSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge variant={itemSeleccionado.tipo === "evento" ? "warning" : "default"}>
                    {itemSeleccionado.tipo === "evento" ? "Evento" : "Clase"}
                  </Badge>
                  {itemSeleccionado.titulo}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-2 text-sm">
                <p className="text-text">
                  {formatearFecha(itemSeleccionado.fecha)} · {itemSeleccionado.hora.slice(0, 5)}
                </p>
                {itemSeleccionado.profesor && (
                  <p className="text-text-muted">Profesor: {itemSeleccionado.profesor}</p>
                )}
                {itemSeleccionado.lugar && (
                  <p className="text-text-muted">Sede: {itemSeleccionado.lugar}</p>
                )}
                {itemSeleccionado.nivel && (
                  <p className="text-text-muted">Nivel: {itemSeleccionado.nivel}</p>
                )}
                {itemSeleccionado.cupoMaximo && (
                  <p className="text-text-muted">
                    Cupos: {itemSeleccionado.inscritos}/{itemSeleccionado.cupoMaximo}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {itemSeleccionado.estado === "cancelada" ? (
                    <Badge variant="muted">Cancelada</Badge>
                  ) : (
                    <Badge variant={itemSeleccionado.inscrito ? "success" : "muted"}>
                      {itemSeleccionado.inscrito ? "Estás inscrito" : "No estás inscrito"}
                    </Badge>
                  )}
                </div>
              </div>

              {itemSeleccionado.estado !== "cancelada" && (
                <Button
                  className="mt-2"
                  variant={itemSeleccionado.inscrito ? "outline" : "default"}
                  disabled={
                    procesando === itemSeleccionado.id ||
                    (!itemSeleccionado.inscrito &&
                      !!itemSeleccionado.cupoMaximo &&
                      itemSeleccionado.inscritos >= itemSeleccionado.cupoMaximo)
                  }
                  onClick={() => toggleInscripcion(itemSeleccionado)}
                >
                  {itemSeleccionado.inscrito
                    ? "Cancelar inscripción"
                    : itemSeleccionado.cupoMaximo &&
                        itemSeleccionado.inscritos >= itemSeleccionado.cupoMaximo
                      ? "Sin cupo"
                      : "Reservar"}
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ListaClasesProps {
  items: AgendaItem[]
  cargando: boolean
  procesando: string | null
  onToggle: (item: AgendaItem) => void
  onVerDetalle: (item: AgendaItem) => void
  vacioTexto: string
}

function ListaClases({ items, cargando, procesando, onToggle, onVerDetalle, vacioTexto }: ListaClasesProps) {
  if (cargando) return <p className="text-sm text-text-muted">Cargando...</p>

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-sm text-text-muted">{vacioTexto}</CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const lleno = item.cupoMaximo ? item.inscritos >= item.cupoMaximo : false
        return (
          <Card key={item.id} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-2 py-4">
              <button className="flex flex-1 flex-col gap-1 text-left" onClick={() => onVerDetalle(item)}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-light">
                    {formatearFecha(item.fecha)}
                  </p>
                  <p className="text-xs text-text-muted">{item.hora.slice(0, 5)}</p>
                </div>
                <p className="font-medium text-text">{item.titulo}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.nivel && <Badge variant="muted">{item.nivel}</Badge>}
                  {item.cupoMaximo && (
                    <Badge variant={lleno ? "muted" : "default"}>
                      {item.inscritos}/{item.cupoMaximo} cupos
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  {[item.profesor, item.lugar].filter(Boolean).join(" · ")}
                </p>
              </button>
              <Button
                size="sm"
                variant={item.inscrito ? "outline" : "default"}
                disabled={procesando === item.id || (!item.inscrito && lleno)}
                onClick={() => onToggle(item)}
              >
                {item.inscrito ? "Cancelar" : lleno ? "Sin cupo" : "Reservar"}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
