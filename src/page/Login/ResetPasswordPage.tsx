import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { AxiosError } from "axios";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { resetPassword } from "@/services/authService";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("El enlace de recuperacion no es valido.");
      return;
    }
    if (password.length < 6) {
      setError("La nueva contrasena debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    try {
      setLoading(true);
      const result = await resetPassword({ token, newPassword: password });
      setSuccess(result.message || "Contrasena actualizada correctamente.");
      window.setTimeout(() => navigate("/login", { replace: true }), 1400);
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || error.message || "No se pudo actualizar la contrasena.");
    } finally {
      setLoading(false);
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
            <small className="text-white-50">Recuperacion segura de acceso</small>
          </div>
        </div>
        <div className="mt-auto">
          <span className="badge auth-badge mb-3">Acceso seguro</span>
          <h2 className="display-6 fw-bold lh-tight mb-3" style={{ maxWidth: 620 }}>
            Crea una nueva contrasena para continuar gestionando la operacion
          </h2>
          <p className="text-white-75 mb-0" style={{ maxWidth: 560 }}>
            El enlace solo puede usarse por tiempo limitado y queda invalidado al guardar la nueva contrasena.
          </p>
        </div>
        <small className="text-white-50">CoreLink Operations</small>
      </aside>

      <main className="flex-fill d-flex align-items-center justify-content-center p-4 p-lg-5">
        <div className="auth-card w-100" style={{ maxWidth: 460 }}>
          <header className="mb-4">
            <span className="badge rounded-pill mb-3" style={{ background: "var(--crm-primary-soft)", color: "var(--crm-primary-strong)" }}>
              Recuperar acceso
            </span>
            <h2 className="fw-bold mb-1 text-white">Nueva contrasena</h2>
            <p className="text-white-50 mb-0">
              Define una nueva contrasena para tu cuenta.
            </p>
          </header>

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success py-2 small" role="status">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label text-white-50">Nueva contrasena</label>
              <div className="position-relative">
                <span className="auth-icon">
                  <LockKeyhole size={18} />
                </span>
                <input
                  type={showPwd ? "text" : "password"}
                  className="form-control auth-input ps-5 pe-10"
                  placeholder="Minimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="btn btn-link auth-eye"
                  onClick={() => setShowPwd((current) => !current)}
                  aria-label={showPwd ? "Ocultar contrasena" : "Mostrar contrasena"}
                  title={showPwd ? "Ocultar contrasena" : "Mostrar contrasena"}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-white-50">Confirmar contrasena</label>
              <div className="position-relative">
                <span className="auth-icon">
                  <LockKeyhole size={18} />
                </span>
                <input
                  type={showPwd ? "text" : "password"}
                  className="form-control auth-input ps-5"
                  placeholder="Repite la contrasena"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button className="btn auth-cta w-100" type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar nueva contrasena"}
            </button>
          </form>

          <footer className="text-center mt-4">
            <Link to="/login" className="text-decoration-none">
              Volver al inicio de sesion
            </Link>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default ResetPasswordPage;
