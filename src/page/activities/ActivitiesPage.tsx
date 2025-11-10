import { useEffect, useMemo, useState } from "react";
import { TableCard, type Column } from "@/components/ui/TableCard";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormInput } from "@/components/form/FormInput";
import { FormSelect, type SelectOption } from "@/components/form/FormSelect";
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
  replaceAssignments as replaceActivityAssignments,
} from "@/services/activitiesService";
import { getAllActivities as getActivityTypes } from "@/services/activityService";
import { getAllGuides } from "@/services/guideService";
import type {
  Activity,
  ActivityAssignment,
  ActivityByDate,
  ActivityCreateRequest,
  ActivityListItem,
  ActivityUpdateRequest,
  Guide,
} from "@/types/entities";
import { Plus, Edit, Trash2, X } from "lucide-react";
import type { AxiosError } from "axios";

type ActivityRow = ActivityListItem;

type ActivityAssignmentForm = {
  tempId: string;
  guideId: string;
  isLeader: boolean;
};

type ActivityFormState = {
  activityTypeId: string;
  title: string;
  partySize: number;
  start: string;
  end: string;
  languageIdsText: string;
  autoAssign: boolean;
  assignments: ActivityAssignmentForm[];
};

const DEFAULT_FORM_STATE: ActivityFormState = {
  activityTypeId: "",
  title: "",
  partySize: 1,
  start: formatDateTimeLocal(new Date()),
  end: formatDateTimeLocal(addHours(new Date(), 2)),
  languageIdsText: "",
  autoAssign: true,
  assignments: [],
};

