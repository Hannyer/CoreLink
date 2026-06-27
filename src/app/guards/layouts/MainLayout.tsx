import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "@/services/authService";
import {
  CalendarCheck,
  LogOut,
  Menu,
  Search,
  X,
  FilePlus2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import DynamicSidebarNav from "@/components/layout/DynamicSidebarNav";

declare global { interface Window { bootstrap: any } }

export default function MainLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767.98px)');

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    // En móvil, cerrar el menú automáticamente si cambia el tamaño
    if (!isMobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    // Prevenir scroll del body cuando el menú móvil está abierto
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    // Inicializar tooltips SOLO cuando esté colapsado (y no en móvil)
    let instances: any[] = [];
    if (collapsed && !isMobile && window.bootstrap) {
      const els = document.querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]');
      els.forEach((el) => {
        const t = new window.bootstrap.Tooltip(el);
        instances.push(t);
      });
    }
    return () => {
      // Destruir instancias creadas en este ciclo
      instances.forEach((t) => t.dispose?.());
      instances = [];
    };
  }, [collapsed, isMobile]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    "nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 sidebar-link " +
    (isActive ? "active" : "");

  const Brand = () => (
    <div className="d-flex align-items-center gap-2">
      <div className="brand-badge d-flex align-items-center justify-content-center">
        <CalendarCheck size={18} />
      </div>
      {!collapsed && (
        <div className="d-flex flex-column lh-1">
          <span className="fw-semibold text-white">Operaciones</span>
          <small className="text-white-50">Turísticas</small>
        </div>
      )}
    </div>
  );

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const handleNavClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="d-flex app-shell">
      {/* Overlay para móvil */}
      {isMobile && mobileMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar glass-sidebar d-flex flex-column border-end ${
          isMobile ? (mobileMenuOpen ? 'sidebar-open' : 'sidebar-closed') : ''
        }`}
        style={!isMobile ? { width: collapsed ? "84px" : "260px" } : undefined}
      >
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-opacity-10">
          <Brand />
          <button
            className="btn btn-sm btn-outline-light ms-2"
            onClick={handleSidebarToggle}
            aria-label="Alternar menú"
            title="Alternar menú"
          >
            {isMobile ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="mt-3 px-2 flex-grow-1">
          <DynamicSidebarNav
            collapsed={collapsed}
            isMobile={isMobile}
            linkCls={linkCls}
            onNavClick={handleNavClick}
          />
        </nav>

        <div className="mt-auto p-3 border-top border-opacity-10">
          <button
            className="btn btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            {(!collapsed || isMobile) && "Salir"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow-1 d-flex flex-column main-surface">
        {/* Topbar */}
        <header className="topbar px-3 px-md-4 py-2 d-flex align-items-center justify-content-between gap-2">
          {/* Botón hamburguesa para móvil */}
          {isMobile && (
            <button
              className="btn btn-outline-light d-lg-none d-flex align-items-center justify-content-center"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
          )}

          <div className="input-group topbar-search flex-grow-1" style={{ maxWidth: isMobile ? '100%' : '400px' }}>
            <span className="input-group-text bg-transparent border-0">
              <Search size={18} />
            </span>
            <input
              type="text"
              className="form-control border-0"
              placeholder={isMobile ? "Buscar…" : "Buscar reserva, cliente, guía, unidad…"}
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <NavLink 
              to="/bookings" 
              className={`btn btn-success d-flex align-items-center gap-2 ${isMobile ? 'btn-sm' : ''}`}
            >
              {isMobile ? (
                <FilePlus2 size={18} />
              ) : (
                <>
                  <FilePlus2 size={18} /> Nueva reserva
                </>
              )}
            </NavLink>
          </div>
        </header>

        {/* Content */}
        <main className="p-3 p-md-4 content-surface flex-grow-1">
          <div className="card shadow-sm p-3 p-md-4 glass-card">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center text-white-50 py-2 small bg-footer">
          © {new Date().getFullYear()} Operaciones Turísticas — Gestión de reservas y operaciones
        </footer>
      </div>
    </div>
  );
}
