import { useEffect, useState } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import {
  fetchActivitiesWithPagination,
  createActivity,
  updateActivity,
  deleteActivity,
} from "@/services/activityService";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/form/FormInput";
import { FormCombobox, type SelectOption } from "@/components/form/FormCombobox";
import { getActivityTypes } from "@/services/activityTypeService";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import { useConfirm } from "@/hooks/useConfirm";
import { useToastContext } from "@/contexts/ToastContext";
import { Edit, Trash2, Plus } from "lucide-react";
import type { Activity, ActivityFormData } from "@/types/entities";
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

export default function ActivitiesManagementPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const toast = useToastContext();

  // Estado de paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Estado para tipos de actividad
  const [activityTypes, setActivityTypes] = useState<SelectOption[]>([]);

  const [formData, setFormData] = useState<
    ActivityFormData & {
      partySizeInput: string | number;
      adultPriceInput: string | number;
      childPriceInput: string | number;
      seniorPriceInput: string | number;
    }
  >({
    activityTypeId: "",
    title: "",
    partySize: 0,
    partySizeInput: "",
    adultPrice: 0,
    adultPriceInput: "",
    childPrice: 0,
    childPriceInput: "",
    seniorPrice: 0,
    seniorPriceInput: "",
    status: true,
  });

  useEffect(() => {
    loadActivities();
    loadActivityTypes();
  }, [page, pageSize]);

  const loadActivityTypes = async () => {
    try {
      const types = await getActivityTypes();
      setActivityTypes(types.map((t) => ({ value: t.id, label: t.name })));
    } catch (error) {
      console.error("Error al cargar tipos de actividad:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await fetchActivitiesWithPagination(page, pageSize, null);
      setActivities(response.items);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error("Error al cargar actividades:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = () => {
    setEditingActivity(null);
    setFormData({
      activityTypeId: "",
      title: "",
      partySize: 0,
      partySizeInput: "",
      adultPrice: 0,
      adultPriceInput: "",
      childPrice: 0,
      childPriceInput: "",
      seniorPrice: 0,
      seniorPriceInput: "",
      status: true,
    });
    setShowActivityModal(true);
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      activityTypeId: activity.activityTypeId,
      title: activity.title,
      partySize: activity.partySize,
      partySizeInput: activity.partySize,
      adultPrice: activity.adultPrice,
      adultPriceInput: activity.adultPrice,
      childPrice: activity.childPrice,
      childPriceInput: activity.childPrice,
      seniorPrice: activity.seniorPrice,
      seniorPriceInput: activity.seniorPrice,
      status: activity.status,
    });
    setShowActivityModal(true);
  };

  const handleDeleteActivity = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar Actividad",
      message: "¿Estás seguro de que deseas eliminar esta actividad? Esta acción no se puede deshacer.",
      variant: "danger",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (confirmed) {
      try {
        await deleteActivity(id);
        toast.success("Actividad eliminada correctamente");

        const currentPageItemCount = activities.length;
        if (currentPageItemCount === 1 && page > 1) {
          setPage(page - 1);
        } else {
          await loadActivities();
        }
      } catch (error) {
        console.error("Error al eliminar actividad:", error);
        toast.error(getErrorMessage(error));
      }
    }
  };

  const parseNum = (v: string | number): number | null => {
    if (typeof v === "string") {
      const s = v.trim();
      if (s === "") return null;
      const n = parseFloat(s);
      return Number.isNaN(n) ? null : n;
    }
    return v;
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("El título es requerido");
      return;
    }

    if (!formData.activityTypeId) {
      toast.error("El tipo de actividad es requerido");
      return;
    }

    const partySizeVal = parseNum(formData.partySizeInput);
    if (partySizeVal === null || partySizeVal <= 0) {
      toast.error("El tamaño del grupo es requerido y debe ser mayor a 0");
      return;
    }

    const adultPriceVal = parseNum(formData.adultPriceInput);
    if (adultPriceVal === null || adultPriceVal <= 0) {
      toast.error("Precio adulto es requerido y debe ser mayor a 0");
      return;
    }

    const childPriceVal = parseNum(formData.childPriceInput);
    if (childPriceVal === null || childPriceVal <= 0) {
      toast.error("Precio niño es requerido y debe ser mayor a 0");
      return;
    }

    const seniorPriceVal = parseNum(formData.seniorPriceInput);
    if (seniorPriceVal === null || seniorPriceVal <= 0) {
      toast.error("Precio adulto mayor es requerido y debe ser mayor a 0");
      return;
    }

    try {
      setFormLoading(true);

      const payload: ActivityFormData = {
        activityTypeId: formData.activityTypeId,
        title: formData.title.trim(),
        partySize: partySizeVal,
        adultPrice: adultPriceVal,
        childPrice: childPriceVal,
        seniorPrice: seniorPriceVal,
        status: formData.status ?? true,
      };

      if (editingActivity) {
        await updateActivity(editingActivity.id, payload);
        toast.success("Actividad actualizada correctamente");
      } else {
        await createActivity(payload);
        toast.success("Actividad creada correctamente");
      }

      setShowActivityModal(false);
      await loadActivities();
    } catch (error) {
      console.error("Error al guardar actividad:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const formatPrice = (n: number) =>
    Number.isFinite(n) ? n.toFixed(2) : "-";

  const columns: Column<Activity>[] = [
    { key: "title", header: "Título", accessor: (a) => a.title },
    {
      key: "activityType",
      header: "Tipo",
      accessor: (a) => a.activityTypeName || "-",
    },
    {
      key: "partySize",
      header: "Tamaño del Grupo",
      width: "140px",
      align: "center",
      accessor: (a) => a.partySize,
    },
    {
      key: "adultPrice",
      header: "Precio Adulto",
      width: "120px",
      align: "right",
      accessor: (a) => formatPrice(a.adultPrice),
    },
    {
      key: "childPrice",
      header: "Precio Niño",
      width: "120px",
      align: "right",
      accessor: (a) => formatPrice(a.childPrice),
    },
    {
      key: "seniorPrice",
      header: "Precio Adulto Mayor",
      width: "140px",
      align: "right",
      accessor: (a) => formatPrice(a.seniorPrice),
    },
    {
      key: "status",
      header: "Estado",
      width: "120px",
      align: "center",
      render: (a) => (
        <span
          style={{
            ...badgeStyles.base,
            ...(a.status ? badgeStyles.success : badgeStyles.danger),
          }}
        >
          {a.status ? "Activa" : "Inactiva"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      width: "200px",
      align: "center",
      render: (a) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditActivity(a)}
            icon={<Edit size={16} />}
            style={{ padding: "4px 8px" }}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeleteActivity(a.id)}
            icon={<Trash2 size={16} />}
            style={{ padding: "4px 8px" }}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  const headerExtra = (
    <div style={{ display: "flex", gap: 8 }}>
      <Button onClick={handleCreateActivity} icon={<Plus size={18} />} size="sm">
        Nueva actividad
      </Button>
    </div>
  );

  return (
    <>
      <TableCard<Activity>
        title="Lista de actividades"
        loading={loading}
        data={activities}
        columns={columns}
        rowKey={(a) => a.id}
        emptyText="No hay actividades aún"
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
              setPage(1);
            }}
            disabled={loading}
          />
        }
      />

      {/* Modal para crear/editar actividad */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => !formLoading && setShowActivityModal(false)}
        title={editingActivity ? "Editar Actividad" : "Nueva Actividad"}
        size="md"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
      >
        <form onSubmit={handleSubmitActivity}>
          <FormCombobox
            label="Tipo de Actividad"
            value={formData.activityTypeId}
            onChange={(value) => setFormData({ ...formData, activityTypeId: String(value) })}
            options={activityTypes}
            required
            fullWidth
            disabled={formLoading}
            placeholder="Seleccionar tipo"
            searchPlaceholder="Buscar tipo de actividad..."
          />

          <FormInput
            label="Título"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            fullWidth
            disabled={formLoading}
          />

          <FormInput
            label="Tamaño del Grupo"
            type="number"
            value={formData.partySizeInput}
            onChange={(e) =>
              setFormData({
                ...formData,
                partySizeInput: e.target.value === "" ? "" : e.target.value,
              })
            }
            min={1}
            required
            fullWidth
            disabled={formLoading}
          />

          <FormInput
            label="Precio Adulto"
            type="number"
            step="0.01"
            min={0.01}
            value={formData.adultPriceInput}
            onChange={(e) =>
              setFormData({
                ...formData,
                adultPriceInput: e.target.value === "" ? "" : e.target.value,
              })
            }
            required
            fullWidth
            disabled={formLoading}
            placeholder="Ej: 50.00"
          />

          <FormInput
            label="Precio Niño"
            type="number"
            step="0.01"
            min={0.01}
            value={formData.childPriceInput}
            onChange={(e) =>
              setFormData({
                ...formData,
                childPriceInput: e.target.value === "" ? "" : e.target.value,
              })
            }
            required
            fullWidth
            disabled={formLoading}
            placeholder="Ej: 25.00"
          />

          <FormInput
            label="Precio Adulto Mayor"
            type="number"
            step="0.01"
            min={0.01}
            value={formData.seniorPriceInput}
            onChange={(e) =>
              setFormData({
                ...formData,
                seniorPriceInput: e.target.value === "" ? "" : e.target.value,
              })
            }
            required
            fullWidth
            disabled={formLoading}
            placeholder="Ej: 40.00"
          />

          <FormCheckbox
            label="Activa"
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
              onClick={() => setShowActivityModal(false)}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={formLoading}>
              {editingActivity ? "Guardar Cambios" : "Crear Actividad"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}

