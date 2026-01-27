import { useEffect, useMemo, useState } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormInput } from "@/components/form/FormInput";
import { type SelectOption } from "@/components/form/FormSelect";
import { FormCombobox } from "@/components/form/FormCombobox";
import { FormCheckbox } from "@/components/form/FormCheckbox";
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
  partySizeInput: string | number;
  adultPriceInput: string | number;
  childPriceInput: string | number;
  seniorPriceInput: string | number;
  status: boolean;
};

const DEFAULT_FORM_STATE: ActivityFormState = {
  activityTypeId: "",
  title: "",
  partySize: 1,
  partySizeInput: "",
  adultPriceInput: "",
  childPriceInput: "",
  seniorPriceInput: "",
  status: true,
};


function mapByDateToRow(item: ActivityByDate): ActivityRow {
  return {
    id: item.id,
    activityTypeId: item.activityTypeId,
    activityTypeName: item.activityTypeName,
    title: item.title,
    partySize: item.partySize,
    adultPrice: item.adultPrice ?? 0,
    childPrice: item.childPrice ?? 0,
    seniorPrice: item.seniorPrice ?? 0,
    status: item.status,
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
        partySizeInput: data.partySize,
        adultPriceInput: data.adultPrice ?? "",
        childPriceInput: data.childPrice ?? "",
        seniorPriceInput: data.seniorPrice ?? "",
        status: data.status ?? true,
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

    // Validar partySize: debe tener un valor y ser mayor que 0
    const partySizeValue = typeof formState.partySizeInput === 'string' 
      ? (formState.partySizeInput.trim() === '' ? null : parseInt(formState.partySizeInput.trim(), 10))
      : formState.partySizeInput;

    if (partySizeValue === null || isNaN(partySizeValue) || partySizeValue < 1) {
      toast.error("La cantidad de personas es requerida y debe ser mayor a 0");
      return;
    }

    const parsePrice = (v: string | number): number | null => {
      if (typeof v === "string") {
        const s = v.trim();
        if (s === "") return null;
        const n = parseFloat(s);
        return Number.isNaN(n) ? null : n;
      }
      return v;
    };

    const adultPriceVal = parsePrice(formState.adultPriceInput);
    if (adultPriceVal === null || adultPriceVal <= 0) {
      toast.error("Precio adulto es requerido y debe ser mayor a 0");
      return;
    }

    const childPriceVal = parsePrice(formState.childPriceInput);
    if (childPriceVal === null || childPriceVal <= 0) {
      toast.error("Precio niño es requerido y debe ser mayor a 0");
      return;
    }

    const seniorPriceVal = parsePrice(formState.seniorPriceInput);
    if (seniorPriceVal === null || seniorPriceVal <= 0) {
      toast.error("Precio adulto mayor es requerido y debe ser mayor a 0");
      return;
    }

    setFormLoading(true);

    try {
      if (isEditing && currentActivityId) {
        const updatePayload: ActivityUpdateRequest = {
          activityTypeId: formState.activityTypeId,
          title: formState.title.trim(),
          partySize: partySizeValue,
          adultPrice: adultPriceVal,
          childPrice: childPriceVal,
          seniorPrice: seniorPriceVal,
          status: formState.status,
        };

        await updateScheduledActivity(currentActivityId, updatePayload);
        toast.success("Actividad actualizada correctamente");
      } else {
        const createPayload: ActivityCreateRequest = {
          activityTypeId: formState.activityTypeId,
          title: formState.title.trim(),
          partySize: partySizeValue,
          adultPrice: adultPriceVal,
          childPrice: childPriceVal,
          seniorPrice: seniorPriceVal,
          status: formState.status,
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

  const formatPrice = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "-");

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
      key: "adultPrice",
      header: "Precio Adulto",
      width: "120px",
      align: "right",
      accessor: (row) => row.adultPrice,
    },
    {
      key: "childPrice",
      header: "Precio Niño",
      width: "120px",
      align: "right",
      accessor: (row) => row.childPrice,
    },
    {
      key: "seniorPrice",
      header: "Precio Adulto Mayor",
      width: "140px",
      align: "right",
      accessor: (row) => row.seniorPrice,
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
          }}
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
                value={formState.partySizeInput}
                onChange={(event) => {
                  setFormState((prev) => ({ 
                    ...prev, 
                    partySizeInput: event.target.value === '' ? '' : event.target.value 
                  }));
                }}
                required
                disabled={formLoading}
                fullWidth
              />

              <FormInput
                label="Precio Adulto"
                type="number"
                step="0.01"
                min={0.01}
                value={formState.adultPriceInput}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    adultPriceInput: e.target.value === "" ? "" : e.target.value,
                  }))
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
                value={formState.childPriceInput}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    childPriceInput: e.target.value === "" ? "" : e.target.value,
                  }))
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
                value={formState.seniorPriceInput}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    seniorPriceInput: e.target.value === "" ? "" : e.target.value,
                  }))
                }
                required
                fullWidth
                disabled={formLoading}
                placeholder="Ej: 40.00"
              />

              <FormCheckbox
                label="Activa"
                checked={formState.status ?? true}
                onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.checked }))}
                disabled={formLoading}
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


