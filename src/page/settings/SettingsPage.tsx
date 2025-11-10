import { useEffect, useState } from "react";
import { fetchConfigurationsWithPagination, updateConfigurationValue, type Configuration } from "@/services/configurationService";
import { Pagination } from "@/components/ui/Pagination";
import { useToastContext } from "@/contexts/ToastContext";
import { Check, X, Pencil } from "lucide-react";
import type { AxiosError } from "axios";

/**
 * Función helper para extraer el mensaje de error del formato del API
 */
function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string; title?: string }>;
  
  if (axiosError.response?.data?.message) {
    return axiosError.response.data.message;
  }
  
  if (axiosError.message) {
    return axiosError.message;
  }
  
  return "Ha ocurrido un error. Por favor, intenta nuevamente.";
}

export default function SettingsPage() {
  const [items, setItems] = useState<Configuration[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const toast = useToastContext();

  useEffect(() => {
    loadConfigurations();
  }, [page, pageSize]);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      setErr("");
      const response = await fetchConfigurationsWithPagination(page, pageSize);
      setItems(response.items);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Error al cargar configuración");
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (config: Configuration) => {
    setEditingId(config.pkConfiguration);
    setEditingValue(config.value || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const handleSaveValue = async (id: number) => {
    try {
      setSavingId(id);
      await updateConfigurationValue(id, editingValue);
      toast.success("Valor actualizado correctamente");
      setEditingId(null);
      setEditingValue("");
      await loadConfigurations();
    } catch (error) {
      console.error("Error al actualizar valor:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSavingId(null);
    }
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
        <select
          className="form-select"
          style={{ width: 120 }}
          value={pageSize}
          onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
        >
          {[5, 10, 20, 50, 100].map(v => <option key={v} value={v}>{v} / pág.</option>)}
        </select>
      </div>

      <div className="card-body p-0">
        {err && <div className="alert alert-danger m-3">{err}</div>}

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Descripción</th>
                <th>Keys</th>
                <th>Value</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center p-4">
                  <div className="spinner-border spinner-border-sm me-2" /> Cargando…
                </td></tr>
              ) : (!items || items.length === 0) ? (
                <tr><td colSpan={4} className="text-center p-4 text-muted">Sin resultados</td></tr>
              ) : (
                items.map(row => (
                  <tr key={row.pkConfiguration}>
                    <td className="text-truncate" style={{ maxWidth: 360 }}>
                      {row.description ?? "—"}
                    </td>
                    <td className="small text-muted">
                      {[row.key01, row.key02, row.key03, row.key04, row.key05, row.key06].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      {editingId === row.pkConfiguration ? (
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            disabled={savingId === row.pkConfiguration}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveValue(row.pkConfiguration);
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleSaveValue(row.pkConfiguration)}
                            disabled={savingId === row.pkConfiguration}
                            title="Guardar"
                          >
                            {savingId === row.pkConfiguration ? (
                              <div className="spinner-border spinner-border-sm" style={{ width: "14px", height: "14px" }} />
                            ) : (
                              <Check size={14} />
                            )}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={handleCancelEdit}
                            disabled={savingId === row.pkConfiguration}
                            title="Cancelar"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="d-flex align-items-center gap-2">
                          <span className="text-truncate" style={{ maxWidth: 260 }}>
                            {row.value ?? "—"}
                          </span>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleStartEdit(row)}
                            title="Editar valor"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td>{estadoBadge(row.estado)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-footer bg-white">
        <Pagination
          current={page}
          total={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          showPageSizeSelector={false}
          disabled={loading}
        />
      </div>
    </div>
  );
}