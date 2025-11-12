import { useEffect, useMemo, useState } from "react";
import { TableCard, type Column } from "@/components/ui/TableCard";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormInput } from "@/components/form/FormInput";
import { type SelectOption } from "@/components/form/FormSelect";
import { FormCombobox } from "@/components/form/FormCombobox";
import { useToastContext } from "@/contexts/ToastContext";
import { useConfirm } from "@/hooks/useConfirm";
import {
  listActivities,
  getActivitiesByDate,
  getActivityById as getScheduledActivityById,
  createActivity as createScheduledActivity,
  updateActivity as updateScheduledActivity,
  deleteActivity as deleteScheduledActivity,
} from "@/services/activitiesService";
import { getActivityTypes } from "@/services/activityTypeService";
import type {
  ActivityByDate,
  ActivityCreateRequest,
  ActivityListItem,
  ActivityUpdateRequest,
} from "@/types/entities";
import { Plus, Edit, Trash2, X } from "lucide-react";
import type { AxiosError } from "axios";

type ActivityRow = ActivityListItem;

type ActivityFormState = {
  activityTypeId: string;
  title: string;
  partySize: number;
};

const DEFAULT_FORM_STATE: ActivityFormState = {
  activityTypeId: "",
  title: "",
  partySize: 1,
};


