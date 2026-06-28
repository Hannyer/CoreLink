import { useEffect, useState } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import {
  fetchReferencePointsWithPagination,
  createReferencePoint,
  updateReferencePoint,
  deleteReferencePoint,
} from "@/services/referencePointsService";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormTextarea } from "@/components/form/FormTextarea";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import { useConfirm } from "@/hooks/useConfirm";
import { useToastContext } from "@/contexts/ToastContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Edit, Trash2, Plus } from "lucide-react";
import type { ReferencePoint, ReferencePointFormData } from "@/types/entities";
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

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function ReferencePointsPage() {
  const { canWrite, canDelete } = usePermissions();
  const [items, setItems] = useState<ReferencePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ReferencePoint | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const toast = useToastContext();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);

  const [formData, setFormData] = useState<ReferencePointFormData>({
    description: "",
    status: true,
  });

  useEffect(() => {
    loadItems();
  }, [page, pageSize, statusFilter]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await fetchReferencePointsWithPagination(page, pageSize, statusFilter);
      setItems(response.items);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error("Error al cargar puntos de referencia:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({ description: "", status: true });
    setShowModal(true);
  };

  const handleEdit = (item: ReferencePoint) => {
    setEditingItem(item);
    setFormData({
      description: item.description,
      status: item.status,
    });
    setShowModal(true);
  };

  const handleDeactivate = async (id: string) => {
    const confirmed = await confirm({
      title: "Desactivar punto de referencia",
      message: "¿Deseas desactivar este punto de referencia?",
      variant: "danger",
      confirmText: "Desactivar",
      cancelText: "Cancelar",
    });

    if (!confirmed) return;

    try {
      await deleteReferencePoint(id);
      toast.success("Punto de referencia desactivado correctamente");

      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadItems();
      }
    } catch (error) {
      console.error("Error al desactivar punto de referencia:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast.error("La descripción es requerida");
      return;
    }

    try {
      setFormLoading(true);

      const payload: ReferencePointFormData = {
        description: formData.description.trim(),
        status: formData.status,
      };

      if (editingItem) {
        await updateReferencePoint(editingItem.id, payload);
        toast.success("Punto de referencia actualizado correctamente");
      } else {
        await createReferencePoint(payload);
        toast.success("Punto de referencia creado correctamente");
      }

      setShowModal(false);
      await loadItems();
    } catch (error) {
      console.error("Error al guardar punto de referencia:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const columns: Column<ReferencePoint>[] = [
    {
      key: "description",
      header: "Descripción",
      accessor: (item) => item.description,
    },
    {
      key: "status",
      header: "Estado",
      width: "110px",
      align: "center",
      render: (item) => (
        <span
          style={{
            ...badgeStyles.base,
            ...(item.status ? badgeStyles.success : badgeStyles.danger),
          }}
        >
          {item.status ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Creado",
      hideOnMobile: true,
      accessor: (item) => formatDateTime(item.createdAt),
    },
    {
      key: "createdByName",
      header: "Creado por",
      hideOnMobile: true,
      accessor: (item) => item.createdByName?.trim() || "—",
    },
    {
      key: "updatedAt",
      header: "Modificado",
      hideOnMobile: true,
      accessor: (item) => formatDateTime(item.updatedAt),
    },
    {
      key: "updatedByName",
      header: "Modificado por",
      hideOnMobile: true,
      accessor: (item) => item.updatedByName?.trim() || "—",
    },
    ...(canWrite || canDelete
      ? [
          {
            key: "actions",
            header: "Acciones",
            width: "130px",
            align: "center" as const,
            render: (item: ReferencePoint) => (
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                {canWrite && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                    icon={<Edit size={16} />}
                    style={{ padding: "4px 8px" }}
                    title="Editar"
                  />
                )}
                {canDelete && item.status && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeactivate(item.id)}
                    icon={<Trash2 size={16} />}
                    style={{ padding: "4px 8px" }}
                    title="Desactivar"
                  />
                )}
              </div>
            ),
          },
        ]
      : []),
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
          Nuevo punto
        </Button>
      )}
    </div>
  );

  return (
    <>
      <TableCard<ReferencePoint>
        title="Puntos de referencia"
        loading={loading}
        data={items}
        columns={columns}
        rowKey={(item) => item.id}
        emptyText="No hay puntos de referencia registrados"
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
        title={editingItem ? "Editar punto de referencia" : "Nuevo punto de referencia"}
        size="md"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
      >
        <form onSubmit={handleSubmit}>
          <FormTextarea
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            fullWidth
            disabled={formLoading}
            placeholder="Ej: Entrada principal del parque, Mirador norte..."
            rows={4}
          />

          <FormCheckbox
            label="Activo"
            checked={formData.status ?? true}
            onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
            disabled={formLoading}
          />

          {editingItem && (
            <div
              className="text-muted small mt-2"
              style={{ display: "grid", gap: "4px" }}
            >
              <span>Creado: {formatDateTime(editingItem.createdAt)} — {editingItem.createdByName || "—"}</span>
              <span>Modificado: {formatDateTime(editingItem.updatedAt)} — {editingItem.updatedByName || "—"}</span>
            </div>
          )}

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
              {editingItem ? "Guardar cambios" : "Crear punto"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}
