import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getCurrentUserRoleId } from "@/services/authService";
import {
  fetchDynamicMenu,
  getStoredUserMenu,
  type DynamicMenuItem,
  type DynamicMenuResponse,
} from "@/services/securityService";
import { getMenuIconComponent } from "@/config/menuIcons";
import { Home } from "lucide-react";

const SECTION_ORDER = ["Reservas", "Operación", "Gestión", "Seguridad"];

interface DynamicSidebarNavProps {
  collapsed: boolean;
  isMobile: boolean;
  linkCls: (props: { isActive: boolean }) => string;
  onNavClick: () => void;
}

function NavItem({
  item,
  collapsed,
  isMobile,
  linkCls,
  onNavClick,
}: {
  item: DynamicMenuItem;
  collapsed: boolean;
  isMobile: boolean;
  linkCls: (props: { isActive: boolean }) => string;
  onNavClick: () => void;
}) {
  const Icon = getMenuIconComponent(item.icon) ?? Home;

  return (
    <li>
      <NavLink
        to={item.routePath}
        className={linkCls}
        data-bs-toggle={collapsed && !isMobile ? "tooltip" : undefined}
        data-bs-placement="right"
        title={collapsed && !isMobile ? item.name : undefined}
        onClick={onNavClick}
      >
        <Icon size={20} />
        {(!collapsed || isMobile) && item.name}
      </NavLink>
    </li>
  );
}

export default function DynamicSidebarNav({
  collapsed,
  isMobile,
  linkCls,
  onNavClick,
}: DynamicSidebarNavProps) {
  const [menuData, setMenuData] = useState<DynamicMenuResponse | null>(
    getStoredUserMenu()
  );

  useEffect(() => {
    const roleId = getCurrentUserRoleId();
    if (!roleId) return;

    if (menuData?.roleId === roleId && menuData.items?.length) return;

    void fetchDynamicMenu(roleId)
      .then(setMenuData)
      .catch((e) => console.warn("Menú dinámico no disponible:", e));
  }, [menuData?.roleId, menuData?.items?.length]);

  const unsectioned = menuData?.unsectioned ?? [];
  const sections = menuData?.sections ?? {};

  if (!menuData?.items?.length) {
    return (
      <ul className="nav flex-column gap-1">
        <NavItem
          item={{
            id: "fallback-home",
            code: "home",
            name: "Inicio",
            icon: "Home",
            routePath: "/home",
            section: null,
            sortOrder: 0,
            canRead: true,
            canWrite: false,
            canDelete: false,
          }}
          collapsed={collapsed}
          isMobile={isMobile}
          linkCls={linkCls}
          onNavClick={onNavClick}
        />
      </ul>
    );
  }

  const orderedSectionKeys = [
    ...SECTION_ORDER.filter((s) => sections[s]?.length),
    ...Object.keys(sections).filter((s) => !SECTION_ORDER.includes(s)),
  ];

  return (
    <ul className="nav flex-column gap-1">
      {unsectioned.map((item) => (
        <NavItem
          key={item.id}
          item={item}
          collapsed={collapsed}
          isMobile={isMobile}
          linkCls={linkCls}
          onNavClick={onNavClick}
        />
      ))}

      {orderedSectionKeys.map((sectionName) => (
        <div key={sectionName}>
          <div className="sidebar-section mt-3 mb-1">
            {(!collapsed || isMobile) && (
              <small className="text-white-50 px-3">{sectionName}</small>
            )}
          </div>
          {sections[sectionName].map((item) => (
            <NavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              isMobile={isMobile}
              linkCls={linkCls}
              onNavClick={onNavClick}
            />
          ))}
        </div>
      ))}
    </ul>
  );
}
