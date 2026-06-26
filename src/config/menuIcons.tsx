import type { LucideIcon } from "lucide-react";
import {
  Home,
  ClipboardList,
  Tags,
  CalendarRange,
  CalendarClock,
  BusFront,
  UserCircle2,
  Building2,
  Shield,
  Users,
  Lock,
  Settings,
  BarChart3,
  Package,
  CalendarCheck,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  ClipboardList,
  Tags,
  CalendarRange,
  CalendarClock,
  BusFront,
  UserCircle2,
  Building2,
  Shield,
  Users,
  Lock,
  Settings,
  BarChart3,
  Package,
  CalendarCheck,
};

export function resolveMenuIcon(name?: string | null, size = 20) {
  if (!name) return null;
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={size} />;
}

export function getMenuIconComponent(name?: string | null): LucideIcon | null {
  if (!name) return null;
  return ICON_MAP[name] ?? null;
}
