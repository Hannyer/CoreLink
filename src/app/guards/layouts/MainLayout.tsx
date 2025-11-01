import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "@/services/authService";
import {
  CalendarCheck,
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
  Search
} from "lucide-react";
import { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

declare global { interface Window { bootstrap: any } }

export default function MainLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    // inicializa tooltips si el sidebar está colapsado
    if (collapsed && window.bootstrap) {
      const els = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      els.forEach((el) => new window.bootstrap.Tooltip(el));
    }
    return () => {
      // opcional: destruir tooltips para evitar fugas
      const els = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      els.forEach((el: any) => el?.dispose?.());
    };
  }, [collapsed]);

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

  return (
    <div className="d-flex app-shell">
      {/* Sidebar */}
      <aside
        className={"sidebar glass-sidebar d-flex flex-column border-end"}
        style={{ width: collapsed ? "84px" : "260px" }}
      >
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-opacity-10">
          <Brand />
          <button
            className="btn btn-sm btn-outline-light ms-2"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Alternar menú"
            title="Alternar menú"
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="mt-3 px-2">
          <ul className="nav flex-column gap-1">
            <li>
              <NavLink
                to="/home"
                className={linkCls}
                data-bs-toggle={collapsed ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed ? "Inicio" : undefined}
              >
                <Home size={20} />
                {!collapsed && "Inicio"}
              </NavLink>
            </li>

            <div className="sidebar-section mt-2 mb-1">
              {!collapsed && <small className="text-white-50 px-3">Reservas</small>}
            </div>
            <li>
              <NavLink
                to="/reservas"
                className={linkCls}
                data-bs-toggle={collapsed ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed ? "Reservas" : undefined}
              >
                <ClipboardList size={20} />
                {!collapsed && "Reservas"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/reservas/nueva"
                className={linkCls}
                data-bs-toggle={collapsed ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed ? "Nueva reserva" : undefined}
              >
                <FilePlus2 size={20} />
                {!collapsed && "Nueva reserva"}
              </NavLink>
            </li>

            <div className="sidebar-section mt-3 mb-1">
              {!collapsed && <small className="text-white-50 px-3">Operación</small>}
            </div>
            <li>
              <NavLink
                to="/operaciones"
                className={linkCls}
                data-bs-toggle={collapsed ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed ? "Operaciones del día" : undefined}
              >
                <CalendarCheck size={20} />
                {!collapsed && "Operaciones del día"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/transporte"
                className={linkCls}
                data-bs-toggle={collapsed ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed ? "Transporte" : undefined}
              >
                <BusFront size={20} />
                {!collapsed && "Transporte"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/guias"
                className={linkCls}
                data-bs-toggle={collapsed ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed ? "Guías" : undefined}
              >
                <UserCircle2 size={20} />
                {!collapsed && "Guías"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/unidades"
                className={linkCls}
                data-bs-toggle={collapsed ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed ? "Unidades" : undefined}
              >
                <Package size={20} />
                {!collapsed && "Unidades"}
              </NavLink>
            </li>

            <div className="sidebar-section mt-3 mb-1">
              {!collapsed && <small className="text-white-50 px-3">Gestión</small>}
            </div>
            <li>
              <NavLink
                to="/clientes"
                className={linkCls}
                data-bs-toggle={collapsed ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed ? "Clientes / Agencias" : undefined}
              >
                <Users size={20} />
                {!collapsed && "Clientes / Agencias"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/reportes"
                className={linkCls}
                data-bs-toggle={collapsed ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed ? "Reportes" : undefined}
              >
                <BarChart3 size={20} />
                {!collapsed && "Reportes"}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/settings"
                className={linkCls}
                data-bs-toggle={collapsed ? "tooltip" : undefined}
                data-bs-placement="right"
                title={collapsed ? "Configuración" : undefined}
              >
                <Settings size={20} />
                {!collapsed && "Configuración"}
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="mt-auto p-3 border-top border-opacity-10">
          <button className="btn btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2"
                  onClick={handleLogout}>
            <LogOut size={18} />
            {!collapsed && "Salir"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow-1 d-flex flex-column main-surface">
        {/* Topbar */}
        <header className="topbar px-3 px-md-4 py-2 d-flex align-items-center justify-content-between">
          <div className="input-group topbar-search">
            <span className="input-group-text bg-transparent border-0">
              <Search size={18} />
            </span>
            <input
              type="text"
              className="form-control border-0"
              placeholder="Buscar reserva, cliente, guía, unidad…"
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <NavLink to="/reservas/nueva" className="btn btn-success d-flex align-items-center gap-2">
              <FilePlus2 size={18} /> Nueva reserva
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
