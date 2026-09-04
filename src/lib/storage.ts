import { supabase } from "@/lib/supabase"

async function subirArchivo(bucket: string, archivo: File, carpeta: string) {
  const extension = archivo.name.split(".").pop() ?? "jpg"
  const ruta = `${carpeta}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(bucket).upload(ruta, archivo, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) throw error

  return ruta
}

/** Sube a "fotos" (bucket público) y devuelve la URL pública directa. */
export async function subirFoto(archivo: File, carpeta: string) {
  const ruta = await subirArchivo("fotos", archivo, carpeta)

  const {
    data: { publicUrl },
  } = supabase.storage.from("fotos").getPublicUrl(ruta)

  return publicUrl
}

/** Sube a "comprobantes" (bucket privado) y devuelve la ruta interna. */
export async function subirComprobante(archivo: File, carpeta: string) {
  return subirArchivo("comprobantes", archivo, carpeta)
}

/** Genera una URL firmada temporal para ver un comprobante privado. */
export async function obtenerUrlComprobante(ruta: string) {
  const { data, error } = await supabase.storage
    .from("comprobantes")
    .createSignedUrl(ruta, 60 * 10)

  if (error) throw error
  return data.signedUrl
}
