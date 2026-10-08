/**
 * Supabase solo envuelve en una instancia real de Error los fallos a
 * nivel de Postgres/PostgREST. Un fallo de red (proyecto pausado, sin
 * conexión, CORS) llega como un objeto plano con "message" que no
 * extiende Error, así que un simple `err instanceof Error` lo descarta
 * y oculta el motivo real detrás de un mensaje genérico.
 */
export function mensajeDeError(err: unknown, mensajePorDefecto: string): string {
  if (err instanceof Error && err.message) return err.message

  if (err && typeof err === "object" && "message" in err) {
    const mensaje = (err as { message?: unknown }).message
    if (typeof mensaje === "string" && mensaje) return mensaje
  }

  return mensajePorDefecto
}
