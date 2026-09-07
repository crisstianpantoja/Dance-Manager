import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/context/AuthContext"
import { formatearFecha, formatearMoneda } from "@/lib/format"
import {
  cargarDetalleFinanciero,
  cargarResumenFinanciero,
  type DetalleFinancieroFila,
  type ResumenFinancieroProfesor,
} from "@/lib/teacherFinance"

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const ESTILO_ESTADO: Record<DetalleFinancieroFila["estado"], "success" | "warning" | "muted"> = {
  Pagado: "success",
  Generado: "success",
  "Por dictar": "muted",
  "Pendiente de validar": "warning",
}

export function FinanzasProfesorPage() {
  const { profile } = useAuth()
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [resumen, setResumen] = useState<ResumenFinancieroProfesor | null>(null)
  const [detalle, setDetalle] = useState<DetalleFinancieroFila[]>([])
  const [cargando, setCargando] = useState(true)

  async function cargar() {
    if (!profile?.id) return
    setCargando(true)
    const [r, d] = await Promise.all([
      cargarResumenFinanciero(profile.id, anio, mes),
      cargarDetalleFinanciero(profile.id, anio, mes),
    ])
    setResumen(r)
    setDetalle(d)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, anio, mes])

  const pronostico = resumen ? resumen.generado + resumen.por_dictar : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Mis finanzas</h1>
        <div className="flex gap-2">
          <Select value={mes.toString()} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((nombre, i) => (
                <SelectItem key={nombre} value={(i + 1).toString()}>
                  {nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={anio.toString()} onValueChange={(v) => setAnio(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1].map((a) => (
                <SelectItem key={a} value={a.toString()}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {cargando || !resumen ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Card className="border-l-4 border-l-success">
              <CardContent className="py-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">Generado</p>
                <p className="text-xl font-bold text-success">{formatearMoneda(resumen.generado)}</p>
                <p className="text-xs text-text-muted">{resumen.generado_clases} clases</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">Por dictar</p>
                <p className="text-xl font-bold text-text">{formatearMoneda(resumen.por_dictar)}</p>
                <p className="text-xs text-text-muted">{resumen.por_dictar_clases} clases</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-warning">
              <CardContent className="py-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">
                  Pendiente de validar
                </p>
                <p className="text-xl font-bold text-warning">
                  {formatearMoneda(resumen.pendiente_validar)}
                </p>
                <p className="text-xs text-text-muted">
                  {resumen.pendiente_validar_clases} clase(s) potenciales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">Pronóstico</p>
                <p className="text-xl font-bold text-text">{formatearMoneda(pronostico)}</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-brand">
              <CardContent className="py-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">Pagado</p>
                <p className="text-xl font-bold text-brand-light">{formatearMoneda(resumen.pagado)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">
                  Pendiente por pagar
                </p>
                <p className="text-xl font-bold text-text">
                  {formatearMoneda(resumen.pendiente_por_pagar)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-text-muted">Detalle</p>
            {detalle.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-text-muted">
                  No hay clases este mes.
                </CardContent>
              </Card>
            ) : (
              detalle.map((fila, i) => (
                <Card key={i}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-text">{fila.titulo}</p>
                      <p className="text-xs text-text-muted">
                        {formatearFecha(fila.fecha)}
                        {fila.lugar ? ` · ${fila.lugar}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text">{formatearMoneda(fila.valor)}</span>
                      <Badge variant={ESTILO_ESTADO[fila.estado]}>{fila.estado}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
