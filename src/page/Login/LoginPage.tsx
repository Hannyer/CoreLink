import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "@/services/authService";
import type { AxiosError } from "axios";
import { Eye, EyeOff, ShieldCheck, Mail, Lock } from "lucide-react";



const bgUrl =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920"; 


const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as any)?.from?.pathname || "/home";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ username: username.trim(), password });
      navigate(from, { replace: true });
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const status = err.response?.status;
      const message =
        err.response?.data?.message || err.message || "Error en el inicio de sesión";
      setError(`${message}${status ? ` (Código ${status})` : ""}`);
    } finally {
      setLoading(false);
    }
  };

   return (
    <div className="auth-bg min-vh-100 d-flex align-items-stretch">
      {/* Lado visual (hero) */}
      <aside className="d-none d-lg-flex flex-column justify-content-between text-white p-5 auth-hero"
             style={{ // usa la imagen de fondo del login
               // Si ya definiste la imagen en CSS con --auth-image, puedes omitir esto:
               backgroundImage: `linear-gradient(rgba(15,23,42,.55), rgba(15,23,42,.35)), url(${bgUrl})`,
               backgroundRepeat: "no-repeat",
               backgroundPosition: "left center",
               backgroundSize: "cover"
             }}>
        <div className="d-flex align-items-center gap-3">
          <div className="logo-badge" aria-hidden="true">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="h4 mb-0 fw-semibold">Operaciones Turísticas</h1>
            <small className="text-white-50">Gestión de reservas, operaciones y recursos</small>
          </div>
        </div>

        <div className="mt-auto">
          <h2 className="display-6 fw-bold lh-tight mb-3">
            Planifica actividades y coordina equipos
          </h2>
          <p className="text-white-75 mb-4">
            Centraliza reservas, asigna guías y unidades, controla horarios y genera reportes en un solo lugar.
          </p>
          <ul className="list-unstyled mb-0">
            <li className="mb-2">✔ Ingreso y gestión de reservas con calendario (hasta 5 años)</li>
            <li className="mb-2">✔ Transporte: puntos de recogida y horarios</li>
            <li className="mb-2">✔ Comisiones y reportes periódicos</li>
            <li className="mb-2">✔ Asignación de guías (líder/normal) y unidades disponibles</li>
          </ul>
        </div>

        <div className="d-flex align-items-center justify-content-between mt-4">
          <span className="badge auth-badge">Panel Seguro</span>
          <small className="text-white-50">© {new Date().getFullYear()} Operaciones Turísticas</small>
        </div>
      </aside>

      {/* Formulario (glass card) */}
      <main className="flex-fill d-flex align-items-center justify-content-center p-4 p-lg-5">
        <div className="auth-card w-100" style={{ maxWidth: 460 }}>
          {/* Encabezado móvil */}
          <div className="mb-4 d-lg-none text-center">
            <div className="d-inline-flex align-items-center gap-2 mb-2">
              <div className="logo-badge" aria-hidden="true">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h1 className="h5 mb-0 fw-semibold text-white">Operaciones Turísticas</h1>
                <small className="text-white-50">Gestión de reservas, operaciones y recursos</small>
              </div>
            </div>
          </div>

          <header className="mb-3">
            <h2 className="fw-bold mb-1 text-white">Iniciar sesión</h2>
            <p className="text-white-50 mb-0">
              Accede con tu usuario (Administrador u Operativo)
            </p>
          </header>

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="needs-validation" noValidate>
            {/* Usuario */}
            <div className="mb-3">
              <label className="form-label text-white-50">Usuario o correo</label>
              <div className="position-relative">
                <span className="auth-icon">
                  <Mail size={18} />
                </span>
                <input
                  type="text"
                  className="form-control auth-input ps-5"
                  placeholder="tu@empresa.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="mb-2">
              <label className="form-label text-white-50">Contraseña</label>
              <div className="position-relative">
                <span className="auth-icon">
                  <Lock size={18} />
                </span>
                <input
                  type={showPwd ? "text" : "password"}
                  className="form-control auth-input ps-5 pe-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="btn btn-link auth-eye"
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="rememberMe" />
                  <label className="form-check-label text-white-50" htmlFor="rememberMe">
                    Recordarme
                  </label>
                </div>
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none text-white-50"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            <div className="form-text mb-3 text-white-50">
              Al continuar aceptas los Términos y la Política de Privacidad.
            </div>

            <button
              className="btn auth-cta w-100"
              type="submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <span className="d-inline-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                  Ingresando…
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          <footer className="text-center mt-4">
            <small className="text-white-50">
              © {new Date().getFullYear()} Operaciones Turísticas — Administración y Operación
            </small>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;