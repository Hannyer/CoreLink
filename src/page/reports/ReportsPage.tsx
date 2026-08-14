import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, Loader2 } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  fetchSalesReport, fetchCommissionsReport, fetchOccupancyReport, fetchActivitiesRanking,
  fetchStatusReport, fetchTransportReport, fetchGuidesReport, exportToExcel,
  type SalesReport, type CommissionRow, type OccupancyRow, type ActivityRankRow,
  type StatusRow, type TransportRow, type GuideRow,
} from "@/services/reportsService";
import { useToastContext } from "@/contexts/ToastContext";

const TEAL = "#0f766e";
const CATS = ["#0f766e", "#c9972b", "#115e59", "#5eb0a8", "#9a6b00", "#667789", "#8fb9b3"];
const STATUS_COLORS: Record<string, string> = { confirmed: "#0f766e", pending: "#e0a53b", cancelled: "#c9605f" };
const STATUS_LABEL: Record<string, string> = { confirmed: "Confirmadas", pending: "Pendientes", cancelled: "Canceladas" };

const money = (v: unknown) => "$" + Number(v ?? 0).toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = (v: unknown) => Number(v ?? 0).toLocaleString("es-CR");

type TabKey = "sales" | "commissions" | "occupancy" | "activities" | "status" | "transport" | "guides";
const TABS: { key: TabKey; label: string }[] = [
  { key: "sales", label: "Ventas" },
  { key: "commissions", label: "Comisiones" },
  { key: "occupancy", label: "Ocupación" },
  { key: "activities", label: "Actividades" },
  { key: "status", label: "Estados" },
  { key: "transport", label: "Traslados" },
  { key: "guides", label: "Guías" },
];

