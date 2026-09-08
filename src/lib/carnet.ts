/**
 * Dibujo y descarga del carnet digital. Se pinta a mano sobre un <canvas> en
 * vez de fotografiar el DOM: Tailwind v4 resuelve las opacidades con
 * color-mix()/color(srgb …), que html2canvas no sabe leer y ante las que
 * aborta, así que la captura del DOM fallaría siempre. Con un Blob + la hoja
 * de compartir del sistema, además, el carnet se guarda en Fotos en el móvil
 * (un enlace <a download> con URL de datos no lo hace).
 */

export interface CarnetTheme {
  bg: string
  rgb: string
  hex: string
  name: string
}

export const THEMES = {
  purple: {
    bg: "linear-gradient(160deg, #1A0B2E 0%, #4B1D52 50%, #11071F 100%)",
    rgb: "149,66,223",
    hex: "#9542DF",
    name: "Morado",
  },
  magenta: {
    bg: "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    rgb: "247,37,133",
    hex: "#F72585",
    name: "Magenta",
  },
  cyan: {
    bg: "linear-gradient(160deg, #021B1A 0%, #064E4D 50%, #010F0E 100%)",
    rgb: "55,217,166",
    hex: "#37D9A6",
    name: "Cian",
  },
  amber: {
    bg: "linear-gradient(160deg, #2E1B00 0%, #5C3A00 50%, #1A0F00 100%)",
    rgb: "245,184,65",
    hex: "#F5B841",
    name: "Ámbar",
  },
} as const satisfies Record<string, CarnetTheme>

export type ThemeId = keyof typeof THEMES

export function temaDeCarnet(id?: string | null): CarnetTheme {
  return THEMES[(id || "") as ThemeId] || THEMES.purple
}

export interface CarnetDatos {
  nombre: string
  nivel: string
  tipo: string
  fotoUrl?: string | null
  qrCanvas: HTMLCanvasElement
}

const ANCHO = 340
const PAD_X = 24
const PAD_TOP = 32
const PAD_BOTTOM = 32
const RADIO = 32
const AVATAR = 96
const QR_MARGEN = 10
const PILL_ALTO = 40
const FUENTE = "'Outfit', 'DM Sans', system-ui, sans-serif"

export const ESCALA_CARNET = 3

function rgba(theme: CarnetTheme, alpha: number): string {
  return `rgba(${theme.rgb}, ${alpha})`
}

function rectRedondeado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radio = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radio, y)
  ctx.arcTo(x + w, y, x + w, y + h, radio)
  ctx.arcTo(x + w, y + h, x, y + h, radio)
  ctx.arcTo(x, y + h, x, y, radio)
  ctx.arcTo(x, y, x + w, y, radio)
  ctx.closePath()
}

