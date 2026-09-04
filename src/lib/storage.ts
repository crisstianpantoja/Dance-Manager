import { supabase } from "@/lib/supabase"

const BUCKET = "fotos"

export async function subirFoto(archivo: File, carpeta: string) {
  const extension = archivo.name.split(".").pop() ?? "jpg"
  const ruta = `${carpeta}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(ruta)

  return publicUrl
}
