import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "@/services/authService";
import { FilePlus2, FileText, Users, Package, BarChart3, Settings, LogOut, Home, ReceiptText, Menu, Search } from "lucide-react";
import { useState,useEffect } from "react";
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

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    "nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 " +
    (isActive ? "bg-success text-white fw-semibold" : "text-dark hover-bg-light");

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        className="bg-white border-end"
        style={{ width: collapsed ? "80px" : "240px", transition: "width 0.3s" }}
      >
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
          {!collapsed && <span className="fw-bold text-success">FacturaPro</span>}
          <button className="btn btn-sm btn-light" onClick={() => setCollapsed(!collapsed)}>
            <Menu size={18} />
          </button>
        </div>
        <nav className="mt-3">
          <ul className="nav flex-column gap-1">
            <li>
              <NavLink to="/home" className={linkCls}>
                <Home size={20} /> {!collapsed && "Inicio"}
              </NavLink>
            </li>
            <li>
              <NavLink to="/facturas" className={linkCls}>
                <FileText size={20} /> {!collapsed && "Facturas"}
              </NavLink>
            </li>
            <li>
              <NavLink to="/facturas/nueva" className={linkCls}>
                <FilePlus2 size={20} /> {!collapsed && "Nueva Factura"}
              </NavLink>
            </li>
            <li>
              <NavLink to="/clientes" className={linkCls}>
                <Users size={20} /> {!collapsed && "Clientes"}
              </NavLink>
            </li>
            <li>
              <NavLink to="/productos" className={linkCls}>
                <Package size={20} /> {!collapsed && "Productos"}
              </NavLink>
            </li>
            <li>
              <NavLink to="/reportes" className={linkCls}>
                <BarChart3 size={20} /> {!collapsed && "Reportes"}
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings" className={linkCls}>
                <Settings size={20} /> {!collapsed && "Configuración"}
              </NavLink>
            </li>
          </ul>
        </nav>
        <div className="mt-auto p-3">
          <button className="btn btn-outline-danger w-100" onClick={handleLogout}>
            <LogOut size={18} /> {!collapsed && "Salir"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow-1 d-flex flex-column">
        {/* Topbar */}
        <header className="bg-white border-bottom px-4 py-2 d-flex align-items-center justify-content-between">
          <div className="input-group w-50">
            <span className="input-group-text bg-light border-0">
              <Search size={18} />
            </span>
            <input type="text" className="form-control border-0" placeholder="Buscar factura, cliente, N° clave..." />
          </div>
          <NavLink to="/facturas/nueva" className="btn btn-success d-flex align-items-center gap-2">
            <FilePlus2 size={18} /> Nueva factura
          </NavLink>
        </header>

        {/* Content */}
        <main className="p-4" style={{ backgroundColor: "#f8f9fa", flex: 1 }}>
          <div className="card shadow-sm p-4">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center text-muted py-2 small">
          © {new Date().getFullYear()} FacturaPro — Cumple con Hacienda (CRC)
        </footer>
      </div>
    </div>
  );
}