function degradado(
  ctx: CanvasRenderingContext2D,
  grados: number,
  w: number,
  h: number,
  colores: string[],
): CanvasGradient {
  const rad = (grados * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const largo = Math.abs(w * dx) + Math.abs(h * dy)
  const cx = w / 2
  const cy = h / 2
  const grad = ctx.createLinearGradient(
    cx - (dx * largo) / 2,
    cy - (dy * largo) / 2,
    cx + (dx * largo) / 2,
    cy + (dy * largo) / 2,
  )
  colores.forEach((color, i) => grad.addColorStop(i / (colores.length - 1), color))
  return grad
}

function coloresDeTema(theme: CarnetTheme): string[] {
  const encontrados = theme.bg.match(/#[0-9a-fA-F]{3,8}/g)
  return encontrados && encontrados.length >= 2
    ? encontrados
    : ["#0f0c29", "#302b63", "#24243e"]
}

function textoEspaciado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  cx: number,
  y: number,
  espacio: number,
) {
  const letras = [...texto]
  const ancho =
    letras.reduce((total, letra) => total + ctx.measureText(letra).width, 0) +
    espacio * Math.max(0, letras.length - 1)
  let x = cx - ancho / 2
  const alineacion = ctx.textAlign
  ctx.textAlign = "left"
  for (const letra of letras) {
    ctx.fillText(letra, x, y)
    x += ctx.measureText(letra).width + espacio
  }
  ctx.textAlign = alineacion
}

function ajustarNombre(
  ctx: CanvasRenderingContext2D,
  nombre: string,
  maxAncho: number,
): { lineas: string[]; tamano: number } {
  const cabe = (lineas: string[], tamano: number) => {
    ctx.font = `800 ${tamano}px ${FUENTE}`
    return lineas.every((linea) => ctx.measureText(linea).width <= maxAncho)
  }

  for (let tamano = 28; tamano >= 18; tamano -= 2) {
    if (cabe([nombre], tamano)) return { lineas: [nombre], tamano }
  }

  const palabras = nombre.split(/\s+/).filter(Boolean)
  if (palabras.length > 1) {
    let mejor = 1
    let menorDiferencia = Infinity
    for (let corte = 1; corte < palabras.length; corte++) {
      const diferencia = Math.abs(
        palabras.slice(0, corte).join(" ").length - palabras.slice(corte).join(" ").length,
      )
      if (diferencia < menorDiferencia) {
        menorDiferencia = diferencia
        mejor = corte
      }
    }
    const lineas = [palabras.slice(0, mejor).join(" "), palabras.slice(mejor).join(" ")]
    for (let tamano = 24; tamano >= 16; tamano -= 2) {
      if (cabe(lineas, tamano)) return { lineas, tamano }
    }
    return { lineas, tamano: 16 }
  }

  return { lineas: [nombre], tamano: 18 }
}

function cargarImagen(src?: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous"
    const listo = (valor: HTMLImageElement | null) => resolve(valor)
    img.onload = () => listo(img)
    img.onerror = () => listo(null)
    window.setTimeout(() => listo(null), 6000)
    img.src = src
  })
}

async function esperarTipografias() {
  if (!document.fonts) return
  try {
    await Promise.all([
      document.fonts.load(`800 28px ${FUENTE}`),
      document.fonts.load(`900 italic 34px ${FUENTE}`),
      document.fonts.load(`600 12px ${FUENTE}`),
    ])
    await document.fonts.ready
  } catch {
    /* si la fuente no carga, el dibujo sigue con la de reserva */
  }
}

