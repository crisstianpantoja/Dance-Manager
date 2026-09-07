/** Beeps cortos con Web Audio API, sin archivos de audio, para el escáner. */

let audioContext: AudioContext | null = null

function obtenerContexto(): AudioContext | null {
  if (typeof window === "undefined") return null

  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!Ctor) return null
  if (!audioContext) audioContext = new Ctor()
  if (audioContext.state === "suspended") audioContext.resume()

  return audioContext
}

function tono(frecuencia: number, duracionMs: number, retrasoMs = 0) {
  const ctx = obtenerContexto()
  if (!ctx) return

  const oscilador = ctx.createOscillator()
  const ganancia = ctx.createGain()

  oscilador.type = "sine"
  oscilador.frequency.value = frecuencia

  const inicio = ctx.currentTime + retrasoMs / 1000
  const fin = inicio + duracionMs / 1000

  ganancia.gain.setValueAtTime(0.0001, inicio)
  ganancia.gain.exponentialRampToValueAtTime(0.25, inicio + 0.01)
  ganancia.gain.exponentialRampToValueAtTime(0.0001, fin)

  oscilador.connect(ganancia)
  ganancia.connect(ctx.destination)
  oscilador.start(inicio)
  oscilador.stop(fin + 0.02)
}

/** Beep agudo y corto: asistencia registrada con éxito (respaldo si no hay voz). */
export function reproducirSonidoExito() {
  tono(880, 130)
}

/** Doble beep grave: advertencia (sin plan, vencido, alumno no encontrado). */
export function reproducirSonidoAdvertencia() {
  tono(320, 110)
  tono(320, 110, 150)
}

function obtenerVozEnEspanol(): SpeechSynthesisVoice | undefined {
  const voces = window.speechSynthesis.getVoices()
  return (
    voces.find((v) => v.lang?.toLowerCase().startsWith("es")) ??
    voces.find((v) => v.lang?.toLowerCase().startsWith("es-")) ??
    undefined
  )
}

/** Dice el texto en voz alta (español). Si el navegador no soporta voz, suena un beep. */
export function decir(texto: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    reproducirSonidoExito()
    return
  }

  try {
    window.speechSynthesis.cancel()
    const utterancia = new SpeechSynthesisUtterance(texto)
    utterancia.lang = "es-ES"
    utterancia.rate = 1
    utterancia.volume = 1
    const voz = obtenerVozEnEspanol()
    if (voz) utterancia.voice = voz
    window.speechSynthesis.speak(utterancia)
  } catch {
    reproducirSonidoExito()
  }
}

/** Voz: "Clase registrada con éxito." */
export function decirClaseRegistrada() {
  decir("Clase registrada con éxito.")
}
