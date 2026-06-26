import { useEffect, useState } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import {
  fetchRolesWithPagination,
  createRole,
  updateRole,
  deleteRole,
} from "@/services/rolesService";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/form/FormInput";
import { FormTextarea } from "@/components/form/FormTextarea";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import { useConfirm } from "@/hooks/useConfirm";
import { useToastContext } from "@/contexts/ToastContext";
import { Edit, Trash2, Plus } from "lucide-react";
import type { Role, RoleFormData } from "@/types/entities";
import type { AxiosError } from "axios";
import { usePermissions } from "@/hooks/usePermissions";

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

export default function RolesPage() {
  const { canWrite, canDelete } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const toast = useToastContext();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);

  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    description: "",
    requiresLicense: false,
    status: true,
  });

  useEffect(() => {
    loadRoles();
  }, [page, pageSize, statusFilter]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await fetchRolesWithPagination(page, pageSize, statusFilter);
      setRoles(response.items);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error("Error al cargar roles:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      requiresLicense: false,
      status: true,
    });
    setShowModal(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description ?? "",
      requiresLicense: role.requiresLicense,
      status: role.status,
    });
    setShowModal(true);
  };

  const handleDeactivate = async (id: string) => {
    const confirmed = await confirm({
      title: "Desactivar rol",
      message:
        "¿Deseas desactivar este rol? No se podrá asignar a nuevos usuarios. Si aún hay usuarios con este rol, la operación puede fallar.",
      variant: "danger",
      confirmText: "Desactivar",
      cancelText: "Cancelar",
    });

    if (!confirmed) return;

    try {
      await deleteRole(id);
      toast.success("Rol desactivado correctamente");

      if (roles.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadRoles();
      }
    } catch (error) {
      console.error("Error al desactivar rol:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      setFormLoading(true);

      const payload: RoleFormData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        requiresLicense: formData.requiresLicense ?? false,
        status: formData.status,
      };

      if (editingRole) {
        await updateRole(editingRole.id, payload);
        toast.success("Rol actualizado correctamente");
      } else {
        await createRole(payload);
        toast.success("Rol creado correctamente");
      }

      setShowModal(false);
      await loadRoles();
    } catch (error) {
      console.error("Error al guardar rol:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const columns: Column<Role>[] = [
    { key: "name", header: "Nombre", accessor: (r) => r.name },
    {
      key: "description",
      header: "Descripción",
      hideOnMobile: true,
      accessor: (r) => r.description?.trim() || "—",
    },
    {
      key: "status",
      header: "Estado",
      width: "110px",
      align: "center",
      render: (r) => (
        <span style={{ ...badgeStyles.base, ...(r.status ? badgeStyles.success : badgeStyles.danger) }}>
          {r.status ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      width: "130px",
      align: "center",
      render: (r) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(r)}
              icon={<Edit size={16} />}
              style={{ padding: "4px 8px" }}
              title="Editar"
            />
          )}
          {canDelete && r.status && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeactivate(r.id)}
              icon={<Trash2 size={16} />}
              style={{ padding: "4px 8px" }}
              title="Desactivar"
            />
          )}
        </div>
      ),
    },
  ];

  const headerExtra = (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Button
          variant={statusFilter === null ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter(null);
            setPage(1);
          }}
        >
          Todos
        </Button>
        <Button
          variant={statusFilter === true ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter(true);
            setPage(1);
          }}
        >
          Activos
        </Button>
        <Button
          variant={statusFilter === false ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter(false);
            setPage(1);
          }}
        >
          Inactivos
        </Button>
      </div>
      {canWrite && (
        <Button onClick={handleCreate} icon={<Plus size={18} />} size="sm">
          Nuevo rol
        </Button>
      )}
    </div>
  );

  return (
    <>
      <TableCard<Role>
        title="Roles de usuario"
        loading={loading}
        data={roles}
        columns={columns.filter(col => col.key !== "actions" || canWrite || canDelete)}
        rowKey={(r) => r.id}
        emptyText="No hay roles registrados"
        headerExtra={headerExtra}
        footer={
          <Pagination
            current={page}
            total={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            showPageSizeSelector
            pageSizeOptions={[5, 10, 20, 50]}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            disabled={loading}
          />
        }
      />

      <Modal
        isOpen={showModal}
        onClose={() => !formLoading && setShowModal(false)}
        title={editingRole ? "Editar rol" : "Nuevo rol"}
        size="md"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
            disabled={formLoading}
            placeholder="Ej: Conductor"
          />

          <FormTextarea
            label="Descripción"
            value={formData.description ?? ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            disabled={formLoading}
            placeholder="Opcional"
            rows={3}
          />      

          <FormCheckbox
            label="Activo"
            checked={formData.status ?? true}
            onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
            disabled={formLoading}
          />

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              marginTop: "24px",
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={formLoading}>
              {editingRole ? "Guardar cambios" : "Crear rol"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}
