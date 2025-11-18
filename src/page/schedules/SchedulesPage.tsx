import { useEffect, useState, useMemo } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import {
  getSchedulesByActivityId,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleScheduleStatus,
} from "@/services/schedulesService";
import { fetchActivitiesWithPagination } from "@/services/activityService";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/form/FormInput";
import { FormCombobox, type SelectOption } from "@/components/form/FormCombobox";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import { useConfirm } from "@/hooks/useConfirm";
import { useToastContext } from "@/contexts/ToastContext";
import { Edit, Trash2, Plus } from "lucide-react";
import type { ActivitySchedule, ActivityScheduleFormData, Activity } from "@/types/entities";
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

type ScheduleRow = ActivitySchedule & {
  activityName?: string;
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ActivitySchedule | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const toast = useToastContext();

  // Estado de paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Estado para actividades (para el combo)
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const [formData, setFormData] = useState<ActivityScheduleFormData>({
    scheduledStart: "",
    scheduledEnd: "",
    status: true,
  });

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  const activityOptions: SelectOption[] = useMemo(
    () =>
      activities.map((activity) => ({
        value: activity.id,
        label: activity.title || activity.activityTypeName || "Sin título",
      })),
    [activities]
  );

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    if (selectedActivityId) {
      loadSchedules();
    } else {
      setSchedules([]);
      setTotal(0);
      setTotalPages(0);
    }
  }, [selectedActivityId, page, pageSize]);

  const loadActivities = async () => {
    try {
      setActivitiesLoading(true);
      const response = await fetchActivitiesWithPagination(1, 100, null);
      setActivities(response.items);
    } catch (error) {
      console.error("Error al cargar actividades:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadSchedules = async () => {
    if (!selectedActivityId) return;

    try {
      setLoading(true);
      const allSchedules = await getSchedulesByActivityId(selectedActivityId);
      
      // Aplicar paginación manualmente
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedSchedules = allSchedules.slice(startIndex, endIndex);
      
      // Enriquecer con nombre de actividad
      const enrichedSchedules: ScheduleRow[] = paginatedSchedules.map((schedule) => {
        const activity = activities.find((a) => a.id === schedule.activityId);
        return {
          ...schedule,
          activityName: activity?.title || activity?.activityTypeName || "Sin título",
        };
      });

      setSchedules(enrichedSchedules);
      setTotal(allSchedules.length);
      setTotalPages(Math.ceil(allSchedules.length / pageSize));
    } catch (error) {
      console.error("Error al cargar planeaciones:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = () => {
    if (!selectedActivityId) {
      toast.error("Debes seleccionar una actividad primero");
      return;
    }
    setEditingSchedule(null);
    setFormData({
      scheduledStart: "",
      scheduledEnd: "",
      status: true,
    });
    setShowScheduleModal(true);
  };

  const handleEditSchedule = (schedule: ActivitySchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      scheduledStart: schedule.scheduledStart
        ? new Date(schedule.scheduledStart).toISOString().slice(0, 16)
        : "",
      scheduledEnd: schedule.scheduledEnd
        ? new Date(schedule.scheduledEnd).toISOString().slice(0, 16)
        : "",
      status: schedule.status,
    });
    setShowScheduleModal(true);
  };

  const handleDeleteSchedule = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar Planeación",
      message: "¿Estás seguro de que deseas eliminar esta planeación? Esta acción no se puede deshacer.",
      variant: "danger",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (confirmed) {
      try {
        await deleteSchedule(id);
        toast.success("Planeación eliminada correctamente");
        await loadSchedules();
      } catch (error) {
        console.error("Error al eliminar planeación:", error);
        toast.error(getErrorMessage(error));
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleScheduleStatus(id, !currentStatus);
      toast.success(`Planeación ${!currentStatus ? "activada" : "desactivada"} correctamente`);
      await loadSchedules();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedActivityId) {
      toast.error("Debes seleccionar una actividad");
      return;
    }

    if (!formData.scheduledStart || !formData.scheduledEnd) {
      toast.error("Las fechas de inicio y fin son requeridas");
      return;
    }

    const startIso = new Date(formData.scheduledStart).toISOString();
    const endIso = new Date(formData.scheduledEnd).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      toast.error("La fecha de fin debe ser posterior a la de inicio");
      return;
    }

    try {
      setFormLoading(true);

      const payload: ActivityScheduleFormData = {
        scheduledStart: startIso,
        scheduledEnd: endIso,
        status: formData.status ?? true,
      };

      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, payload);
        toast.success("Planeación actualizada correctamente");
      } else {
        await createSchedule(selectedActivityId, payload);
        toast.success("Planeación creada correctamente");
      }

      setShowScheduleModal(false);
      await loadSchedules();
    } catch (error) {
      console.error("Error al guardar planeación:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const columns: Column<ScheduleRow>[] = [
    {
      key: "activityName",
      header: "Actividad",
      accessor: (row) => row.activityName || "-",
    },
    {
      key: "scheduledStart",
      header: "Fecha/Hora Inicio",
      width: "200px",
      render: (row) => (
        <span>
          {row.scheduledStart
            ? dateTimeFormatter.format(new Date(row.scheduledStart))
            : "-"}
        </span>
      ),
    },
    {
      key: "scheduledEnd",
      header: "Fecha/Hora Fin",
      width: "200px",
      render: (row) => (
        <span>
          {row.scheduledEnd
            ? dateTimeFormatter.format(new Date(row.scheduledEnd))
            : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      width: "120px",
      align: "center",
      render: (row) => (
        <span
          style={{
            ...badgeStyles.base,
            ...(row.status ? badgeStyles.success : badgeStyles.danger),
            cursor: "pointer",
          }}
          onClick={() => handleToggleStatus(row.id, row.status)}
          title="Click para cambiar estado"
        >
          {row.status ? "Activa" : "Inactiva"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      width: "160px",
      align: "center",
      render: (row) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditSchedule(row)}
            icon={<Edit size={16} />}
            style={{ padding: "4px 8px" }}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeleteSchedule(row.id)}
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
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ minWidth: "250px", flex: 1 }}>
        <FormCombobox
          label="Filtrar por Actividad"
          value={selectedActivityId}
          onChange={(value) => {
            setSelectedActivityId(String(value));
            setPage(1);
          }}
          options={activityOptions}
          placeholder={activitiesLoading ? "Cargando..." : "Selecciona una actividad"}
          searchPlaceholder="Buscar actividad..."
          fullWidth
          disabled={activitiesLoading}
        />
      </div>
      {selectedActivityId && (
        <Button onClick={handleCreateSchedule} icon={<Plus size={18} />} size="sm">
          Nueva planeación
        </Button>
      )}
    </div>
  );

  return (
    <>
      <TableCard<ScheduleRow>
        title="Planeaciones de Actividades"
        loading={loading}
        data={schedules}
        columns={columns}
        rowKey={(row) => row.id}
        emptyText={
          selectedActivityId
            ? "No hay planeaciones para esta actividad"
            : "Selecciona una actividad para ver sus planeaciones"
        }
        headerExtra={headerExtra}
        footer={
          selectedActivityId && total > 0 ? (
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
          ) : undefined
        }
      />

      {/* Modal para crear/editar planeación */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => !formLoading && setShowScheduleModal(false)}
        title={editingSchedule ? "Editar Planeación" : "Nueva Planeación"}
        size="md"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
      >
        <form onSubmit={handleSubmitSchedule}>
          <FormInput
            label="Fecha y Hora de Inicio"
            type="datetime-local"
            value={formData.scheduledStart}
            onChange={(e) =>
              setFormData({
                ...formData,
                scheduledStart: e.target.value,
              })
            }
            required
            fullWidth
            disabled={formLoading}
          />

          <FormInput
            label="Fecha y Hora de Fin"
            type="datetime-local"
            value={formData.scheduledEnd}
            onChange={(e) =>
              setFormData({
                ...formData,
                scheduledEnd: e.target.value,
              })
            }
            required
            fullWidth
            disabled={formLoading}
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
              onClick={() => setShowScheduleModal(false)}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={formLoading}>
              {editingSchedule ? "Guardar Cambios" : "Crear Planeación"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}