function mapByDateToRow(item: ActivityByDate): ActivityRow {
  return {
    id: item.id,
    activityTypeId: item.activityTypeId,
    activityTypeName: item.activityTypeName,
    title: item.title,
    partySize: item.partySize,
    start: item.start,
    end: item.end,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

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

export default function ActivitiesPage() {
  const toast = useToastContext();
  const { confirm, ConfirmDialogComponent } = useConfirm();

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [dateFilter, setDateFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<ActivityFormState>(DEFAULT_FORM_STATE);
  const [formLoading, setFormLoading] = useState(false);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(null);

  const [activityTypes, setActivityTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);


  const activityTypeOptions: SelectOption[] = useMemo(
    () =>
      Array.isArray(activityTypes)
        ? activityTypes.map((type) => ({
            value: type.id,
            label: type.name || "",
          }))
        : [],
    [activityTypes]
  );

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, dateFilter]);

  async function loadCatalogs() {
    try {
      setCatalogsLoading(true);
      const types = await getActivityTypes();
      // Asegurar que siempre sean arrays
      setActivityTypes(Array.isArray(types) ? types.map(t => ({ id: t.id, name: t.name })) : []);
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
      toast.error(getErrorMessage(err));
      // En caso de error, establecer arrays vacíos
      setActivityTypes([]);
    } finally {
      setCatalogsLoading(false);
    }
  }

  async function loadActivities() {
    try {
      setLoading(true);
      setError("");

      if (dateFilter) {
        const data = await getActivitiesByDate(dateFilter);
        const rows = data.map(mapByDateToRow);
        setActivities(rows);
        setTotal(rows.length);
        setTotalPages(rows.length > 0 ? 1 : 0);
        setPage(1);
      } else {
        const response = await listActivities(page, pageSize);
        setActivities(response.items);
        setTotalPages(response.totalPages);
        setTotal(response.total);
      }
    } catch (err: any) {
      console.error("Error al cargar actividades:", err);
      setError(getErrorMessage(err));
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function resetFormState() {
    setFormState({
      ...DEFAULT_FORM_STATE,
      activityTypeId: activityTypeOptions.length === 1 ? String(activityTypeOptions[0].value) : "",
    });
    setCurrentActivityId(null);
  }

  function handleCreateClick() {
    setIsEditing(false);
    resetFormState();
    setModalOpen(true);
  }

  async function handleEditClick(id: string) {
    setIsEditing(true);
    setModalOpen(true);
    setFormLoading(true);

    try {
      const data = await getScheduledActivityById(id);
      setCurrentActivityId(id);
      setFormState({
        activityTypeId: data.activityTypeId,
        title: data.title,
        partySize: data.partySize,
      });
    } catch (err) {
      console.error("Error al obtener actividad:", err);
      toast.error(getErrorMessage(err));
      setModalOpen(false);
    } finally {
      setFormLoading(false);
    }
  }

  function handleCloseModal() {
    if (formLoading) return;
    setModalOpen(false);
    resetFormState();
    setIsEditing(false);
  }

  async function handleDeleteClick(id: string, title: string) {
    const confirmed = await confirm({
      title: "Eliminar Actividad",
      message: `¿Seguro que deseas eliminar la actividad "${title}"? Esta acción no se puede deshacer.`,
      variant: "danger",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) return;

    try {
      await deleteScheduledActivity(id);
      toast.success("Actividad eliminada correctamente");

      if (!dateFilter && activities.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadActivities();
      }
    } catch (err) {
      console.error("Error al eliminar actividad:", err);
      toast.error(getErrorMessage(err));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formState.activityTypeId) {
      toast.error("Debes seleccionar el tipo de actividad");
      return;
    }

    if (!formState.title.trim()) {
      toast.error("El título es requerido");
      return;
    }

    if (!Number.isFinite(formState.partySize) || formState.partySize < 1) {
      toast.error("La cantidad de personas debe ser mayor a 0");
      return;
    }

    setFormLoading(true);

    try {
      if (isEditing && currentActivityId) {
        const updatePayload: ActivityUpdateRequest = {
          activityTypeId: formState.activityTypeId,
          title: formState.title.trim(),
          partySize: formState.partySize,
        };

        await updateScheduledActivity(currentActivityId, updatePayload);
        toast.success("Actividad actualizada correctamente");
      } else {
        const createPayload: ActivityCreateRequest = {
          activityTypeId: formState.activityTypeId,
          title: formState.title.trim(),
          partySize: formState.partySize,
        };

        await createScheduledActivity(createPayload);
        toast.success("Actividad creada correctamente");
      }

      setModalOpen(false);
      resetFormState();
      await loadActivities();
    } catch (err) {
      console.error("Error al guardar actividad:", err);
      toast.error(getErrorMessage(err));
    } finally {
      setFormLoading(false);
    }
  }

  const columns: Column<ActivityRow>[] = [
    {
      key: "title",
      header: "Actividad",
      render: (row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontWeight: 600 }}>{row.title}</span>
          <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>{row.activityTypeName ?? "Sin tipo"}</span>
        </div>
      ),
    },
    {
      key: "partySize",
      header: "Personas",
      width: "120px",
      align: "center",
      accessor: (row) => row.partySize,
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
            onClick={() => handleEditClick(row.id)}
            icon={<Edit size={16} />}
            style={{ padding: "4px 8px" }}
          />
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeleteClick(row.id, row.title)}
            icon={<Trash2 size={16} />}
            style={{ padding: "4px 8px" }}
          />
        </div>
      ),
    },
  ];

  const headerExtra = (
    <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <FormInput
          type="date"
          label="Filtrar por fecha"
          value={dateFilter}
          onChange={(event) => {
            setDateFilter(event.target.value);
            setPage(1);
          }}
          size="sm"
        />
        {dateFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateFilter("")}
            icon={<X size={14} />}
          >
            Limpiar
          </Button>
        )}
      </div>
      <Button onClick={handleCreateClick} icon={<Plus size={18} />} size="sm">
        Nueva actividad
      </Button>
    </div>
  );

  return (
    <>
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}
      <TableCard<ActivityRow>
        title="Actividades programadas"
        loading={loading}
        data={activities}
        columns={columns}
        rowKey={(row) => row.id}
        emptyText={dateFilter ? "No hay actividades para la fecha seleccionada" : "No hay actividades aún"}
        headerExtra={headerExtra}
        footer={
          !dateFilter ? (
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
          ) : undefined
        }
      />

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={isEditing ? "Editar actividad" : "Crear actividad"}
        size="md"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
      >
        {formLoading ? (
          <div style={{ padding: "32px", textAlign: "center" }}>
            <div className="spinner-border spinner-border-sm me-2" />
            Cargando información…
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: "16px" }}>
              <FormCombobox
                label="Tipo de actividad"
                value={formState.activityTypeId}
                onChange={(value) => setFormState((prev) => ({ ...prev, activityTypeId: String(value) }))}
                options={activityTypeOptions}
                placeholder={catalogsLoading ? "Cargando…" : "Selecciona un tipo"}
                searchPlaceholder="Buscar tipo de actividad..."
                required
                fullWidth
                disabled={catalogsLoading || activityTypeOptions.length === 0}
              />

              <FormInput
                label="Título"
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                required
                fullWidth
                placeholder="Ej: Tour al volcán Arenal"
                disabled={formLoading}
              />

              <FormInput
                label="Personas"
                type="number"
                min={1}
                value={formState.partySize}
                onChange={(event) => {
                  const value = event.target.value ? parseInt(event.target.value, 10) : 1;
                  setFormState((prev) => ({ ...prev, partySize: Number.isNaN(value) ? 1 : value }));
                }}
                required
                disabled={formLoading}
                fullWidth
              />
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
                onClick={handleCloseModal}
                disabled={formLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={formLoading}>
                {isEditing ? "Guardar cambios" : "Crear actividad"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}


