import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "@/services/authService";
import {
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  Users,
  BusFront,
  UserCircle2,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Home,
  FilePlus2,
  Menu,
  Search,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

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

        <nav className="mt-3 px-2">
          <ul className="nav flex-column gap-1">
            <li>
              <NavLink
                to="/home"
                className={linkCls}
                data-bs-toggle={collapsed && !isMobile ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed && !isMobile ? "Inicio" : undefined}
                onClick={handleNavClick}
              >
                <Home size={20} />
                {(!collapsed || isMobile) && "Inicio"}
              </NavLink>
            </li>

            <div className="sidebar-section mt-2 mb-1">
              {(!collapsed || isMobile) && <small className="text-white-50 px-3">Reservas</small>}
            </div>
            <li>
              <NavLink
                to="/reservas"
                className={linkCls}
                data-bs-toggle={collapsed && !isMobile ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed && !isMobile ? "Reservas" : undefined}
                onClick={handleNavClick}
              >
                <ClipboardList size={20} />
                {(!collapsed || isMobile) && "Reservas"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/reservas/nueva"
                className={linkCls}
                data-bs-toggle={collapsed && !isMobile ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed && !isMobile ? "Nueva reserva" : undefined}
                onClick={handleNavClick}
              >
                <FilePlus2 size={20} />
                {(!collapsed || isMobile) && "Nueva reserva"}
              </NavLink>
            </li>

            <div className="sidebar-section mt-3 mb-1">
              {(!collapsed || isMobile) && <small className="text-white-50 px-3">Operación</small>}
            </div>
            <li>
              <NavLink
                to="/activities"
                className={linkCls}
                data-bs-toggle={collapsed && !isMobile ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed && !isMobile ? "Actividades" : undefined}
                onClick={handleNavClick}
              >
                <CalendarRange size={20} />
                {(!collapsed || isMobile) && "Actividades"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/operaciones"
                className={linkCls}
                data-bs-toggle={collapsed && !isMobile ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed && !isMobile ? "Operaciones del día" : undefined}
                onClick={handleNavClick}
              >
                <CalendarCheck size={20} />
                {(!collapsed || isMobile) && "Operaciones del día"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/transports"
                className={linkCls}
                data-bs-toggle={collapsed && !isMobile ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed && !isMobile ? "Transportes" : undefined}
                onClick={handleNavClick}
              >
                <BusFront size={20} />
                {(!collapsed || isMobile) && "Transportes"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/guides"
                className={linkCls}
                data-bs-toggle={collapsed && !isMobile ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed && !isMobile ? "Guías" : undefined}
                onClick={handleNavClick}
              >
                <UserCircle2 size={20} />
                {(!collapsed || isMobile) && "Guías"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/unidades"
                className={linkCls}
                data-bs-toggle={collapsed && !isMobile ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed && !isMobile ? "Unidades" : undefined}
                onClick={handleNavClick}
              >
                <Package size={20} />
                {(!collapsed || isMobile) && "Unidades"}
              </NavLink>
            </li>

            <div className="sidebar-section mt-3 mb-1">
              {(!collapsed || isMobile) && <small className="text-white-50 px-3">Gestión</small>}
            </div>
            <li>
              <NavLink
                to="/clientes"
                className={linkCls}
                data-bs-toggle={collapsed && !isMobile ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed && !isMobile ? "Clientes / Agencias" : undefined}
                onClick={handleNavClick}
              >
                <Users size={20} />
                {(!collapsed || isMobile) && "Clientes / Agencias"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/reportes"
                className={linkCls}
                data-bs-toggle={collapsed && !isMobile ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed && !isMobile ? "Reportes" : undefined}
                onClick={handleNavClick}
              >
                <BarChart3 size={20} />
                {(!collapsed || isMobile) && "Reportes"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/settings"
                className={linkCls}
                data-bs-toggle={collapsed && !isMobile ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed && !isMobile ? "Configuración" : undefined}
                onClick={handleNavClick}
              >
                <Settings size={20} />
                {(!collapsed || isMobile) && "Configuración"}
              </NavLink>
            </li>
          </ul>
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
              to="/reservas/nueva" 
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
