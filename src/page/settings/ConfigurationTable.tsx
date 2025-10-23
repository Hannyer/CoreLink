import { useEffect, useMemo, useState } from "react";
import { fetchConfigurations, type Configuration } from "@/services/configurationService";
import { ArrowUpDown } from "lucide-react";

type Order = "asc" | "desc";

export default function ConfigurationTable() {
  const [items, setItems] = useState<Configuration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<keyof Configuration>("pkConfiguration");
  const [order, setOrder] = useState<Order>("desc");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await fetchConfigurations({ page, pageSize, search, sort, order });
        if (!ignore) {
          setItems(data.items);
          setTotal(data.total);
        }
      } catch (e: any) {
        if (!ignore) setErr(e?.response?.data?.message || e?.message || "Error al cargar configuración");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [page, pageSize, search, sort, order]);

  const onSort = (field: keyof Configuration) => {
    if (sort === field) setOrder(prev => (prev === "asc" ? "desc" : "asc"));
    else { setSort(field); setOrder("asc"); }
    setPage(1);
  };

  const estadoBadge = (estado: number | null) => {
    if (estado === 1) return <span className="badge text-bg-success">Activo</span>;
    if (estado === 0) return <span className="badge text-bg-secondary">Inactivo</span>;
    return <span className="badge text-bg-light text-dark">—</span>;
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white d-flex flex-wrap align-items-center gap-2">
        <h5 className="mb-0 me-auto">Configuración del sistema</h5>
        <input
          className="form-control"
          style={{ maxWidth: 300 }}
          placeholder="Buscar (DisplayName, Description, Keys...)"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="form-select"
          style={{ width: 120 }}
          value={pageSize}
          onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
        >
          {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v} / pág.</option>)}
        </select>
      </div>

      <div className="card-body p-0">
        {err && <div className="alert alert-danger m-3">{err}</div>}

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <Th sortable field="pkConfiguration" sort={sort} order={order} onSort={onSort}>ID</Th>
                <Th sortable field="displayName"     sort={sort} order={order} onSort={onSort}>Nombre</Th>
                <Th>Estado</Th>
                <Th sortable field="description"      sort={sort} order={order} onSort={onSort}>Descripción</Th>
                <Th>Keys</Th>
                <Th>Value</Th>
                <Th>Obs.</Th>
                <th style={{ width: 110 }} className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center p-4">
                  <div className="spinner-border spinner-border-sm me-2" /> Cargando…
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center p-4 text-muted">Sin resultados</td></tr>
              ) : (
                items.map(row => (
                  <tr key={row.pkConfiguration}>
                    <td>{row.pkConfiguration}</td>
                    <td className="fw-semibold">{row.displayName ?? "—"}</td>
                    <td>{estadoBadge(row.estado)}</td>
                    <td className="text-truncate" style={{ maxWidth: 360 }}>
                      {row.description ?? "—"}
                    </td>
                    <td className="small text-muted">
                      {[row.key01, row.key02, row.key03, row.key04, row.key05, row.key06].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: 260 }}>
                      {row.value ?? "—"}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: 220 }}>
                      {row.observacion ?? "—"}
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2">Editar</button>
                      <button className="btn btn-sm btn-outline-danger">Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-footer bg-white d-flex flex-wrap align-items-center gap-2 justify-content-between">
        <span className="text-muted small">
          Página {page} de {totalPages} · {total} registros
        </span>
        <div className="btn-group">
          <button className="btn btn-outline-secondary" disabled={page <= 1 || loading} onClick={() => setPage(1)}>«</button>
          <button className="btn btn-outline-secondary" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
          <button className="btn btn-outline-secondary" disabled>{page}</button>
          <button className="btn btn-outline-secondary" disabled={page >= totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
          <button className="btn btn-outline-secondary" disabled={page >= totalPages || loading} onClick={() => setPage(totalPages)}>»</button>
        </div>
      </div>
    </div>
  );
}

function Th<T extends object>({
  children,
  sortable,
  field,
  sort,
  order,
  onSort
}: {
  children: React.ReactNode;
  sortable?: boolean;
  field?: keyof T | string;
  sort?: keyof T | string;
  order?: Order;
  onSort?: (f: any) => void;
}) {
  const active = sortable && field === sort;
  return (
    <th
      role={sortable ? "button" : undefined}
      onClick={sortable && field && onSort ? () => onSort(field as any) : undefined}
      className={sortable ? "user-select-none" : undefined}
    >
      <span className="d-inline-flex align-items-center gap-1">
        {children}
        {sortable && <ArrowUpDown size={16} className={active ? "text-primary" : "text-muted"} />}
        {active && <small className="text-primary">{order === "asc" ? "↑" : "↓"}</small>}
      </span>
    </th>
  );
}
