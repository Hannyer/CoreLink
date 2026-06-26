import { useLocation } from "react-router-dom";
import { getStoredUserMenu } from "@/services/securityService";

export interface UsePermissionsResult {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export function usePermissions(): UsePermissionsResult {
  const location = useLocation();
  const menuData = getStoredUserMenu();

  if (!menuData || !menuData.items) {
    return { canRead: false, canWrite: false, canDelete: false };
  }

  const currentPath = location.pathname === "/" ? "/" : location.pathname.replace(/\/$/, "");
  
  const menuItem = menuData.items.find((item) => {
    const itemPath = item.routePath === "/" ? "/" : (item.routePath || "").replace(/\/$/, "");
    return itemPath === currentPath;
  });

  if (!menuItem) {
    // Si no está definido en las opciones de menú administradas (por ejemplo: /home, /about, /settings),
    // permitimos acceso completo por defecto en el frontend
    return { canRead: true, canWrite: true, canDelete: true };
  }

  return {
    canRead: menuItem.canRead ?? false,
    canWrite: menuItem.canWrite ?? false,
    canDelete: menuItem.canDelete ?? false,
  };
}
