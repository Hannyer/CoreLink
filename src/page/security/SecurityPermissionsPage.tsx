import { useEffect, useState } from "react";
import { TableCard, type Column } from "@/components/ui/TableCard";
import { Button } from "@/components/ui/Button";
import { FormCombobox } from "@/components/form/FormCombobox";
import { FormCheckbox } from "@/components/form/FormCheckbox";
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
  }, []);

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

  const columns: Column<RowState>[] = [
    {
      key: "name",
      header: "Módulo",
      accessor: (r) => r.name,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.name}</div>
          {r.section && (
            <small style={{ color: "#64748b" }}>{r.section}</small>
          )}
        </div>
      ),
    },
    {
      key: "routePath",
      header: "Ruta",
      hideOnMobile: true,
      accessor: (r) => r.routePath ?? "—",
    },
    {
      key: "canRead",
      header: "Leer",
      width: "90px",
      align: "center",
      render: (r) => (
        <FormCheckbox
          label=""
          checked={r.canRead}
          onChange={(e) => updateRow(r.menuId, { canRead: e.target.checked })}
          disabled={saving}
        />
      ),
    },
    {
      key: "canWrite",
      header: "Escribir",
      width: "100px",
      align: "center",
      render: (r) => (
        <FormCheckbox
          label=""
          checked={r.canWrite}
          onChange={(e) => updateRow(r.menuId, { canWrite: e.target.checked })}
          disabled={saving}
        />
      ),
    },
    {
      key: "canDelete",
      header: "Eliminar",
      width: "100px",
      align: "center",
      render: (r) => (
        <FormCheckbox
          label=""
          checked={r.canDelete}
          onChange={(e) => updateRow(r.menuId, { canDelete: e.target.checked })}
          disabled={saving}
        />
      ),
    },
  ];

  return (
    <TableCard<RowState>
      title="Permisos de acceso por rol"
      loading={loading}
      data={rows}
      columns={columns}
      rowKey={(r) => r.menuId}
      emptyText={
        selectedRoleId
          ? "No hay módulos configurados"
          : "Seleccione un rol para configurar permisos"
      }
      headerExtra={
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            minWidth: 280,
          }}
        >
          <div style={{ minWidth: 220, flex: 1 }}>
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
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!selectedRoleId || loading}
            icon={<Save size={18} />}
          >
            Guardar permisos
          </Button>
        </div>
      }
    />
  );
}