function formatDateTimeLocal(date: Date) {
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function addHours(date: Date, hours: number) {
  const clone = new Date(date);
  clone.setHours(clone.getHours() + hours);
  return clone;
}

function toIsoString(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function createTempId() {
  return Math.random().toString(36).slice(2, 9);
}

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

function sanitizeAssignments(assignments: ActivityAssignmentForm[]): ActivityAssignmentForm[] {
  return assignments
    .filter((a) => a.guideId)
    .map((assignment) => ({
      tempId: assignment.tempId,
      guideId: assignment.guideId,
      isLeader: assignment.isLeader,
    }));
}

function assignmentsAreEqual(a: ActivityAssignmentForm[], b: ActivityAssignmentForm[]) {
  if (a.length !== b.length) return false;
  const sortFn = (x: ActivityAssignmentForm) => `${x.guideId}-${x.isLeader ? "1" : "0"}`;
  const serializedA = [...a].sort((x, y) => sortFn(x).localeCompare(sortFn(y)));
  const serializedB = [...b].sort((x, y) => sortFn(x).localeCompare(sortFn(y)));
  return serializedA.every((item, index) => {
    const other = serializedB[index];
    return item.guideId === other.guideId && item.isLeader === other.isLeader;
  });
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
  const [originalAssignments, setOriginalAssignments] = useState<ActivityAssignmentForm[]>([]);

  const [activityTypes, setActivityTypes] = useState<Activity[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  const activityTypeOptions: SelectOption[] = useMemo(
    () =>
      Array.isArray(activityTypes)
        ? activityTypes.map((type) => ({
            value: type.id,
            label: type.name,
          }))
        : [],
    [activityTypes]
  );

  const guideOptions: SelectOption[] = useMemo(
    () =>
      Array.isArray(guides)
        ? guides.map((guide) => ({
            value: guide.id,
            label: `${guide.name}${guide.isLeader ? " • Líder" : ""}`,
          }))
        : [],
    [guides]
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
      const [types, guidesList] = await Promise.all([getActivityTypes(), getAllGuides()]);
      // Asegurar que siempre sean arrays
      setActivityTypes(Array.isArray(types) ? types : []);
      setGuides(Array.isArray(guidesList) ? guidesList : []);
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
      toast.error(getErrorMessage(err));
      // En caso de error, establecer arrays vacíos
      setActivityTypes([]);
      setGuides([]);
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
    setOriginalAssignments([]);
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
        start: formatDateTimeLocal(new Date(data.start)),
        end: formatDateTimeLocal(new Date(data.end)),
        languageIdsText:
          (data.languages && data.languages.map((lang) => lang.id).join(", ")) ||
          (Array.isArray(data.languageIds) ? data.languageIds.join(", ") : ""),
        autoAssign: false,
        assignments: (data.assignments || []).map((assignment) => ({
          tempId: createTempId(),
          guideId: assignment.guideId,
          isLeader: assignment.isLeader,
        })),
      });
      setOriginalAssignments(
        (data.assignments || []).map((assignment) => ({
          tempId: createTempId(),
          guideId: assignment.guideId,
          isLeader: assignment.isLeader,
        }))
      );
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

  function handleAssignmentChange(index: number, field: "guideId" | "isLeader", value: string | boolean) {
    setFormState((prev) => {
      const nextAssignments = prev.assignments.map((assignment, idx) => {
        if (idx !== index) return assignment;
        if (field === "guideId") {
          return { ...assignment, guideId: String(value) };
        }
        if (value === true) {
          // Solo puede haber un líder
          return { ...assignment, isLeader: true };
        }
        return { ...assignment, isLeader: false };
      });

      if (field === "isLeader" && value === true) {
        return {
          ...prev,
          assignments: nextAssignments.map((assignment, idx) => ({
            ...assignment,
            isLeader: idx === index,
          })),
        };
      }

      return { ...prev, assignments: nextAssignments };
    });
  }

  function handleRemoveAssignment(index: number) {
    setFormState((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((_, idx) => idx !== index),
    }));
  }

  function handleAddAssignment() {
    setFormState((prev) => ({
      ...prev,
      assignments: [
        ...prev.assignments,
        {
          tempId: createTempId(),
          guideId: guideOptions[0]?.value ? String(guideOptions[0].value) : "",
          isLeader: prev.assignments.length === 0,
        },
      ],
    }));
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

    if (!formState.start || !formState.end) {
      toast.error("Debes indicar fecha/hora de inicio y fin");
      return;
    }

    const startIso = toIsoString(formState.start);
    const endIso = toIsoString(formState.end);

    if (!startIso || !endIso) {
      toast.error("Fechas inválidas");
      return;
    }

    if (new Date(endIso) <= new Date(startIso)) {
      toast.error("La fecha de fin debe ser posterior a la de inicio");
      return;
    }

    if (!Number.isFinite(formState.partySize) || formState.partySize < 1) {
      toast.error("La cantidad de personas debe ser mayor a 0");
      return;
    }

    const sanitizedAssignments = sanitizeAssignments(formState.assignments);

    if (!formState.autoAssign && sanitizedAssignments.length === 0 && !isEditing) {
      toast.error("Debes agregar al menos una asignación o activar la asignación automática");
      return;
    }

    const leaders = sanitizedAssignments.filter((assignment) => assignment.isLeader);
    if (leaders.length > 1) {
      toast.error("Solo puede haber un guía líder por actividad");
      return;
    }

    const languageIds = formState.languageIdsText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    setFormLoading(true);

    try {
      if (isEditing && currentActivityId) {
        const updatePayload: ActivityUpdateRequest = {
          activityTypeId: formState.activityTypeId,
          title: formState.title.trim(),
          partySize: formState.partySize,
          start: startIso,
          end: endIso,
          languageIds: languageIds.length > 0 ? languageIds : undefined,
        };

        await updateScheduledActivity(currentActivityId, updatePayload);

        const assignmentsChanged = !assignmentsAreEqual(
          sanitizedAssignments,
          sanitizeAssignments(originalAssignments)
        );

        if (assignmentsChanged) {
          await replaceActivityAssignments(
            currentActivityId,
            sanitizedAssignments.map<ActivityAssignment>((assignment) => ({
              guideId: assignment.guideId,
              isLeader: assignment.isLeader,
            }))
          );
        }

        toast.success("Actividad actualizada correctamente");
      } else {
        const createPayload: ActivityCreateRequest = {
          activityTypeId: formState.activityTypeId,
          title: formState.title.trim(),
          partySize: formState.partySize,
          start: startIso,
          end: endIso,
          languageIds: languageIds.length > 0 ? languageIds : undefined,
          autoAssign: formState.autoAssign,
        };

        if (!formState.autoAssign && sanitizedAssignments.length > 0) {
          createPayload.assignments = sanitizedAssignments.map<ActivityAssignment>((assignment) => ({
            guideId: assignment.guideId,
            isLeader: assignment.isLeader,
          }));
        }

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
      key: "start",
      header: "Inicio",
      width: "200px",
      render: (row) => (
        <span style={{ display: "inline-block", minWidth: "180px" }}>
          {row.start ? dateTimeFormatter.format(new Date(row.start)) : "—"}
        </span>
      ),
    },
    {
      key: "end",
      header: "Fin",
      width: "200px",
      render: (row) => (
        <span style={{ display: "inline-block", minWidth: "180px" }}>
          {row.end ? dateTimeFormatter.format(new Date(row.end)) : "—"}
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
        size="lg"
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
              <FormSelect
                label="Tipo de actividad"
                value={formState.activityTypeId}
                onChange={(event) => setFormState((prev) => ({ ...prev, activityTypeId: event.target.value }))}
                options={activityTypeOptions}
                placeholder={catalogsLoading ? "Cargando…" : "Selecciona un tipo"}
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

              <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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
                />
                <FormInput
                  label="Inicio"
                  type="datetime-local"
                  value={formState.start}
                  onChange={(event) => setFormState((prev) => ({ ...prev, start: event.target.value }))}
                  required
                  disabled={formLoading}
                />
                <FormInput
                  label="Fin"
                  type="datetime-local"
                  value={formState.end}
                  onChange={(event) => setFormState((prev) => ({ ...prev, end: event.target.value }))}
                  required
                  disabled={formLoading}
                />
              </div>

              <FormInput
                label="Idiomas (IDs separados por coma)"
                value={formState.languageIdsText}
                onChange={(event) => setFormState((prev) => ({ ...prev, languageIdsText: event.target.value }))}
                placeholder="Ej: es, en, fr"
                disabled={formLoading}
                fullWidth
              />

              {!isEditing && (
                <FormCheckbox
                  label="Asignación automática de guías"
                  checked={formState.autoAssign}
                  onChange={(event) => setFormState((prev) => ({ ...prev, autoAssign: event.target.checked }))}
                  disabled={formLoading}
                />
              )}

              {(!formState.autoAssign || isEditing) && (
                <div
                  style={{
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: "8px",
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 600 }}>Asignaciones de guías</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddAssignment}
                      disabled={guideOptions.length === 0}
                    >
                      Agregar guía
                    </Button>
                  </div>

                  {formState.assignments.length === 0 ? (
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748b" }}>
                      {guideOptions.length === 0
                        ? "No hay guías disponibles para asignar."
                        : "No hay guías asignados aún."}
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {formState.assignments.map((assignment, index) => (
                        <div
                          key={assignment.tempId}
                          style={{
                            display: "grid",
                            gap: "12px",
                            gridTemplateColumns: "minmax(220px, 1fr) 120px 80px",
                            alignItems: "center",
                          }}
                        >
                          <FormSelect
                            label={index === 0 ? "Guía" : undefined}
                            value={assignment.guideId}
                            onChange={(event) =>
                              handleAssignmentChange(index, "guideId", event.target.value)
                            }
                            options={guideOptions}
                            placeholder="Selecciona un guía"
                            required
                            fullWidth
                          />

                          <FormCheckbox
                            label="Líder"
                            checked={assignment.isLeader}
                            onChange={(event) =>
                              handleAssignmentChange(index, "isLeader", event.target.checked)
                            }
                          />

                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveAssignment(index)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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


