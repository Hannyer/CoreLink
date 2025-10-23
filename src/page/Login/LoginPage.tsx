import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "@/services/authService";
import type { AxiosError } from "axios";
import { Eye, EyeOff, ShieldCheck, Mail, Lock } from "lucide-react";

const bgUrl =
  "https://ilp.com.do/wp-content/uploads/2023/12/ComunidaddeayudaFE02-8ea83278-3329-4776-8040-b9f7fbb41160-1608084181-scaled.jpg";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/home";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login({ username, password });
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", res.user);
      console.log(res.user)
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
    <div className="min-vh-100 d-flex">
      {/* Panel izquierdo con imagen/branding */}
      <div
         className="d-none d-lg-flex flex-column justify-content-end text-white p-5"
  style={{
    flex: 1,
    minHeight: "100dvh",
    backgroundImage: `linear-gradient(rgba(15,23,42,.55), rgba(15,23,42,.3)), url(${bgUrl})`,
    backgroundSize: "contain",      // <- muestra toda la imagen
    backgroundRepeat: "no-repeat",
    backgroundPosition: "left center",
    backgroundColor: "#0a2a6b"      // color de fondo para zonas vacías
  }}
      >
        <div className="mb-5">
          <div className="d-inline-flex align-items-center gap-2 mb-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 44, height: 44, background: "rgba(255,255,255,.15)" }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="h4 mb-0 fw-semibold">FacturaPro</h1>
              <small className="text-white-50">Facturación electrónica</small>
            </div>
          </div>
          <h2 className="display-6 fw-bold">Agiliza tu facturación</h2>
          <p className="text-white-75">
            Genera y envía comprobantes electrónicos en segundos. Cumple con Hacienda, controla
            tus ventas y concilia sin complicarte.
          </p>
          <ul className="mb-4">
            <li className="mb-1">Certificados y claves de Hacienda</li>
            <li className="mb-1">Reportes de ventas y clientes</li>
            <li className="mb-1">Soporte 24/7</li>
          </ul>
        </div>
      </div>

      {/* Panel derecho con el formulario */}
      <div className="d-flex align-items-center justify-content-center p-4 p-lg-5" style={{ flex: 1 }}>
        <div className="w-100" style={{ maxWidth: 420 }}>
          <div className="mb-4 d-lg-none text-center">
            <div className="d-inline-flex align-items-center gap-2 mb-2">
              <div className="bg-dark text-white d-flex align-items-center justify-content-center rounded-3" style={{ width: 40, height: 40 }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h1 className="h5 mb-0 fw-semibold">FacturaPro</h1>
                <small className="text-muted">Facturación electrónica</small>
              </div>
            </div>
          </div>

          <h2 className="fw-bold mb-1">Iniciar sesión</h2>
          <p className="text-muted mb-4">Accede con tus credenciales de empresa</p>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="needs-validation" noValidate>
            <div className="mb-3">
              <label className="form-label">Usuario o correo</label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <Mail size={18} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="tu@empresa.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="mb-2">
              <label className="form-label">Contraseña</label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <Lock size={18} />
                </span>
                <input
                  type={showPwd ? "text" : "password"}
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="d-flex justify-content-between mt-2">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="rememberMe" />
                  <label className="form-check-label" htmlFor="rememberMe">
                    Recordarme
                  </label>
                </div>
                <button type="button" className="btn btn-link p-0">¿Olvidaste tu contraseña?</button>
              </div>
            </div>

            <div className="form-text mb-3">
              Este sitio está protegido por medidas anti-bot. Al continuar aceptas los Términos y la Política de Privacidad.
            </div>

            <button
              className="btn btn-success w-100"
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

          <div className="text-center text-muted mt-4">
            © {new Date().getFullYear()} FacturaPro — Cumple con Hacienda (CRC)
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
