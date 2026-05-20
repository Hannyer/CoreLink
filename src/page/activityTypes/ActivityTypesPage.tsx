import { useEffect, useState } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import {
  fetchActivityTypesWithPagination,
  createActivityType,
  updateActivityType,
  deleteActivityType,
} from "@/services/activityTypeService";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/form/FormInput";
import { FormTextarea } from "@/components/form/FormTextarea";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import { useConfirm } from "@/hooks/useConfirm";
import { useToastContext } from "@/contexts/ToastContext";
import { Edit, Trash2, Plus } from "lucide-react";
import type { ActivityType, ActivityTypeFormData } from "@/types/entities";
import type { AxiosError } from "axios";

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

export default function ActivityTypesPage() {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ActivityType | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const toast = useToastContext();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);

  const [formData, setFormData] = useState<ActivityTypeFormData>({
    name: "",
    description: "",
    status: true,
  });

  useEffect(() => {
    loadActivityTypes();
  }, [page, pageSize, statusFilter]);

  const loadActivityTypes = async () => {
    try {
      setLoading(true);
      const response = await fetchActivityTypesWithPagination(page, pageSize, statusFilter);
      setActivityTypes(response.items);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error("Error al cargar tipos de actividad:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      description: "",
      status: true,
    });
    setShowModal(true);
  };

  const handleEdit = (item: ActivityType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description ?? "",
      status: item.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar tipo de actividad",
      message:
        "¿Estás seguro de que deseas eliminar este tipo de actividad? Esta acción no se puede deshacer.",
      variant: "danger",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) return;

    try {
      await deleteActivityType(id);
      toast.success("Tipo de actividad eliminado correctamente");

      if (activityTypes.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadActivityTypes();
      }
    } catch (error) {
      console.error("Error al eliminar tipo de actividad:", error);
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

      const payload: ActivityTypeFormData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        status: formData.status,
      };

      if (editingItem) {
        await updateActivityType(editingItem.id, payload);
        toast.success("Tipo de actividad actualizado correctamente");
      } else {
        await createActivityType(payload);
        toast.success("Tipo de actividad creado correctamente");
      }

      setShowModal(false);
      await loadActivityTypes();
    } catch (error) {
      console.error("Error al guardar tipo de actividad:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const columns: Column<ActivityType>[] = [
    { key: "name", header: "Nombre", accessor: (t) => t.name },
    {
      key: "description",
      header: "Descripción",
      hideOnMobile: true,
      accessor: (t) => t.description?.trim() || "—",
    },
    {
      key: "status",
      header: "Estado",
      width: "120px",
      align: "center",
      render: (t) => (
        <span style={{ ...badgeStyles.base, ...(t.status ? badgeStyles.success : badgeStyles.danger) }}>
          {t.status ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      width: "140px",
      align: "center",
      render: (t) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(t)}
            icon={<Edit size={16} />}
            style={{ padding: "4px 8px" }}
          />
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(t.id)}
            icon={<Trash2 size={16} />}
            style={{ padding: "4px 8px" }}
          />
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
      <Button onClick={handleCreate} icon={<Plus size={18} />} size="sm">
        Nuevo tipo
      </Button>
    </div>
  );

  return (
    <>
      <TableCard<ActivityType>
        title="Tipos de actividad"
        loading={loading}
        data={activityTypes}
        columns={columns}
        rowKey={(t) => t.id}
        emptyText="No hay tipos de actividad aún"
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
        title={editingItem ? "Editar tipo de actividad" : "Nuevo tipo de actividad"}
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
            placeholder="Ej: Tour de aventura"
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
              {editingItem ? "Guardar cambios" : "Crear tipo"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}
