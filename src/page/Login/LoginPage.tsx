import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login, requestPasswordReset } from "@/services/authService";
import type { AxiosError } from "axios";
import { CalendarCheck, Eye, EyeOff, Lock, Mail, MapPinned, ShieldCheck, UsersRound } from "lucide-react";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

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

  const handleForgotPassword = async () => {
    const email = forgotEmail.trim().toLowerCase();
    setForgotError("");
    setForgotMessage("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setForgotError("Ingresa un correo valido para enviar el enlace.");
      return;
    }

    try {
      setForgotLoading(true);
      const result = await requestPasswordReset({ email });
      setForgotMessage(result.message || "Si el correo existe, recibiras un enlace de recuperacion.");
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      setForgotError(err.response?.data?.message || err.message || "No se pudo enviar el enlace.");
    } finally {
      setForgotLoading(false);
    }
  };

   return (
    <div className="auth-bg min-vh-100 d-flex align-items-stretch">
      <aside className="d-none d-lg-flex flex-column justify-content-between text-white p-5 auth-hero">
        <div className="d-flex align-items-center gap-3">
          <div className="logo-badge" aria-hidden="true">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="h4 mb-0 fw-semibold">CoreLink Operations</h1>
            <small className="text-white-50">Control operativo para experiencias turísticas</small>
          </div>
        </div>

        <div className="mt-auto">
          <span className="badge auth-badge mb-3">Panel empresarial</span>
          <h2 className="display-6 fw-bold lh-tight mb-3" style={{ maxWidth: 620 }}>
            Administra reservas, actividades y traslados con precisión diaria
          </h2>
          <p className="text-white-75 mb-4" style={{ maxWidth: 560 }}>
            Un espacio centralizado para equipos de operación: agenda actividades, asigna guías, coordina vehículos y controla puntos de recogida desde una sola plataforma.
          </p>
          <ul className="list-unstyled mb-4 auth-feature-list">
            <li className="mb-2">Reservas conectadas con calendario, clientes y empresas.</li>
            <li className="mb-2">Asignación operativa de guías, conductores y unidades.</li>
            <li className="mb-2">Traslados con punto de referencia y hora de recogida.</li>
          </ul>
          <div className="auth-kpi">
            <div className="auth-kpi-item">
              <CalendarCheck size={17} className="mb-2" />
              <span className="auth-kpi-value">Agenda</span>
              <span className="auth-kpi-label">Actividades</span>
            </div>
            <div className="auth-kpi-item">
              <UsersRound size={17} className="mb-2" />
              <span className="auth-kpi-value">Equipo</span>
              <span className="auth-kpi-label">Guías y roles</span>
            </div>
            <div className="auth-kpi-item">
              <MapPinned size={17} className="mb-2" />
              <span className="auth-kpi-value">Rutas</span>
              <span className="auth-kpi-label">Recogidas</span>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center justify-content-between mt-4">
          <small className="text-white-50">Acceso seguro con permisos por rol</small>
          <small className="text-white-50">© {new Date().getFullYear()} CoreLink</small>
        </div>
      </aside>

      <main className="flex-fill d-flex align-items-center justify-content-center p-4 p-lg-5">
        <div className="auth-card w-100" style={{ maxWidth: 460 }}>
          <div className="mb-4 d-lg-none text-center">
            <div className="d-inline-flex align-items-center gap-2 mb-2">
              <div className="logo-badge" aria-hidden="true">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h1 className="h5 mb-0 fw-semibold text-white">CoreLink Operations</h1>
                <small className="text-white-50">Reservas, actividades y traslados</small>
              </div>
            </div>
          </div>

          <header className="mb-3">
            <span className="badge rounded-pill mb-3" style={{ background: "var(--crm-primary-soft)", color: "var(--crm-primary-strong)" }}>
              Portal operativo
            </span>
            <h2 className="fw-bold mb-1 text-white">Iniciar sesión</h2>
            <p className="text-white-50 mb-0">
              Ingresa para gestionar la operación del día y las reservas programadas.
            </p>
          </header>

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="needs-validation" autoComplete="off" noValidate>
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
                  placeholder="Correo electronico"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
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
                  placeholder="Contrasena"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
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
                  onClick={() => {
                    setShowForgot((current) => !current);
                    setForgotEmail("");
                    setForgotMessage("");
                    setForgotError("");
                  }}
                  aria-expanded={showForgot}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {showForgot && (
                <div className="auth-reset-box mt-3">
                  <label className="form-label text-white-50 mb-2">Correo de la cuenta</label>
                  <input
                    type="email"
                    className="form-control auth-input"
                    placeholder="Correo electronico"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoComplete="off"
                    disabled={forgotLoading}
                  />
                  <button
                    type="button"
                    className="btn auth-cta w-100 mt-3"
                    onClick={handleForgotPassword}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? "Enviando..." : "Enviar enlace"}
                  </button>
                  {forgotMessage && (
                    <div className="alert alert-success py-2 small mt-3 mb-0" role="status">
                      {forgotMessage}
                    </div>
                  )}
                  {forgotError && (
                    <div className="alert alert-danger py-2 small mt-3 mb-0" role="alert">
                      {forgotError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-text mb-3 text-white-50">
              El acceso está protegido y auditado según los permisos de tu rol.
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
              © {new Date().getFullYear()} CoreLink — Administración y Operación
            </small>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
