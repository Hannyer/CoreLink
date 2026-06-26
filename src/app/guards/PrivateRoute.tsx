import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStoredUserMenu } from "@/services/securityService";
import { logout } from "@/services/authService";

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");
  const location = useLocation();

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