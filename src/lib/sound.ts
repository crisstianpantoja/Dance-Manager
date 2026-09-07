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

/** Beep agudo y corto: asistencia registrada con éxito. */
export function reproducirSonidoExito() {
  tono(880, 130)
}

/** Doble beep grave: advertencia (sin plan, vencido, alumno no encontrado). */
export function reproducirSonidoAdvertencia() {
  tono(320, 110)
  tono(320, 110, 150)
}