export async function dibujarCarnet(
  datos: CarnetDatos,
  theme: CarnetTheme,
  escala = ESCALA_CARNET,
): Promise<HTMLCanvasElement> {
  await esperarTipografias()
  const foto = await cargarImagen(datos.fotoUrl)

  const medidor = document.createElement("canvas").getContext("2d")
  if (!medidor) throw new Error("El navegador no permite generar la imagen del carnet")

  const anchoTexto = ANCHO - PAD_X * 2
  const nombre = ajustarNombre(medidor, (datos.nombre || "").trim().toUpperCase(), anchoTexto)
  const qrLado = datos.qrCanvas.width > 0 ? datos.qrCanvas.width / escala : 110
  const placaLado = qrLado + QR_MARGEN * 2
  const altoNombre = nombre.lineas.length * (nombre.tamano * 1.15)

  const alto =
    PAD_TOP +
    40 +
    4 +
    14 +
    24 + // "Carnet digital"
    AVATAR +
    12 +
    altoNombre +
    8 +
    16 +
    24 + // nivel
    placaLado +
    24 +
    14 +
    24 + // "Único e intransferible"
    PILL_ALTO +
    PAD_BOTTOM

  const canvas = document.createElement("canvas")
  canvas.width = Math.round(ANCHO * escala)
  canvas.height = Math.round(alto * escala)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("El navegador no permite generar la imagen del carnet")
  ctx.scale(escala, escala)
  ctx.textBaseline = "alphabetic"
  ctx.textAlign = "center"

  const centro = ANCHO / 2

  ctx.save()
  rectRedondeado(ctx, 0, 0, ANCHO, alto, RADIO)
  ctx.clip()
  ctx.fillStyle = degradado(ctx, 160, ANCHO, alto, coloresDeTema(theme))
  ctx.fillRect(0, 0, ANCHO, alto)

  const halo = ctx.createRadialGradient(centro, alto / 2, 0, centro, alto / 2, alto * 0.6)
  halo.addColorStop(0, rgba(theme, 0.28))
  halo.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, ANCHO, alto)

  let y = PAD_TOP

  // Marca
  ctx.save()
  ctx.shadowColor = rgba(theme, 0.8)
  ctx.shadowBlur = 15
  ctx.font = `900 italic 34px ${FUENTE}`
  const anchoDance = ctx.measureText("Dance").width
  const anchoM = ctx.measureText("M").width
  const inicio = centro - (anchoDance + anchoM) / 2
  ctx.textAlign = "left"
  ctx.fillStyle = "#FFFFFF"
  ctx.fillText("Dance", inicio, y + 28)
  ctx.fillStyle = theme.hex
  ctx.fillText("M", inicio + anchoDance, y + 28)
  ctx.textAlign = "center"
  ctx.restore()
  y += 40 + 4

  ctx.fillStyle = "rgba(255,255,255,0.8)"
  ctx.font = `500 10px ${FUENTE}`
  textoEspaciado(ctx, "CARNET DIGITAL", centro, y + 10, 3)
  y += 14 + 24

  // Foto o inicial
  const avatarCx = centro
  const avatarCy = y + AVATAR / 2
  ctx.save()
  ctx.shadowColor = rgba(theme, 0.5)
  ctx.shadowBlur = 15
  ctx.beginPath()
  ctx.arc(avatarCx, avatarCy, AVATAR / 2, 0, 2 * Math.PI)
  ctx.fillStyle = "rgba(0,0,0,0.2)"
  ctx.fill()
  ctx.restore()

  if (foto) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarCx, avatarCy, AVATAR / 2 - 1, 0, 2 * Math.PI)
    ctx.clip()
    const escalaFoto = Math.max(AVATAR / foto.width, AVATAR / foto.height)
    const w = foto.width * escalaFoto
    const h = foto.height * escalaFoto
    ctx.drawImage(foto, avatarCx - w / 2, avatarCy - h / 2, w, h)
    ctx.restore()
  } else {
    ctx.fillStyle = "#FFFFFF"
    ctx.font = `700 36px ${FUENTE}`
    ctx.fillText((datos.nombre || "?").trim().charAt(0).toUpperCase(), avatarCx, avatarCy + 13)
  }
  ctx.beginPath()
  ctx.arc(avatarCx, avatarCy, AVATAR / 2, 0, 2 * Math.PI)
  ctx.strokeStyle = theme.hex
  ctx.lineWidth = 2
  ctx.stroke()
  y += AVATAR + 12

  // Nombre
  ctx.fillStyle = "#FFFFFF"
  ctx.font = `800 ${nombre.tamano}px ${FUENTE}`
  const salto = nombre.tamano * 1.15
  nombre.lineas.forEach((linea, i) => {
    ctx.fillText(linea, centro, y + nombre.tamano * 0.92 + i * salto)
  })
  y += altoNombre + 8

  // Nivel
  const nivel = (datos.nivel || "Básica").trim().toUpperCase()
  ctx.font = `600 12px ${FUENTE}`
  const medioNivel = y + 12
  ctx.fillStyle = "rgba(255,255,255,0.9)"
  textoEspaciado(ctx, nivel, centro, medioNivel, 2.4)
  y += 16 + 24

  // QR sobre placa blanca
  const placaX = centro - placaLado / 2
  const placaY = y
  ctx.save()
  ctx.shadowColor = "rgba(0,0,0,0.45)"
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 6
  ctx.fillStyle = "#FFFFFF"
  rectRedondeado(ctx, placaX, placaY, placaLado, placaLado, 12)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(datos.qrCanvas, placaX + QR_MARGEN, placaY + QR_MARGEN, qrLado, qrLado)
  ctx.restore()
  y += placaLado + 24

  ctx.save()
  ctx.fillStyle = theme.hex
  ctx.font = `700 10px ${FUENTE}`
  ctx.shadowColor = rgba(theme, 0.8)
  ctx.shadowBlur = 8
  textoEspaciado(ctx, "ÚNICO E INTRANSFERIBLE", centro, y + 10, 1.6)
  ctx.restore()
  y += 14 + 24

  // Distintivo de tipo
  ctx.save()
  const texto = (datos.tipo || "Regular").toUpperCase()
  ctx.shadowColor = rgba(theme, 0.3)
  ctx.shadowBlur = 15
  ctx.fillStyle = rgba(theme, 0.1)
  rectRedondeado(ctx, PAD_X, y, anchoTexto, PILL_ALTO, PILL_ALTO / 2)
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = rgba(theme, 0.7)
  ctx.lineWidth = 1
  rectRedondeado(ctx, PAD_X, y, anchoTexto, PILL_ALTO, PILL_ALTO / 2)
  ctx.stroke()
  ctx.fillStyle = "rgba(255,255,255,0.9)"
  ctx.font = "700 11px " + FUENTE
  textoEspaciado(ctx, texto, centro, y + PILL_ALTO / 2 + 4, 1.2)

  ctx.restore()

  ctx.strokeStyle = rgba(theme, 0.5)
  ctx.lineWidth = 2
  rectRedondeado(ctx, 1, 1, ANCHO - 2, alto - 2, RADIO - 1)
  ctx.stroke()

  return canvas
}

