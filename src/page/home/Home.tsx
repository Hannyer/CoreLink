import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BusFront,
  CalendarCheck,
  Clock,
  Home,
  Loader2,
  MapPinned,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { getCurrentUser } from "@/services/authService";
import { getStoredUserMenu, type DynamicMenuItem } from "@/services/securityService";
import {
  fetchMyDriverAssignments,
  fetchMyGuideAssignments,
  type MyDriverAssignment,
  type MyGuideAssignment,
} from "@/services/bookingAssignmentsService";
import { getMenuIconComponent } from "@/config/menuIcons";

function toDatetimeLocal(value: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    startDateTime: new Date(toDatetimeLocal(start)).toISOString(),
    endDateTime: new Date(toDatetimeLocal(end)).toISOString(),
  };
}

function formatTime(value?: string) {
  return value
    ? new Date(value).toLocaleTimeString("es-CR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";
}

function formatDate(value: Date) {
  return value.toLocaleDateString("es-CR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function uniqueQuickLinks(items: DynamicMenuItem[]) {
  const blocked = new Set(["/home"]);
  const preferredRoutes = [
    "/bookings",
    "/operator",
    "/my-guide-assignments",
    "/my-driver-assignments",
    "/schedules",
    "/activities",
    "/transports",
  ];

  return [...items]
    .filter((item) => item.routePath && !blocked.has(item.routePath))
    .sort((a, b) => {
      const aIndex = preferredRoutes.indexOf(a.routePath);
      const bIndex = preferredRoutes.indexOf(b.routePath);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
      }
      return a.sortOrder - b.sortOrder;
    })
    .slice(0, 6);
}

export default function HomePage() {
  const user = getCurrentUser();
  const [guideAssignments, setGuideAssignments] = useState<MyGuideAssignment[]>([]);
  const [driverAssignments, setDriverAssignments] = useState<MyDriverAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const menu = getStoredUserMenu();
  const quickLinks = useMemo(() => uniqueQuickLinks(menu?.items ?? []), [menu?.items]);
  const totalGuidePeople = guideAssignments.reduce((total, item) => total + (item.totalPeople || 0), 0);
  const totalDriverPeople = driverAssignments.reduce((total, item) => total + (item.numberOfPeople || 0), 0);
  const todayLabel = formatDate(new Date());

  useEffect(() => {
    const filters = getTodayRange();
    setLoading(true);
    Promise.allSettled([
      fetchMyGuideAssignments(filters),
      fetchMyDriverAssignments(filters),
    ])
      .then(([guideResult, driverResult]) => {
        if (guideResult.status === "fulfilled") setGuideAssignments(guideResult.value);
        if (driverResult.status === "fulfilled") setDriverAssignments(driverResult.value);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-page">
      <style>{`
        .home-page { display: flex; flex-direction: column; gap: 1.25rem; }
        .home-hero {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--crm-border);
          border-radius: 22px;
          padding: 1.35rem;
          background:
            radial-gradient(700px 260px at 95% 0%, rgba(15,118,110,.15), transparent 60%),
            linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: 0 16px 40px rgba(15,31,46,.06);
        }
        .home-eyebrow { color: var(--crm-primary-strong); font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .home-title { font-size: clamp(1.7rem, 3vw, 2.45rem); line-height: 1.05; letter-spacing: -.04em; margin: .35rem 0; }
        .home-muted { color: var(--crm-muted); }
        .home-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
        .home-card { border: 1px solid var(--crm-border); border-radius: 18px; background: #fff; padding: 1rem; box-shadow: 0 12px 28px rgba(15,31,46,.05); }
        .home-stat { display: flex; gap: .8rem; align-items: flex-start; }
        .home-icon { width: 42px; height: 42px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; background: var(--crm-primary-soft); color: var(--crm-primary-strong); flex: 0 0 auto; }
        .home-value { display: block; font-size: 1.6rem; font-weight: 850; line-height: 1; color: var(--crm-text); }
        .home-label { color: var(--crm-muted); font-size: .82rem; }
        .home-main-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr); gap: 1rem; }
        .home-section-title { display: flex; align-items: center; gap: .5rem; font-weight: 800; margin: 0; }
        .home-list { display: flex; flex-direction: column; gap: .75rem; }
        .home-row { border: 1px solid #e7edf2; border-radius: 14px; padding: .85rem; background: #fff; }
        .home-row-title { font-weight: 750; color: var(--crm-text); }
        .home-pill { display: inline-flex; align-items: center; gap: .35rem; color: var(--crm-muted); font-size: .78rem; }
        .home-link-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
        .home-link { text-decoration: none; color: var(--crm-text); border: 1px solid #e7edf2; border-radius: 15px; padding: .9rem; display: flex; align-items: center; gap: .75rem; background: #fff; transition: transform .18s ease, border-color .18s ease, background .18s ease; }
        .home-link:hover { transform: translateY(-2px); border-color: rgba(15,118,110,.35); background: var(--crm-primary-soft); }
        .home-link span { font-weight: 750; }
        .home-empty { min-height: 160px; display: grid; place-items: center; text-align: center; color: var(--crm-muted); }
        @media (max-width: 1100px) { .home-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .home-main-grid { grid-template-columns: 1fr; } }
        @media (max-width: 640px) { .home-grid, .home-link-grid { grid-template-columns: 1fr; } .home-hero { padding: 1rem; } }
      `}</style>

      <section className="home-hero">
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div>
            <div className="home-eyebrow">Inicio operativo</div>
            <h1 className="home-title">
              {getGreeting()}, {user?.fullName?.split(" ")[0] || "bienvenido"}
            </h1>
            <p className="home-muted mb-0">
              Resumen rápido de tu operación para hoy, {todayLabel}. Usa este panel como punto de entrada a tus módulos disponibles.
            </p>
          </div>
          <div className="home-card" style={{ minWidth: 230 }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <div className="home-icon"><UserRound size={20} /></div>
              <div>
                <div className="fw-bold">{user?.fullName || "Usuario"}</div>
                <div className="home-label">{user?.roleName || "Rol asignado"}</div>
              </div>
            </div>
            <div className="home-pill"><ShieldCheck size={14} /> Acceso según permisos del rol</div>
          </div>
        </div>
      </section>

      <section className="home-grid">
        <div className="home-card home-stat">
          <div className="home-icon"><CalendarCheck size={21} /></div>
          <div><span className="home-value">{guideAssignments.length}</span><span className="home-label">Actividades asignadas hoy</span></div>
        </div>
        <div className="home-card home-stat">
          <div className="home-icon"><UsersRound size={21} /></div>
          <div><span className="home-value">{totalGuidePeople}</span><span className="home-label">Personas en tus actividades</span></div>
        </div>
        <div className="home-card home-stat">
          <div className="home-icon"><BusFront size={21} /></div>
          <div><span className="home-value">{driverAssignments.length}</span><span className="home-label">Traslados asignados hoy</span></div>
        </div>
        <div className="home-card home-stat">
          <div className="home-icon"><MapPinned size={21} /></div>
          <div><span className="home-value">{totalDriverPeople}</span><span className="home-label">Personas por trasladar</span></div>
        </div>
      </section>

      <section className="home-main-grid">
        <div className="home-card">
          <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
            <h2 className="home-section-title h5"><Clock size={19} /> Agenda de hoy</h2>
            {loading && <Loader2 size={18} className="spin home-muted" />}
          </div>
          {!loading && guideAssignments.length === 0 && driverAssignments.length === 0 ? (
            <div className="home-empty">
              <div>
                <Sparkles size={34} className="mb-2" />
                <div className="fw-bold text-dark">Sin asignaciones personales para hoy</div>
                <div>Cuando tengas actividades o traslados asignados aparecerán en este espacio.</div>
              </div>
            </div>
          ) : (
            <div className="home-list">
              {guideAssignments.slice(0, 4).map((item) => (
                <div key={`guide-${item.activityScheduleId}`} className="home-row">
                  <div className="d-flex justify-content-between gap-2 flex-wrap">
                    <div className="home-row-title">{item.activityTitle}</div>
                    <span className="home-pill"><CalendarCheck size={14} /> Actividad</span>
                  </div>
                  <div className="home-pill mt-2"><Clock size={14} /> {formatTime(item.scheduledStart)} - {formatTime(item.scheduledEnd)} · {item.totalPeople || 0} persona(s)</div>
                </div>
              ))}
              {driverAssignments.slice(0, 4).map((item) => (
                <div key={`driver-${item.bookingId}`} className="home-row">
                  <div className="d-flex justify-content-between gap-2 flex-wrap">
                    <div className="home-row-title">{item.activityTitle}</div>
                    <span className="home-pill"><BusFront size={14} /> Traslado</span>
                  </div>
                  <div className="home-pill mt-2"><Clock size={14} /> {formatTime(item.pickupAt || item.scheduledStart)} · {item.customerName} · {item.numberOfPeople || 0} persona(s)</div>
                  {item.referencePointDescription && <div className="home-pill mt-1"><MapPinned size={14} /> {item.referencePointDescription}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="home-card">
          <h2 className="home-section-title h5 mb-3"><Home size={19} /> Accesos rápidos</h2>
          {quickLinks.length === 0 ? (
            <div className="home-empty">
              <div>
                <ShieldCheck size={32} className="mb-2" />
                <div className="fw-bold text-dark">Menú pendiente</div>
                <div>Tu rol aún no tiene módulos adicionales configurados.</div>
              </div>
            </div>
          ) : (
            <div className="home-link-grid">
              {quickLinks.map((item) => {
                const Icon = getMenuIconComponent(item.icon) ?? ArrowRight;
                return (
                  <Link key={item.id} to={item.routePath} className="home-link">
                    <div className="home-icon"><Icon size={18} /></div>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
