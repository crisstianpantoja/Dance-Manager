import type { Session } from "@supabase/supabase-js"
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { documentoToEmail, supabase } from "@/lib/supabase"
import type { Profile } from "@/types/auth"

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  /** true mientras se resuelve la sesión y el perfil (evita pintar el portal vacío). */
  loading: boolean
  signIn: (
    documento: string,
    password: string,
    codigoAcademia: string,
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, documento, nombre, rol, organization_id")
    .eq("id", userId)
    .single()

  if (error || !data) return null
  return data as Profile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let activo = true

    async function cargarSesionInicial() {
      const {
        data: { session: sesionActual },
      } = await supabase.auth.getSession()

      if (!activo) return

      setSession(sesionActual)

      if (sesionActual) {
        const perfil = await fetchProfile(sesionActual.user.id)
        if (activo) setProfile(perfil)
      }

      if (activo) setLoading(false)
    }

    cargarSesionInicial()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_evento, nuevaSesion) => {
      setLoading(true)
      setSession(nuevaSesion)

      if (nuevaSesion) {
        const perfil = await fetchProfile(nuevaSesion.user.id)
        setProfile(perfil)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      activo = false
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(documento: string, password: string, codigoAcademia: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: documentoToEmail(documento, codigoAcademia),
      password,
    })

    if (error) {
      return { error: "Código de academia, documento o contraseña incorrectos." }
    }

    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}
