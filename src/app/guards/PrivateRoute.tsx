import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStoredUserMenu } from "@/services/securityService";
import { logout, refreshUserMenu } from "@/services/authService";

/**
 * Los permisos se guardan en el navegador al iniciar sesión. Si después cambian
 * (o la copia guardada quedó incompleta), la sesión abierta seguía con los
 * permisos viejos y desaparecían botones como «Nueva reserva» hasta volver a
 * entrar. Por eso se refrescan una vez al abrir la aplicación.
 */
let menuRefrescado = false;

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");
  const location = useLocation();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!token || menuRefrescado) return;
    menuRefrescado = true;
    refreshUserMenu()
      .then(() => setVersion((v) => v + 1))
      .catch(() => {
        // Si falla (sin red, por ejemplo) seguimos con la copia guardada
        // y se vuelve a intentar en la próxima carga.
        menuRefrescado = false;
      });
  }, [token]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const menuData = getStoredUserMenu();
  if (menuData && menuData.items) {
    const currentPath = location.pathname === "/" ? "/" : location.pathname.replace(/\/$/, "");
    const menuItem = menuData.items.find((item) => {
      const itemPath = item.routePath === "/" ? "/" : (item.routePath || "").replace(/\/$/, "");
      return itemPath === currentPath;
    });

    // Si la opción de menú existe pero canRead es falso, denegamos el acceso redirigiendo al login.
    if (menuItem && !menuItem.canRead) {
      logout();
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
}