// Reportes visibles por ahora. Para habilitar otro, agregá su key aquí
// (ventas: "sales", actividades: "activities", estados: "status").
const ENABLED_TABS: TabKey[] = ["occupancy", "commissions", "transport", "guides"];

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1);
  const to = new Date(now.getFullYear() + 2, 0, 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export default function ReportsPage() {
  const toast = useToastContext();
  const [range, setRange] = useState(defaultRange);
  const [tab, setTab] = useState<TabKey>(ENABLED_TABS[0]);
  const [loading, setLoading] = useState(false);

  const [sales, setSales] = useState<SalesReport | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyRow[]>([]);
  const [activities, setActivities] = useState<ActivityRankRow[]>([]);
  const [status, setStatus] = useState<StatusRow[]>([]);
  const [transport, setTransport] = useState<TransportRow[]>([]);
  const [guides, setGuides] = useState<GuideRow[]>([]);

  const apiRange = useMemo(
    () => ({ from: new Date(range.from + "T00:00:00").toISOString(), to: new Date(range.to + "T00:00:00").toISOString() }),
    [range]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const run = async () => {
      try {
        if (tab === "sales") setSales(await fetchSalesReport(apiRange));
        else if (tab === "commissions") setCommissions(await fetchCommissionsReport(apiRange));
        else if (tab === "occupancy") setOccupancy(await fetchOccupancyReport(apiRange));
        else if (tab === "activities") setActivities(await fetchActivitiesRanking(apiRange));
        else if (tab === "status") setStatus(await fetchStatusReport(apiRange));
        else if (tab === "transport") setTransport(await fetchTransportReport(apiRange));
        else if (tab === "guides") setGuides(await fetchGuidesReport(apiRange));
      } catch (e: any) {
        if (!cancelled) toast.error(e?.response?.data?.message || "Error al cargar el reporte");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [tab, apiRange]);

  const ExportBtn = ({ onClick }: { onClick: () => void }) => (
    <button type="button" className="rp-export-btn" onClick={onClick}>
      <Download size={15} /> Exportar Excel
    </button>
  );

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3">
        <BarChart3 size={24} />
        <div>
          <h2 className="m-0">Reportes</h2>
          <small className="text-white-50">Análisis de reservas, ingresos y operación</small>
        </div>
      </div>

      <div className="rp-toolbar">
        <div className="rp-field">
          <label>Desde</label>
          <input type="date" className="rp-date" value={range.from} max={range.to}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </div>
        <div className="rp-field">
          <label>Hasta</label>
          <input type="date" className="rp-date" value={range.to} min={range.from}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </div>
      </div>

      <div className="rp-tabs">
        {ENABLED_TABS.map((key) => {
          const t = TABS.find((x) => x.key === key);
          if (!t) return null;
          return (
            <button key={t.key} type="button" className={`rp-tab ${tab === t.key ? "rp-tab--active" : ""}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="rp-empty"><Loader2 className="spin" /> Cargando reporte…</div>
      ) : (
        <>
          {/* VENTAS */}
          {tab === "sales" && sales && (
            <>
              <div className="rp-kpis">
                <div className="rp-kpi"><div className="rp-kpi-label">Reservas</div><div className="rp-kpi-value">{int(sales.kpis.reservas)}</div></div>
                <div className="rp-kpi"><div className="rp-kpi-label">Personas</div><div className="rp-kpi-value">{int(sales.kpis.personas)}</div></div>
                <div className="rp-kpi"><div className="rp-kpi-label">Subtotal</div><div className="rp-kpi-value">{money(sales.kpis.subtotal)}</div></div>
                <div className="rp-kpi"><div className="rp-kpi-label">IVA</div><div className="rp-kpi-value">{money(sales.kpis.iva)}</div></div>
                <div className="rp-kpi"><div className="rp-kpi-label">Total</div><div className="rp-kpi-value rp-kpi-value--accent">{money(sales.kpis.total)}</div></div>
              </div>
              <div className="rp-chart-card">
                <div className="rp-section-head">
                  <h3 className="rp-section-title">Ventas por día</h3>
                  <ExportBtn onClick={() => exportToExcel(
                    sales.series.map((s) => ({ Día: s.dia, Reservas: s.reservas, Personas: s.personas, Total: Number(s.total) })),
                    "Ventas", "reporte-ventas", "Reporte de ventas por día")} />
                </div>
                {sales.series.length === 0 ? <div className="rp-empty">Sin datos en el período.</div> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={sales.series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
                      <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#667789" }} interval="preserveStartEnd" minTickGap={28} />
                      <YAxis tick={{ fontSize: 11, fill: "#667789" }} />
                      <Tooltip formatter={(v: number) => money(v)} />
                      <Line type="monotone" dataKey="total" name="Total" stroke={TEAL} strokeWidth={2.5} dot={sales.series.length > 40 ? false : { r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}

          {/* COMISIONES */}
          {tab === "commissions" && (
            <ReportBlock
              title={`Comisiones por compañía${commissions.length > 15 ? " — top 15 en el gráfico" : ""}`}
              rows={commissions}
              onExport={() => exportToExcel(commissions.map((c) => ({ Compañía: c.compania, Reservas: c.reservas, Personas: c.personas, Subtotal: Number(c.subtotal), "Comisión %": Number(c.comision_pct), "Comisión $": Number(c.comision_monto) })), "Comisiones", "reporte-comisiones", "Comisiones por compañía")}
              chart={commissions.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={commissions.slice(0, 15)} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
                    <XAxis dataKey="compania" tick={{ fontSize: 11, fill: "#667789" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#667789" }} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Bar dataKey="comision_monto" name="Comisión" fill={TEAL} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              columns={[
                { h: "Compañía", get: (c: CommissionRow) => c.compania },
                { h: "Reservas", num: true, get: (c: CommissionRow) => int(c.reservas) },
                { h: "Personas", num: true, get: (c: CommissionRow) => int(c.personas) },
                { h: "Subtotal", num: true, get: (c: CommissionRow) => money(c.subtotal) },
                { h: "Comisión %", num: true, get: (c: CommissionRow) => `${Number(c.comision_pct).toFixed(2)}%` },
                { h: "Comisión $", num: true, get: (c: CommissionRow) => money(c.comision_monto) },
              ]}
            />
          )}

          {/* OCUPACIÓN */}
          {tab === "occupancy" && (
            <ReportBlock
              title={`Ocupación por salida${occupancy.length > 12 ? " — 12 más ocupadas en el gráfico" : ""}`}
              rows={occupancy}
              onExport={() => exportToExcel(occupancy.map((o) => ({ Actividad: o.actividad, Horario: o.horario, Capacidad: o.capacidad, Reservado: o.reservado, "Ocupación %": o.ocupacion_pct })), "Ocupacion", "reporte-ocupacion", "Ocupación por salida")}
              chart={occupancy.length > 0 && (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={[...occupancy].sort((a, b) => b.ocupacion_pct - a.ocupacion_pct).slice(0, 12)} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
                    <XAxis dataKey="horario" tick={{ fontSize: 10, fill: "#667789" }} angle={-25} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11, fill: "#667789" }} unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="ocupacion_pct" name="Ocupación" fill={TEAL} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              columns={[
                { h: "Actividad", get: (o: OccupancyRow) => o.actividad },
                { h: "Horario", get: (o: OccupancyRow) => o.horario },
                { h: "Capacidad", num: true, get: (o: OccupancyRow) => int(o.capacidad) },
                { h: "Reservado", num: true, get: (o: OccupancyRow) => int(o.reservado) },
                { h: "Ocupación", num: true, get: (o: OccupancyRow) => `${o.ocupacion_pct}%` },
              ]}
            />
          )}

          {/* ACTIVIDADES */}
          {tab === "activities" && (
            <ReportBlock
              title={`Ranking de actividades${activities.length > 15 ? " — top 15 en el gráfico" : ""}`}
              rows={activities}
              onExport={() => exportToExcel(activities.map((a) => ({ Actividad: a.actividad, Reservas: a.reservas, Personas: a.personas, Ingresos: Number(a.ingresos) })), "Actividades", "reporte-actividades", "Ranking de actividades")}
              chart={activities.length > 0 && (
                <ResponsiveContainer width="100%" height={Math.max(300, Math.min(activities.length, 15) * 34)}>
                  <BarChart data={activities.slice(0, 15)} layout="vertical" margin={{ top: 8, right: 16, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#667789" }} />
                    <YAxis type="category" dataKey="actividad" tick={{ fontSize: 11, fill: "#667789" }} width={130} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Bar dataKey="ingresos" name="Ingresos" fill={TEAL} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              columns={[
                { h: "Actividad", get: (a: ActivityRankRow) => a.actividad },
                { h: "Reservas", num: true, get: (a: ActivityRankRow) => int(a.reservas) },
                { h: "Personas", num: true, get: (a: ActivityRankRow) => int(a.personas) },
                { h: "Ingresos", num: true, get: (a: ActivityRankRow) => money(a.ingresos) },
              ]}
            />
          )}

          {/* ESTADOS */}
          {tab === "status" && (
            <ReportBlock
              title="Reservas por estado"
              rows={status}
              onExport={() => exportToExcel(status.map((s) => ({ Estado: STATUS_LABEL[s.status] || s.status, Reservas: s.reservas, Personas: s.personas })), "Estados", "reporte-estados", "Reservas por estado")}
              chart={status.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={status} dataKey="reservas" nameKey="status" innerRadius={70} outerRadius={110} paddingAngle={2}
                      label={(e: any) => `${STATUS_LABEL[e.status] || e.status}: ${e.reservas}`}>
                      {status.map((s) => <Cell key={s.status} fill={STATUS_COLORS[s.status] || "#94a3b8"} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, _n, p: any) => [`${v} reservas`, STATUS_LABEL[p?.payload?.status] || p?.payload?.status]} />
                    <Legend formatter={(v: string) => STATUS_LABEL[v] || v} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              columns={[
                { h: "Estado", get: (s: StatusRow) => STATUS_LABEL[s.status] || s.status },
                { h: "Reservas", num: true, get: (s: StatusRow) => int(s.reservas) },
                { h: "Personas", num: true, get: (s: StatusRow) => int(s.personas) },
              ]}
            />
          )}

          {/* TRASLADOS */}
          {tab === "transport" && (
            <ReportBlock
              title={`Traslados por chofer${transport.length > 15 ? " — top 15 en el gráfico" : ""}`}
              rows={transport}
              onExport={() => exportToExcel(transport.map((t) => ({ Chofer: t.chofer, Traslados: t.traslados, Personas: t.personas })), "Traslados", "reporte-traslados", "Traslados por chofer")}
              chart={transport.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={transport.slice(0, 15)} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
                    <XAxis dataKey="chofer" tick={{ fontSize: 11, fill: "#667789" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#667789" }} />
                    <Tooltip />
                    <Bar dataKey="traslados" name="Traslados" fill={CATS[1]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              columns={[
                { h: "Chofer", get: (t: TransportRow) => t.chofer },
                { h: "Traslados", num: true, get: (t: TransportRow) => int(t.traslados) },
                { h: "Personas", num: true, get: (t: TransportRow) => int(t.personas) },
              ]}
            />
          )}

          {/* GUÍAS */}
          {tab === "guides" && (
            <ReportBlock
              title={`Carga de guías${guides.length > 15 ? " — top 15 en el gráfico" : ""}`}
              rows={guides}
              onExport={() => exportToExcel(guides.map((g) => ({ Guía: g.guia, Salidas: g.salidas, Personas: g.personas })), "Guias", "reporte-guias", "Carga de guías")}
              chart={guides.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={guides.slice(0, 15)} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
                    <XAxis dataKey="guia" tick={{ fontSize: 11, fill: "#667789" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#667789" }} />
                    <Tooltip />
                    <Bar dataKey="salidas" name="Salidas" fill={TEAL} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              columns={[
                { h: "Guía", get: (g: GuideRow) => g.guia },
                { h: "Salidas", num: true, get: (g: GuideRow) => int(g.salidas) },
                { h: "Personas", num: true, get: (g: GuideRow) => int(g.personas) },
              ]}
            />
          )}
        </>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

/* Bloque genérico: encabezado + export + gráfico + tabla con buscador y paginación */
function ReportBlock<T>({ title, rows, onExport, chart, columns }: {
  title: string;
  rows: T[];
  onExport: () => void;
  chart: React.ReactNode;
  columns: { h: string; num?: boolean; get: (row: T) => React.ReactNode }[];
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Filtra por texto sobre el valor mostrado de cada columna.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((c) => String(c.get(row) ?? "").toLowerCase().includes(q))
    );
  }, [rows, query, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [query, rows]);

  const pageNumbers = useMemo(() => {
    const nums: number[] = [];
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [safePage, totalPages]);

  return (
    <>
      <div className="rp-chart-card">
        <div className="rp-section-head">
          <h3 className="rp-section-title">{title}</h3>
          <ExportButton onClick={onExport} disabled={rows.length === 0} />
        </div>
        {rows.length === 0 ? <div className="rp-empty">Sin datos en el período.</div> : chart}
      </div>

      {rows.length > 0 && (
        <>
          <div className="rp-table-tools">
            <input
              className="rp-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar en la tabla..."
            />
            <span className="rp-table-count">
              {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
              {query ? ` (de ${rows.length})` : ""}
            </span>
          </div>

          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>{columns.map((c) => <th key={c.h} className={c.num ? "num" : ""}>{c.h}</th>)}</tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={columns.length} className="rp-empty">Sin coincidencias.</td></tr>
                ) : paged.map((row, i) => (
                  <tr key={i}>{columns.map((c) => <td key={c.h} className={c.num ? "num" : ""}>{c.get(row)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="rp-pagination">
              <span className="rp-page-info">Página {safePage} de {totalPages}</span>
              <div className="rp-page-btns">
                <button type="button" className="rp-page-btn" onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
                <button type="button" className="rp-page-btn" onClick={() => setPage(safePage - 1)} disabled={safePage === 1}>‹</button>
                {pageNumbers.map((n) => (
                  <button key={n} type="button" className={`rp-page-btn ${n === safePage ? "rp-page-btn--active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                ))}
                <button type="button" className="rp-page-btn" onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages}>›</button>
                <button type="button" className="rp-page-btn" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function ExportButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="rp-export-btn" onClick={onClick} disabled={disabled} style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
      <Download size={15} /> Exportar Excel
    </button>
  );
}
