import { useEffect, useState, useMemo } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import {
  getSchedulesByActivityId,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleScheduleStatus,
  bulkCreateSchedules,
  addAttendeesToSchedule,
  getScheduleAvailability,
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
import { Edit, Trash2, Plus, Calendar, Users, X } from "lucide-react";
import type {
  ActivitySchedule,
  ActivityScheduleFormData,
  Activity,
  BulkScheduleRequest,
  TimeSlot,
  ScheduleAvailabilityFilters,
} from "@/types/entities";
import type { AxiosError } from "axios";

/**
 * Función helper para extraer el mensaje de error del formato del API
 */
function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string; title?: string; conflicts?: any[] }>;

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
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAddAttendeesModal, setShowAddAttendeesModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ActivitySchedule | null>(null);
  const [selectedScheduleForAttendees, setSelectedScheduleForAttendees] = useState<ActivitySchedule | null>(null);
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

  // Filtros de disponibilidad
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [useAvailabilityFilter, setUseAvailabilityFilter] = useState(false);

  // Estado para inserción masiva
  const [bulkFormData, setBulkFormData] = useState<{
    activityId: string;
    startDate: string;
    endDate: string;
    timeSlots: TimeSlot[];
  }>({
    activityId: "",
    startDate: "",
    endDate: "",
    timeSlots: [{ startTime: "", endTime: "", capacity: 0 }],
  });

  // Estado para sumar asistentes
  const [attendeesQuantity, setAttendeesQuantity] = useState<number>(1);

  const [formData, setFormData] = useState<ActivityScheduleFormData>({
    scheduledStart: "",
    scheduledEnd: "",
    status: true,
    capacity: 0,
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
      activities
        .filter((a) => a.status)
        .map((activity) => ({
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
      if (useAvailabilityFilter && (filterStartDate || filterEndDate)) {
        loadAvailability();
      } else {
        loadSchedules();
      }
    } else {
      setSchedules([]);
      setTotal(0);
      setTotalPages(0);
    }
  }, [selectedActivityId, page, pageSize, useAvailabilityFilter, filterStartDate, filterEndDate]);

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

  const loadAvailability = async () => {
    if (!selectedActivityId) return;

    try {
      setLoading(true);
      const filters: ScheduleAvailabilityFilters = {
        activityId: selectedActivityId,
      };
      if (filterStartDate) filters.startDate = filterStartDate;
      if (filterEndDate) filters.endDate = filterEndDate;

      const availability = await getScheduleAvailability(filters);

      // Aplicar paginación manualmente
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedSchedules = availability.slice(startIndex, endIndex);

      // Enriquecer con nombre de actividad
      const enrichedSchedules: ScheduleRow[] = paginatedSchedules.map((schedule) => {
        const activity = activities.find((a) => a.id === schedule.activityId);
        return {
          ...schedule,
          activityName: activity?.title || activity?.activityTypeName || "Sin título",
        };
      });

      setSchedules(enrichedSchedules);
      setTotal(availability.length);
      setTotalPages(Math.ceil(availability.length / pageSize));
    } catch (error) {
      console.error("Error al cargar disponibilidad:", error);
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
      capacity: 0,
    });
    setShowScheduleModal(true);
  };

  const handleBulkCreate = () => {
    if (!selectedActivityId) {
      toast.error("Debes seleccionar una actividad primero");
      return;
    }
    setBulkFormData({
      activityId: selectedActivityId,
      startDate: "",
      endDate: "",
      timeSlots: [{ startTime: "", endTime: "", capacity: 0 }],
    });
    setShowBulkModal(true);
  };

  const handleAddTimeSlot = () => {
    setBulkFormData({
      ...bulkFormData,
      timeSlots: [...bulkFormData.timeSlots, { startTime: "", endTime: "", capacity: 0 }],
    });
  };

  const handleRemoveTimeSlot = (index: number) => {
    if (bulkFormData.timeSlots.length > 1) {
      setBulkFormData({
        ...bulkFormData,
        timeSlots: bulkFormData.timeSlots.filter((_, i) => i !== index),
      });
    }
  };

  const handleTimeSlotChange = (index: number, field: keyof TimeSlot, value: string | number) => {
    const newTimeSlots = [...bulkFormData.timeSlots];
    newTimeSlots[index] = { ...newTimeSlots[index], [field]: value };
    setBulkFormData({ ...bulkFormData, timeSlots: newTimeSlots });
  };

  const handleSubmitBulk = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bulkFormData.activityId || !bulkFormData.startDate || !bulkFormData.endDate) {
      toast.error("Actividad, fecha de inicio y fecha de fin son requeridos");
      return;
    }

    if (bulkFormData.timeSlots.length === 0) {
      toast.error("Debes agregar al menos un horario");
      return;
    }

    // Validar que todos los timeSlots tengan datos
    for (const slot of bulkFormData.timeSlots) {
      if (!slot.startTime || !slot.endTime || slot.capacity <= 0) {
        toast.error("Todos los horarios deben tener hora de inicio, fin y capacidad mayor a 0");
        return;
      }
    }

    // Validar formato de fechas
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(bulkFormData.startDate) || !dateRegex.test(bulkFormData.endDate)) {
      toast.error("El formato de fecha debe ser YYYY-MM-DD");
      return;
    }

    if (new Date(bulkFormData.endDate) < new Date(bulkFormData.startDate)) {
      toast.error("La fecha de fin debe ser posterior a la de inicio");
      return;
    }

    try {
      setFormLoading(true);
      const request: BulkScheduleRequest = {
        activityId: bulkFormData.activityId,
        startDate: bulkFormData.startDate,
        endDate: bulkFormData.endDate,
        timeSlots: bulkFormData.timeSlots,
        validateOverlaps: true,
      };

      const result = await bulkCreateSchedules(request);
      
      if (result.conflicts && result.conflicts.length > 0) {
        const conflictsMsg = result.conflicts
          .map((c) => `${c.date} ${c.timeSlot.startTime}-${c.timeSlot.endTime}: ${c.reason}`)
          .join("\n");
        toast.error(`Se encontraron conflictos:\n${conflictsMsg}`);
      } else {
        toast.success(`${result.created} horarios creados exitosamente`);
        setShowBulkModal(false);
        await loadSchedules();
      }
    } catch (error) {
      console.error("Error al crear horarios masivamente:", error);
      const axiosError = error as AxiosError<{ conflicts?: any[] }>;
      if (axiosError.response?.status === 409 && axiosError.response?.data?.conflicts) {
        const conflicts = axiosError.response.data.conflicts;
        const conflictsMsg = conflicts
          .map((c: any) => `${c.date || ''} ${c.timeSlot?.startTime || ''}-${c.timeSlot?.endTime || ''}: ${c.reason || 'Conflicto'}`)
          .join("\n");
        toast.error(`Se encontraron conflictos:\n${conflictsMsg}`);
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddAttendees = (schedule: ActivitySchedule) => {
    setSelectedScheduleForAttendees(schedule);
    setAttendeesQuantity(1);
    setShowAddAttendeesModal(true);
  };

  const handleSubmitAddAttendees = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedScheduleForAttendees) return;

    if (attendeesQuantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    try {
      setFormLoading(true);
      await addAttendeesToSchedule(selectedScheduleForAttendees.id, attendeesQuantity);
      toast.success(`${attendeesQuantity} asistentes agregados correctamente`);
      setShowAddAttendeesModal(false);
      await loadSchedules();
    } catch (error) {
      console.error("Error al agregar asistentes:", error);
      const axiosError = error as AxiosError<{ code?: string; message?: string }>;
      if (axiosError.response?.data?.code === 'CAPACITY_EXCEEDED') {
        toast.error("La capacidad del horario ha sido excedida");
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setFormLoading(false);
    }
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
      capacity: schedule.capacity || 0,
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

    if (formData.capacity === undefined || formData.capacity < 0) {
      toast.error("La capacidad debe ser mayor o igual a 0");
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
        capacity: formData.capacity ?? 0,
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
      key: "capacity",
      header: "Capacidad",
      width: "100px",
      align: "center",
      render: (row) => <span>{row.capacity ?? 0}</span>,
    },
    {
      key: "bookedCount",
      header: "Reservados",
      width: "100px",
      align: "center",
      render: (row) => <span>{row.bookedCount ?? 0}</span>,
    },
    {
      key: "availableSpaces",
      header: "Disponibles",
      width: "120px",
      align: "center",
      render: (row) => {
        const available = row.availableSpaces ?? (row.capacity ?? 0) - (row.bookedCount ?? 0);
        return (
          <span
            style={{
              ...badgeStyles.base,
              ...(available > 0 ? badgeStyles.success : badgeStyles.danger),
            }}
          >
            {available}
          </span>
        );
      },
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
      width: "220px",
      align: "center",
      render: (row) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddAttendees(row)}
            icon={<Users size={16} />}
            style={{ padding: "4px 8px" }}
            title="Agregar asistentes"
          >
            +Asistentes
          </Button>
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
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
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
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <FormCheckbox
              label="Filtrar por fecha"
              checked={useAvailabilityFilter}
              onChange={(e) => {
                setUseAvailabilityFilter(e.target.checked);
                if (!e.target.checked) {
                  setFilterStartDate("");
                  setFilterEndDate("");
                }
              }}
            />
          </div>
          {useAvailabilityFilter && (
            <>
              <FormInput
                label="Fecha Inicio"
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setPage(1);
                }}
                style={{ width: "150px" }}
              />
              <FormInput
                label="Fecha Fin"
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setPage(1);
                }}
                style={{ width: "150px" }}
              />
            </>
          )}
          <Button onClick={handleBulkCreate} icon={<Calendar size={18} />} size="sm" variant="primary">
            Inserción Masiva
          </Button>
          <Button onClick={handleCreateSchedule} icon={<Plus size={18} />} size="sm">
            Nueva planeación
          </Button>
        </>
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

      {/* Modal para crear/editar planeación individual */}
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

          <FormInput
            label="Capacidad"
            type="number"
            value={formData.capacity ?? 0}
            onChange={(e) =>
              setFormData({
                ...formData,
                capacity: parseInt(e.target.value, 10) || 0,
              })
            }
            required
            fullWidth
            disabled={formLoading}
            min={0}
            helperText="Cantidad máxima de personas para este horario"
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

      {/* Modal para inserción masiva */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => !formLoading && setShowBulkModal(false)}
        title="Inserción Masiva de Horarios"
        size="lg"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
      >
        <form onSubmit={handleSubmitBulk}>
          <FormInput
            label="Fecha de Inicio"
            type="date"
            value={bulkFormData.startDate}
            onChange={(e) =>
              setBulkFormData({
                ...bulkFormData,
                startDate: e.target.value,
              })
            }
            required
            fullWidth
            disabled={formLoading}
            helperText="Formato: YYYY-MM-DD"
          />

          <FormInput
            label="Fecha de Fin"
            type="date"
            value={bulkFormData.endDate}
            onChange={(e) =>
              setBulkFormData({
                ...bulkFormData,
                endDate: e.target.value,
              })
            }
            required
            fullWidth
            disabled={formLoading}
            helperText="Formato: YYYY-MM-DD"
          />

          <div style={{ marginTop: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <label style={{ fontWeight: 500, fontSize: "14px" }}>Horarios (se aplicarán a todos los días del rango)</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTimeSlot}
                disabled={formLoading}
              >
                <Plus size={16} /> Agregar Horario
              </Button>
            </div>

            {bulkFormData.timeSlots.map((slot, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 120px auto",
                  gap: "12px",
                  alignItems: "flex-end",
                  marginBottom: "12px",
                  padding: "12px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                }}
              >
                <FormInput
                  label="Hora Inicio"
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => handleTimeSlotChange(index, "startTime", e.target.value)}
                  required
                  disabled={formLoading}
                />
                <FormInput
                  label="Hora Fin"
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => handleTimeSlotChange(index, "endTime", e.target.value)}
                  required
                  disabled={formLoading}
                />
                <FormInput
                  label="Capacidad"
                  type="number"
                  value={slot.capacity}
                  onChange={(e) => handleTimeSlotChange(index, "capacity", parseInt(e.target.value, 10) || 0)}
                  required
                  disabled={formLoading}
                  min={1}
                />
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveTimeSlot(index)}
                  disabled={formLoading || bulkFormData.timeSlots.length === 1}
                  icon={<X size={16} />}
                  style={{ marginBottom: "0" }}
                >
                  Eliminar
                </Button>
              </div>
            ))}
          </div>

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
              onClick={() => setShowBulkModal(false)}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={formLoading}>
              Crear Horarios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal para agregar asistentes */}
      <Modal
        isOpen={showAddAttendeesModal}
        onClose={() => !formLoading && setShowAddAttendeesModal(false)}
        title="Agregar Asistentes"
        size="md"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
      >
        {selectedScheduleForAttendees && (
          <form onSubmit={handleSubmitAddAttendees}>
            <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
              <div style={{ fontSize: "14px", color: "#666" }}>
                <strong>Horario:</strong> {dateTimeFormatter.format(new Date(selectedScheduleForAttendees.scheduledStart))} - {dateTimeFormatter.format(new Date(selectedScheduleForAttendees.scheduledEnd))}
              </div>
              <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                <strong>Capacidad:</strong> {selectedScheduleForAttendees.capacity ?? 0} | <strong>Reservados:</strong> {selectedScheduleForAttendees.bookedCount ?? 0} | <strong>Disponibles:</strong> {(selectedScheduleForAttendees.capacity ?? 0) - (selectedScheduleForAttendees.bookedCount ?? 0)}
              </div>
            </div>

            <FormInput
              label="Cantidad de Asistentes"
              type="number"
              value={attendeesQuantity}
              onChange={(e) => setAttendeesQuantity(parseInt(e.target.value, 10) || 1)}
              required
              fullWidth
              disabled={formLoading}
              min={1}
              helperText="Cantidad de personas a agregar a este horario"
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
                onClick={() => setShowAddAttendeesModal(false)}
                disabled={formLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={formLoading}>
                Agregar Asistentes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}
