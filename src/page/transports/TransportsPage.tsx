import { useEffect, useState } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import { fetchTransportsWithPagination, createTransport, updateTransport, deleteTransport } from "@/services/transportService";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/form/FormInput";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import { useConfirm } from "@/hooks/useConfirm";
import { useToastContext } from "@/contexts/ToastContext";
import { Edit, Trash2, Plus } from "lucide-react";
import type { Transport, TransportFormData } from "@/types/entities";
import type { AxiosError } from "axios";

/**
 * Función helper para extraer el mensaje de error del formato del API
 */
function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string; title?: string }>;
  
  // Intentar obtener el mensaje del formato del API
  if (axiosError.response?.data?.message) {
    return axiosError.response.data.message;
  }
  
  // Si no hay mensaje específico, usar un mensaje genérico
  if (axiosError.message) {
    return axiosError.message;
  }
  
  return "Ha ocurrido un error. Por favor, intenta nuevamente.";
}

export default function TransportsPage() {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const toast = useToastContext();

  // Estado de paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [formData, setFormData] = useState<TransportFormData>({
    model: "",
    capacity: 1,
    operationalStatus: true,
    status: true,
  });

  useEffect(() => {
    loadTransports();
  }, [page, pageSize]);

  const loadTransports = async () => {
    try {
      setLoading(true);
      const response = await fetchTransportsWithPagination(page, pageSize);
      setTransports(response.items);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error("Error al cargar transportes:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTransport(null);
    setFormData({
      model: "",
      capacity: 1,
      operationalStatus: true,
      status: true,
    });
    setShowModal(true);
  };

  const handleEdit = (transport: Transport) => {
    setEditingTransport(transport);
    setFormData({
      model: transport.model,
      capacity: transport.capacity,
      operationalStatus: transport.operationalStatus,
      status: transport.status,
    });
    setShowModal(true);
  };

  const handleDeleteClick = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar Transporte",
      message: "¿Estás seguro de que deseas eliminar este transporte? Esta acción no se puede deshacer.",
      variant: "danger",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (confirmed) {
      try {
        await deleteTransport(id);
        toast.success("Transporte eliminado correctamente");
        
        // Si solo hay un elemento en la página actual y no es la primera página,
        // volver a la página anterior después de eliminar
        const currentPageItemCount = transports.length;
        if (currentPageItemCount === 1 && page > 1) {
          setPage(page - 1);
        } else {
          await loadTransports();
        }
      } catch (error) {
        console.error("Error al eliminar transporte:", error);
        toast.error(getErrorMessage(error));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.model.trim()) {
      toast.error("El modelo es requerido");
      return;
    }

    if (!formData.capacity || formData.capacity < 1) {
      toast.error("La capacidad debe ser mayor a 0");
      return;
    }

    try {
      setFormLoading(true);
      
      const payload: TransportFormData = {
        model: formData.model.trim(),
        capacity: formData.capacity,
        operationalStatus: formData.operationalStatus,
        status: formData.status,
      };

      if (editingTransport) {
        await updateTransport(editingTransport.id, payload);
        toast.success("Transporte actualizado correctamente");
      } else {
        await createTransport(payload);
        toast.success("Transporte creado correctamente");
      }

      setShowModal(false);
      await loadTransports();
    } catch (error) {
      console.error("Error al guardar transporte:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const columns: Column<Transport>[] = [
    { key: "model", header: "Modelo", accessor: (t) => t.model },
    {
      key: "capacity",
      header: "Capacidad",
      width: "120px",
      align: "center",
      accessor: (t) => t.capacity,
    },
    {
      key: "operationalStatus",
      header: "Estado Operacional",
      width: "160px",
      align: "center",
      render: (t) => (
        <span style={{ ...badgeStyles.base, ...(t.operationalStatus ? badgeStyles.success : badgeStyles.danger) }}>
          {t.operationalStatus ? "Operativo" : "No Operativo"}
        </span>
      ),
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
            onClick={() => handleDeleteClick(t.id)}
            icon={<Trash2 size={16} />}
            style={{ padding: "4px 8px" }}
          />
        </div>
      ),
    },
  ];

  const headerExtra = (
    <div style={{ display: "flex", gap: 8 }}>
      <Button onClick={handleCreate} icon={<Plus size={18} />} size="sm">
        Nuevo transporte
      </Button>
    </div>
  );

  return (
    <>
      <TableCard<Transport>
        title="Lista de transportes"
        loading={loading}
        data={transports}
        columns={columns}
        rowKey={(t) => t.id}
        emptyText="No hay transportes aún"
        headerExtra={headerExtra}
        footer={
          <Pagination
            current={page}
            total={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            showPageSizeSelector={true}
            pageSizeOptions={[5, 10, 20, 50]}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1); // Resetear a la primera página cuando cambia el tamaño
            }}
            disabled={loading}
          />
        }
      />

      {/* Modal para crear/editar transporte */}
      <Modal
        isOpen={showModal}
        onClose={() => !formLoading && setShowModal(false)}
        title={editingTransport ? "Editar Transporte" : "Nuevo Transporte"}
        size="md"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Modelo"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            required
            fullWidth
            disabled={formLoading}
            placeholder="Ej: Toyota Hiace 2020"
          />

          <FormInput
            label="Capacidad"
            type="number"
            value={formData.capacity}
            onChange={(e) =>
              setFormData({
                ...formData,
                capacity: e.target.value ? parseInt(e.target.value) : 1,
              })
            }
            min={1}
            required
            fullWidth
            disabled={formLoading}
            placeholder="Número de pasajeros"
          />

          <FormCheckbox
            label="Estado Operacional"
            checked={formData.operationalStatus}
            onChange={(e) => setFormData({ ...formData, operationalStatus: e.target.checked })}
            disabled={formLoading}
          />

          <FormCheckbox
            label="Activo"
            checked={formData.status}
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
              {editingTransport ? "Guardar Cambios" : "Crear Transporte"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}

