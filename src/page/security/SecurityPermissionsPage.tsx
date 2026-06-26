import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormCombobox } from "@/components/form/FormCombobox";
import { useToastContext } from "@/contexts/ToastContext";
import { Save } from "lucide-react";
import type { AxiosError } from "axios";
import {
  fetchPermissionsByRole,
  fetchRolesForSecurity,
  savePermissionsByRole,
  type MenuPermissionRow,
  type PermissionPayload,
} from "@/services/securityService";
import "./SecurityPermissionsPage.css";

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ||
    axiosError.message ||
    "Ha ocurrido un error. Por favor, intenta nuevamente."
  );
}

type RowState = MenuPermissionRow;

export default function SecurityPermissionsPage() {
  const toast = useToastContext();
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const roles = await fetchRolesForSecurity();
        setRoleOptions(roles);
      } catch (e) {
        toast.error(getErrorMessage(e));
      }
    })();
  }, [toast]);

  useEffect(() => {
    if (!selectedRoleId) {
      setRows([]);
      return;
    }
    void loadPermissions(selectedRoleId);
  }, [selectedRoleId]);

  const loadPermissions = async (roleId: string) => {
    try {
      setLoading(true);
      const data = await fetchPermissionsByRole(roleId);
      setRows(data.items);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (menuId: string, patch: Partial<RowState>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.menuId !== menuId) return row;
        const next = { ...row, ...patch };
        if (next.canWrite || next.canDelete) next.canRead = true;
        if (!next.canRead) {
          next.canWrite = false;
          next.canDelete = false;
        }
        return next;
      })
    );
  };

  const handleSave = async () => {
    if (!selectedRoleId) {
      toast.error("Seleccione un rol");
      return;
    }

    const permissions: PermissionPayload[] = rows.map((r) => ({
      menuId: r.menuId,
      canRead: r.canRead,
      canWrite: r.canWrite,
      canDelete: r.canDelete,
    }));

    try {
      setSaving(true);
      await savePermissionsByRole(selectedRoleId, permissions);
      toast.success("Permisos guardados correctamente");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const groupedRows = rows.reduce<Record<string, RowState[]>>((acc, row) => {
    const section = row.section || "Otros";
    if (!acc[section]) acc[section] = [];
    acc[section].push(row);
    return acc;
  }, {});

  return (
    <div className="permissions-page-container">
      <div className="perm-header">
        <div className="perm-header-left">
          <h1 className="perm-title">Permisos de Acceso</h1>
          <div className="role-selector-wrapper">
            <FormCombobox
              label=""
              options={roleOptions}
              value={selectedRoleId}
              onChange={(val) => setSelectedRoleId(String(val))}
              placeholder="Seleccionar rol..."
              searchPlaceholder="Buscar rol..."
              fullWidth
            />
          </div>
        </div>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!selectedRoleId || loading}
          icon={<Save size={18} />}
        >
          Guardar permisos
        </Button>
      </div>

      {!selectedRoleId ? (
        <div className="perm-empty-state">
          Seleccione un rol en la parte superior para configurar sus permisos.
        </div>
      ) : loading ? (
        <div className="perm-loading">Cargando permisos...</div>
      ) : rows.length === 0 ? (
        <div className="perm-empty-state">
          No hay módulos configurados para este rol.
        </div>
      ) : (
        <div className="perm-sections">
          {Object.entries(groupedRows).map(([section, sectionRows]) => (
            <div key={section} className="perm-section">
              <h2 className="perm-section-title">{section}</h2>
              <div className="perm-grid">
                {sectionRows.map((r) => (
                  <div key={r.menuId} className="perm-card">
                    <div className="perm-card-header">
                      <span className="perm-card-title">{r.name}</span>
                      <span className="perm-card-route">{r.routePath || "—"}</span>
                    </div>

                    <div className="perm-toggles">
                      <div className="perm-toggle-group">
                        <span className="perm-toggle-label">Leer</span>
                        <label className="custom-toggle toggle-read">
                          <input
                            type="checkbox"
                            checked={r.canRead}
                            onChange={(e) => updateRow(r.menuId, { canRead: e.target.checked })}
                            disabled={saving}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      
                      <div className="perm-toggle-group">
                        <span className="perm-toggle-label">Escribir</span>
                        <label className="custom-toggle toggle-write">
                          <input
                            type="checkbox"
                            checked={r.canWrite}
                            onChange={(e) => updateRow(r.menuId, { canWrite: e.target.checked })}
                            disabled={saving}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="perm-toggle-group">
                        <span className="perm-toggle-label">Eliminar</span>
                        <label className="custom-toggle toggle-delete">
                          <input
                            type="checkbox"
                            checked={r.canDelete}
                            onChange={(e) => updateRow(r.menuId, { canDelete: e.target.checked })}
                            disabled={saving}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
