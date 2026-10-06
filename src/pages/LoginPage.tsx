import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Link, Navigate, useLocation } from "react-router-dom"

import { useAuth } from "@/context/AuthContext"
import { AJUSTES_POR_DEFECTO } from "@/lib/settings"
import {
  CODIGO_ACADEMIA_PRINCIPAL,
  guardarCodigoAcademia,
  obtenerCodigoAcademiaGuardado,
} from "@/lib/supabase"

interface BlobData {
  size: number
  left: number
  top: number
  animationDelay: number
  animationDuration: number
}

export function LoginPage() {
  const { session, loading, signIn } = useAuth()
  const ajustes = AJUSTES_POR_DEFECTO
  const location = useLocation()
  const [codigoGuardado] = useState(() => obtenerCodigoAcademiaGuardado())
  const [codigoAcademia, setCodigoAcademia] = useState(codigoGuardado)
  const [mostrarCodigo, setMostrarCodigo] = useState(
    codigoGuardado !== CODIGO_ACADEMIA_PRINCIPAL,
  )
  const [documento, setDocumento] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const blobsData = useMemo<BlobData[]>(() => {
    return Array.from({ length: 6 }).map(() => ({
      size: Math.random() * 200 + 150,
      left: Math.random() * 80 + 10,
      top: Math.random() * 80 + 10,
      animationDelay: Math.random() * -20,
      animationDuration: Math.random() * 15 + 15,
    }))
  }, [])

  const blobRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight

      blobRefs.current.forEach((blob, index) => {
        if (blob) {
          const speed = (index + 1) * 16
          blob.style.marginLeft = `${x * speed}px`
          blob.style.marginTop = `${y * speed}px`
        }
      })
    }

    document.addEventListener("mousemove", handleMouseMove)
    return () => document.removeEventListener("mousemove", handleMouseMove)
  }, [])

  if (!loading && session) {
    const destino = (location.state as { from?: string } | null)?.from ?? "/"
    return <Navigate to={destino} replace />
  }

  const mensajeExito = (location.state as { mensaje?: string } | null)?.mensaje ?? null

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)

    const { error } = await signIn(documento, password, codigoAcademia)

    if (error) {
      setError(error)
    } else {
      guardarCodigoAcademia(codigoAcademia)
    }
    setEnviando(false)
  }

  return (
    <div className="login-liquid">
      <style>{`
        .login-liquid {
          position: relative;
          height: 100dvh;
          width: 100%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-background);
          color: var(--color-text);
        }

        .login-liquid * {
          box-sizing: border-box;
        }

        .login-liquid .stage {
          position: absolute;
          inset: 0;
          z-index: 0;
          filter: url('#login-gooey');
          opacity: 0.7;
        }

        .login-liquid .blob {
          position: absolute;
          background: linear-gradient(135deg, var(--color-brand-light), var(--color-brand-dark));
          border-radius: 50%;
          filter: blur(20px);
          animation: login-float 20s infinite alternate ease-in-out;
          box-shadow:
            inset -10px -10px 20px rgb(0 0 0 / 25%),
            10px 10px 30px color-mix(in oklab, var(--color-brand) 35%, transparent);
          transition: margin 0.1s ease-out;
        }

        @keyframes login-float {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10vw, 20vh) scale(1.2); }
          66% { transform: translate(-5vw, 10vh) scale(0.8); }
          100% { transform: translate(5vw, -10vh) scale(1.1); }
        }

        .login-liquid .auth-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          margin: 24px;
          padding: 40px;
          border-radius: 28px;
          background: color-mix(in oklab, var(--color-background) 72%, transparent);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 8px 40px rgb(0 0 0 / 15%);
        }

        .login-liquid .brand-id {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--color-text-muted);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .login-liquid .brand-logo {
          height: 20px;
          width: auto;
        }

        .login-liquid .header h1 {
          font-weight: 800;
          font-size: 2.75rem;
          line-height: 0.95;
          letter-spacing: -1.5px;
          margin: 0 0 48px;
        }

        .login-liquid .header h1 span {
          color: var(--color-brand-light);
        }

        .login-liquid .form-group {
          position: relative;
          margin-bottom: 26px;
          transition: transform 0.4s cubic-bezier(0.2, 1, 0.3, 1);
        }

        .login-liquid .form-group:focus-within {
          transform: translateX(8px);
        }

        .login-liquid .form-group label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-muted);
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }

        .login-liquid .form-group input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text);
          padding: 10px 0;
          font-size: 17px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.4s;
        }

        .login-liquid .form-group input::placeholder {
          color: color-mix(in oklab, var(--color-text-muted) 70%, transparent);
        }

        .login-liquid .input-glow {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0%;
          height: 2px;
          background: var(--color-brand-light);
          transition: width 0.6s cubic-bezier(0.2, 1, 0.3, 1);
          box-shadow: 0 0 15px var(--color-brand-light);
        }

        .login-liquid .form-group input:focus + .input-glow {
          width: 100%;
        }

        .login-liquid .cambiar-codigo {
          margin-bottom: 20px;
          font-size: 12px;
          color: var(--color-text-muted);
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .login-liquid .cambiar-codigo:hover {
          color: var(--color-brand-light);
        }

        .login-liquid .banner {
          margin-bottom: 24px;
          padding: 10px 14px;
          font-size: 13px;
          border-left: 2px solid currentColor;
          border-radius: 4px;
        }

        .login-liquid .banner.success {
          color: var(--color-success);
          background: color-mix(in oklab, var(--color-success) 12%, transparent);
        }

        .login-liquid .banner.error {
          color: var(--color-error);
          background: color-mix(in oklab, var(--color-error) 12%, transparent);
        }

        .login-liquid .submit-wrap {
          margin-top: 44px;
          position: relative;
          filter: url('#login-gooey');
        }

        .login-liquid .btn-base {
          background: var(--color-brand);
          color: #fff;
          border: none;
          padding: 18px 40px;
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
          cursor: pointer;
          width: 100%;
          position: relative;
          z-index: 2;
          transition: letter-spacing 0.3s, opacity 0.3s;
        }

        .login-liquid .btn-base:hover {
          letter-spacing: 3.5px;
        }

        .login-liquid .btn-base:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .login-liquid .mercury-drop {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          background: var(--color-brand-light);
          transform: translate(-50%, -50%);
          z-index: 1;
          border-radius: 50px;
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .login-liquid .submit-wrap:hover .mercury-drop {
          transform: translate(-50%, -50%) scale(1.05, 1.2);
          filter: brightness(1.15);
        }

        .login-liquid .footer-nav {
          margin-top: 36px;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          font-size: 12px;
        }

        .login-liquid .footer-nav a {
          color: var(--color-text-muted);
          text-decoration: none;
          transition: color 0.3s;
        }

        .login-liquid .footer-nav a:hover {
          color: var(--color-brand-light);
        }

        .login-liquid .svg-filter-hidden {
          position: absolute;
          width: 0;
          height: 0;
        }
      `}</style>

      <svg className="svg-filter-hidden">
        <defs>
          <filter id="login-gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="stage">
        {blobsData.map((data, index) => (
          <div
            key={index}
            ref={(el) => {
              blobRefs.current[index] = el
            }}
            className="blob"
            style={{
              width: `${data.size}px`,
              height: `${data.size}px`,
              left: `${data.left}%`,
              top: `${data.top}%`,
              animationDelay: `${data.animationDelay}s`,
              animationDuration: `${data.animationDuration}s`,
            }}
          />
        ))}
      </div>

      <main className="auth-container">
        <header className="header">
          <span className="brand-id">
            {ajustes.logo_url && <img src={ajustes.logo_url} alt="" className="brand-logo" />}
            {ajustes.nombre_app}
          </span>
          <h1>
            Bienvenido
            <br />
            de <span>vuelta</span>
          </h1>
        </header>

        <form autoComplete="off" onSubmit={handleSubmit}>
          {mensajeExito && <p className="banner success">{mensajeExito}</p>}

          {mostrarCodigo ? (
            <div className="form-group">
              <label htmlFor="codigoAcademia">Código de academia</label>
              <input
                id="codigoAcademia"
                name="codigoAcademia"
                autoComplete="organization"
                placeholder="Código de tu academia"
                value={codigoAcademia}
                onChange={(e) => setCodigoAcademia(e.target.value)}
                required
              />
              <div className="input-glow" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMostrarCodigo(true)}
              className="cambiar-codigo"
            >
              ¿Tu academia no es esta? Cambiar código de academia
            </button>
          )}

          <div className="form-group">
            <label htmlFor="documento">Documento</label>
            <input
              id="documento"
              name="documento"
              autoComplete="username"
              placeholder="Número de documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              required
            />
            <div className="input-glow" />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="input-glow" />
          </div>

          {error && <p className="banner error">{error}</p>}

          <div className="submit-wrap">
            <div className="mercury-drop" />
            <button type="submit" disabled={enviando} className="btn-base">
              {enviando ? "Ingresando..." : "Ingresar"}
            </button>
          </div>

          <footer className="footer-nav">
            <Link to="/olvide-password">¿Olvidaste tu contraseña?</Link>
            <Link to="/registro">¿Primera vez? Crea tu academia</Link>
          </footer>
        </form>
      </main>
    </div>
  )
}