export interface CarnetAppleDatos {
  nombre: string
  documento: string
  nivel: string
  tipo: string
  qrCanvas: HTMLCanvasElement
}

const APPLE_ANCHO = 340
const APPLE_ALTO = 216
const APPLE_PAD = 20
const APPLE_RADIO = 16

/**
 * Vista previa visual de cómo se vería el carnet como pase de Apple
 * Wallet — NO es un pase real de PassKit. Un .pkpass instalable
 * requiere firmarlo con un certificado emitido por Apple (cuenta de
 * Apple Developer Program, con costo anual), algo que no se puede
 * simular ni generar sin esa cuenta. Esto es solo una imagen con la
 * distribución típica de un pase (logo, campo principal, campos
 * secundarios, código de barras) para usar en demos comerciales
 * mientras se decide si vale la pena esa integración real.
 */
export async function dibujarCarnetAppleWallet(
  datos: CarnetAppleDatos,
  theme: CarnetTheme,
  escala = ESCALA_CARNET,
): Promise<HTMLCanvasElement> {
  await esperarTipografias()

  const canvas = document.createElement("canvas")
  canvas.width = Math.round(APPLE_ANCHO * escala)
  canvas.height = Math.round(APPLE_ALTO * escala)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("El navegador no permite generar la imagen del carnet")
  ctx.scale(escala, escala)
  ctx.textBaseline = "alphabetic"

  ctx.save()
  rectRedondeado(ctx, 0, 0, APPLE_ANCHO, APPLE_ALTO, APPLE_RADIO)
  ctx.clip()
  ctx.fillStyle = "#111114"
  ctx.fillRect(0, 0, APPLE_ANCHO, APPLE_ALTO)
  ctx.fillStyle = theme.hex
  ctx.fillRect(0, 0, APPLE_ANCHO, 5)
  ctx.restore()

  ctx.strokeStyle = "rgba(255,255,255,0.12)"
  ctx.lineWidth = 1
  rectRedondeado(ctx, 0.5, 0.5, APPLE_ANCHO - 1, APPLE_ALTO - 1, APPLE_RADIO)
  ctx.stroke()

  let y = APPLE_PAD + 8

  // Encabezado: logo circular + etiqueta del tipo de pase.
  ctx.save()
  ctx.beginPath()
  ctx.arc(APPLE_PAD + 11, y, 11, 0, Math.PI * 2)
  ctx.fillStyle = theme.hex
  ctx.fill()
  ctx.fillStyle = "#FFFFFF"
  ctx.font = `900 11px ${FUENTE}`
  ctx.textAlign = "center"
  ctx.fillText("M", APPLE_PAD + 11, y + 4)
  ctx.restore()

  ctx.textAlign = "right"
  ctx.fillStyle = "rgba(255,255,255,0.5)"
  ctx.font = `700 9px ${FUENTE}`
  ctx.fillText("CARNET DIGITAL", APPLE_ANCHO - APPLE_PAD, y + 4)
  y += 11 + 22

  // Campo principal: nombre del alumno.
  ctx.textAlign = "left"
  ctx.fillStyle = "rgba(255,255,255,0.5)"
  ctx.font = `700 9px ${FUENTE}`
  ctx.fillText("NOMBRE", APPLE_PAD, y)
  y += 18
  ctx.fillStyle = "#FFFFFF"
  ctx.font = `800 20px ${FUENTE}`
  const nombreCorto =
    datos.nombre.length > 26 ? `${datos.nombre.slice(0, 25).trim()}…` : datos.nombre
  ctx.fillText(nombreCorto.toUpperCase(), APPLE_PAD, y)
  y += 14 + 18

  // Campos secundarios: nivel y tipo, lado a lado.
  const colAncho = (APPLE_ANCHO - APPLE_PAD * 2) / 2
  ctx.fillStyle = "rgba(255,255,255,0.5)"
  ctx.font = `700 9px ${FUENTE}`
  ctx.fillText("NIVEL", APPLE_PAD, y)
  ctx.fillText("TIPO", APPLE_PAD + colAncho, y)
  y += 15
  ctx.fillStyle = "#FFFFFF"
  ctx.font = `700 13px ${FUENTE}`
  ctx.fillText(datos.nivel.toUpperCase(), APPLE_PAD, y)
  ctx.fillText(datos.tipo.toUpperCase(), APPLE_PAD + colAncho, y)

  // Código de barras (QR) centrado en la franja inferior, como en un pase real.
  const qrLado = 56
  const qrX = APPLE_ANCHO - APPLE_PAD - qrLado
  const qrY = APPLE_ALTO - APPLE_PAD - qrLado + 6
  ctx.save()
  ctx.fillStyle = "#FFFFFF"
  rectRedondeado(ctx, qrX - 6, qrY - 6, qrLado + 12, qrLado + 12, 8)
  ctx.fill()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(datos.qrCanvas, qrX, qrY, qrLado, qrLado)
  ctx.restore()

  ctx.textAlign = "left"
  ctx.fillStyle = "rgba(255,255,255,0.4)"
  ctx.font = `600 9px ${FUENTE}`
  ctx.fillText(datos.documento, APPLE_PAD, APPLE_ALTO - APPLE_PAD + 2)

  return canvas
}

export type ResultadoGuardado = "compartido" | "descargado" | "cancelado"

export function nombreArchivoCarnet(nombre: string): string {
  const limpio = (nombre || "alumno")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
  return `carnet-${limpio || "alumno"}.png`
}

export function nombreArchivoCarnetAppleWallet(nombre: string): string {
  return nombreArchivoCarnet(nombre).replace("carnet-", "carnet-apple-wallet-")
}

export async function guardarCarnet(
  canvas: HTMLCanvasElement,
  nombreArchivo: string,
): Promise<ResultadoGuardado> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (!blob) throw new Error("No se pudo generar la imagen del carnet")

  const file = new File([blob], nombreArchivo, { type: "image/png" })
  const nav = navigator as Navigator & { canShare?: (datos: ShareData) => boolean }
  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: nombreArchivo })
      return "compartido"
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelado"
    }
  }

  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.rel = "noopener"
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  return "descargado"
}
