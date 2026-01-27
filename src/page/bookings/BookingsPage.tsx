import { useEffect, useState, useMemo } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import {
  fetchBookingsWithPagination,
  getAvailableSchedulesByActivityId,
  checkAvailability,
  createBooking,
  updateBooking,
  cancelBooking,
  getBookingById,
} from "@/services/bookingsService";
import { fetchActivitiesWithPagination } from "@/services/activityService";
import { fetchCompaniesWithPagination } from "@/services/companiesService";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/form/FormInput";
import { FormCombobox, type SelectOption } from "@/components/form/FormCombobox";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import { useConfirm } from "@/hooks/useConfirm";
import { useToastContext } from "@/contexts/ToastContext";
import { Edit, Trash2, Plus, X } from "lucide-react";
import type {
  Booking,
  BookingFormData,
  BookingStatus,
  Activity,
  Company,
  AvailableSchedule,
  AvailabilityInfo,
} from "@/types/entities";
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

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const toast = useToastContext();

  // Estado de paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | null>(null);

  // Estados para el formulario
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [availableSchedules, setAvailableSchedules] = useState<AvailableSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [selectedSchedule, setSelectedSchedule] = useState<AvailableSchedule | null>(null);
  const [availabilityInfo, setAvailabilityInfo] = useState<AvailabilityInfo | null>(null);

  // Catálogos
  const [activities, setActivities] = useState<Activity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);

  const [formData, setFormData] = useState<
    BookingFormData & {
      numberOfPeopleInput: string | number;
      adultCountInput: string | number;
      childCountInput: string | number;
      seniorCountInput: string | number;
    }
  >({
    activityScheduleId: "",
    companyId: null,
    transport: false,
    numberOfPeople: 1,
    numberOfPeopleInput: "",
    adultCount: 0,
    adultCountInput: "",
    childCount: 0,
    childCountInput: "",
    seniorCount: 0,
    seniorCountInput: "",
    passengerCount: null,
    commissionPercentage: undefined,
    customerName: "",
    customerEmail: null,
    customerPhone: null,
    status: "pending",
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

  const companyOptions: SelectOption[] = useMemo(
    () =>
      companies
        .filter((c) => c.status)
        .map((company) => ({
          value: company.id,
          label: `${company.name} (${company.commissionPercentage}%)`,
        })),
    [companies]
  );

  const scheduleOptions: SelectOption[] = useMemo(
    () =>
      availableSchedules
        .filter((s) => s.status === true) // Mostrar todas las fechas activas
        .map((schedule) => ({
          value: schedule.id,
          label: `${dateTimeFormatter.format(new Date(schedule.scheduledStart))} - ${dateTimeFormatter.format(new Date(schedule.scheduledEnd))} (Disponibles: ${schedule.availableSpaces})`,
        })),
    [availableSchedules, dateTimeFormatter]
  );

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    loadBookings();
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    if (selectedActivityId) {
      loadAvailableSchedules();
    } else {
      setAvailableSchedules([]);
      setSelectedScheduleId("");
      setSelectedSchedule(null);
      setAvailabilityInfo(null);
    }
  }, [selectedActivityId]);

  useEffect(() => {
    if (selectedScheduleId) {
      // Encontrar el schedule seleccionado para obtener los precios
      const schedule = availableSchedules.find((s) => s.id === selectedScheduleId);
      setSelectedSchedule(schedule || null);
      loadAvailability();
    } else {
      setSelectedSchedule(null);
      setAvailabilityInfo(null);
    }
  }, [selectedScheduleId, availableSchedules]);

  useEffect(() => {
    if (
      formData.companyId &&
      (formData.commissionPercentage === undefined || formData.commissionPercentage === null)
    ) {
      const company = companies.find((c) => c.id === formData.companyId);
      if (company) {
        setFormData((prev) => ({
          ...prev,
          commissionPercentage: company.commissionPercentage,
        }));
      }
    }
  }, [formData.companyId, companies]);

  const loadCatalogs = async () => {
    try {
      setCatalogsLoading(true);
      const [activitiesRes, companiesRes] = await Promise.all([
        fetchActivitiesWithPagination(1, 100, true),
        fetchCompaniesWithPagination(1, 100, true),
      ]);
      setActivities(activitiesRes.items);
      setCompanies(companiesRes.items);
    } catch (error) {
      console.error("Error al cargar catálogos:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setCatalogsLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await fetchBookingsWithPagination(page, pageSize, {
        status: statusFilter || undefined,
      });
      setBookings(response.items);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error("Error al cargar reservas:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSchedules = async () => {
    if (!selectedActivityId) {
      setAvailableSchedules([]);
      return;
    }

    try {
      setAvailableSchedules([]);
      const schedules = await getAvailableSchedulesByActivityId(selectedActivityId);
      setAvailableSchedules(schedules);
      if (schedules.length === 0) {
        toast.info("No hay fechas disponibles para esta actividad");
      }
    } catch (error) {
      console.error("Error al cargar fechas disponibles:", error);
      toast.error(getErrorMessage(error));
      setAvailableSchedules([]);
    }
  };

  const loadAvailability = async () => {
    if (!selectedScheduleId) return;

    try {
      const availability = await checkAvailability(selectedScheduleId);
      setAvailabilityInfo(availability);
      setFormData((prev) => ({
        ...prev,
        activityScheduleId: selectedScheduleId,
      }));
    } catch (error) {
      console.error("Error al validar disponibilidad:", error);
      toast.error(getErrorMessage(error));
      setAvailabilityInfo(null);
    }
  };

  const handleCloseBookingModal = () => {
    if (formLoading) return;
    setShowBookingModal(false);
    setSelectedSchedule(null);
  };

  const handleCreateBooking = () => {
    setEditingBooking(null);
    setSelectedActivityId("");
    setSelectedScheduleId("");
    setSelectedSchedule(null);
    setAvailabilityInfo(null);
    setFormData({
      activityScheduleId: "",
      companyId: null,
      transport: false,
      numberOfPeople: 1,
      numberOfPeopleInput: "",
      adultCount: 0,
      adultCountInput: "",
      childCount: 0,
      childCountInput: "",
      seniorCount: 0,
      seniorCountInput: "",
      passengerCount: null,
      commissionPercentage: undefined,
      customerName: "",
      customerEmail: null,
      customerPhone: null,
      status: "pending",
    });
    setShowBookingModal(true);
  };

  const handleEditBooking = async (id: string) => {
    try {
      setFormLoading(true);
      const booking = await getBookingById(id);
      setEditingBooking(booking);
      setSelectedActivityId(booking.activityId || "");
      setSelectedScheduleId(booking.activityScheduleId);
      
      // Cargar schedules para obtener los precios
      if (booking.activityId) {
        const schedules = await getAvailableSchedulesByActivityId(booking.activityId);
        const schedule = schedules.find((s) => s.id === booking.activityScheduleId);
        setSelectedSchedule(schedule || null);
      }
      
      setFormData({
        activityScheduleId: booking.activityScheduleId,
        companyId: booking.companyId ?? null,
        transport: booking.transport,
        numberOfPeople: booking.numberOfPeople,
        numberOfPeopleInput: booking.numberOfPeople,
        adultCount: booking.adultCount ?? 0,
        adultCountInput: booking.adultCount ?? 0,
        childCount: booking.childCount ?? 0,
        childCountInput: booking.childCount ?? 0,
        seniorCount: booking.seniorCount ?? 0,
        seniorCountInput: booking.seniorCount ?? 0,
        passengerCount: booking.passengerCount ?? null,
        commissionPercentage: booking.commissionPercentage,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail ?? null,
        customerPhone: booking.customerPhone ?? null,
        status: booking.status,
      });
      setShowBookingModal(true);
    } catch (error) {
      console.error("Error al cargar reserva:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    const confirmed = await confirm({
      title: "Cancelar Reserva",
      message: "¿Estás seguro de que deseas cancelar esta reserva?",
      variant: "danger",
      confirmText: "Cancelar Reserva",
      cancelText: "No",
    });

    if (confirmed) {
      try {
        await cancelBooking(id);
        toast.success("Reserva cancelada correctamente");
        await loadBookings();
      } catch (error) {
        console.error("Error al cancelar reserva:", error);
        toast.error(getErrorMessage(error));
      }
    }
  };

  const parseCount = (v: string | number): number => {
    if (typeof v === "string") {
      const s = v.trim();
      if (s === "") return 0;
      const n = parseInt(s, 10);
      return Number.isNaN(n) ? 0 : Math.max(0, n);
    }
    return Math.max(0, Number(v));
  };

  const parsePrice = (price: number | string | undefined | null): number => {
    if (price === undefined || price === null) return 0;
    if (typeof price === "number") return price;
    if (typeof price === "string") {
      const parsed = parseFloat(price);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const formatPrice = (price: number | string | undefined | null): string => {
    return parsePrice(price).toFixed(2);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.activityScheduleId) {
      toast.error("Debes seleccionar una fecha");
      return;
    }

    if (!formData.customerName.trim()) {
      toast.error("El nombre del cliente es requerido");
      return;
    }

    // Validar cantidad de personas: obligatorio y > 0
    const numberOfPeopleValue =
      typeof formData.numberOfPeopleInput === "string"
        ? formData.numberOfPeopleInput.trim() === ""
          ? null
          : parseInt(formData.numberOfPeopleInput.trim(), 10)
        : formData.numberOfPeopleInput;

    if (numberOfPeopleValue === null || Number.isNaN(numberOfPeopleValue) || numberOfPeopleValue <= 0) {
      toast.error("La cantidad de personas es requerida y debe ser mayor a 0");
      return;
    }

    if (availabilityInfo && numberOfPeopleValue > availabilityInfo.availableSpaces) {
      toast.error(`No hay suficientes espacios disponibles. Disponibles: ${availabilityInfo.availableSpaces}`);
      return;
    }

    const adultVal = parseCount(formData.adultCountInput);
    const childVal = parseCount(formData.childCountInput);
    const seniorVal = parseCount(formData.seniorCountInput);

    if (adultVal < 0 || childVal < 0 || seniorVal < 0) {
      toast.error("Adultos, niños y adultos mayores no pueden ser negativos");
      return;
    }

    const sum = adultVal + childVal + seniorVal;
    if (sum <= 0) {
      toast.error("La suma de adultos + niños + adultos mayores debe ser mayor a 0");
      return;
    }
    if (sum !== numberOfPeopleValue) {
      toast.error(
        `La suma de adultos + niños + adultos mayores (${sum}) debe ser igual a la cantidad de personas (${numberOfPeopleValue})`
      );
      return;
    }

    // Validar transporte y pasajeros
    if (formData.transport) {
      if (formData.passengerCount === null || formData.passengerCount === undefined) {
        toast.error("La cantidad de pasajeros para transporte es requerida");
        return;
      }
      if (formData.passengerCount < 1) {
        toast.error("La cantidad de pasajeros para transporte debe ser al menos 1");
        return;
      }
    }

    // Comisión: solo cuando hay compañía; puede ser 0
    let finalCommission: number | undefined;
    if (formData.companyId) {
      finalCommission =
        formData.commissionPercentage !== undefined && formData.commissionPercentage !== null
          ? formData.commissionPercentage
          : companies.find((c) => c.id === formData.companyId)?.commissionPercentage;
      if (finalCommission === undefined || finalCommission === null) {
        toast.error("Debes ingresar un porcentaje de comisión para la compañía (puede ser 0)");
        return;
      }
      if (finalCommission < 0 || finalCommission > 100) {
        toast.error("El porcentaje de comisión debe estar entre 0 y 100");
        return;
      }
    }

    try {
      setFormLoading(true);

      const payload: BookingFormData = {
        activityScheduleId: formData.activityScheduleId,
        companyId: formData.companyId ?? null,
        transport: formData.transport || false,
        numberOfPeople: numberOfPeopleValue,
        adultCount: adultVal,
        childCount: childVal,
        seniorCount: seniorVal,
        passengerCount: formData.transport ? formData.passengerCount : null,
        commissionPercentage: finalCommission,
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail?.trim() || null,
        customerPhone: formData.customerPhone?.trim() || null,
        status: formData.status,
      };

      if (editingBooking) {
        await updateBooking(editingBooking.id, payload);
        toast.success("Reserva actualizada correctamente");
      } else {
        await createBooking(payload);
        toast.success("Reserva creada correctamente");
      }

      setShowBookingModal(false);
      setSelectedSchedule(null);
      await loadBookings();
    } catch (error) {
      console.error("Error al guardar reserva:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    const statusConfig = {
      pending: { label: "Pendiente", style: badgeStyles.warn },
      confirmed: { label: "Confirmada", style: badgeStyles.success },
      cancelled: { label: "Cancelada", style: badgeStyles.danger },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span style={{ ...badgeStyles.base, ...config.style }}>
        {config.label}
      </span>
    );
  };

  const columns: Column<Booking>[] = [
    {
      key: "customerName",
      header: "Cliente",
      accessor: (b) => b.customerName,
    },
    {
      key: "activityTitle",
      header: "Actividad",
      accessor: (b) => b.activityTitle || "-",
    },
    {
      key: "scheduledStart",
      header: "Fecha/Hora",
      width: "200px",
      render: (b) =>
        b.scheduledStart ? (
          <span>{dateTimeFormatter.format(new Date(b.scheduledStart))}</span>
        ) : (
          "-"
        ),
    },
    {
      key: "numberOfPeople",
      header: "Personas",
      width: "100px",
      align: "center",
      accessor: (b) => b.numberOfPeople,
    },
    {
      key: "desglose",
      header: "Desglose",
      width: "140px",
      align: "center",
      accessor: (b) =>
        `${b.adultCount ?? 0} A / ${b.childCount ?? 0} N / ${b.seniorCount ?? 0} M`,
    },
    {
      key: "companyName",
      header: "Compañía",
      accessor: (b) => b.companyName || "-",
    },
    {
      key: "transport",
      header: "Transporte",
      width: "120px",
      align: "center",
      render: (b) => (
        <span
          style={{
            ...badgeStyles.base,
            ...(b.transport ? badgeStyles.success : badgeStyles.info),
          }}
        >
          {b.transport ? `Sí${b.passengerCount ? ` (${b.passengerCount})` : ""}` : "No"}
        </span>
      ),
    },
    {
      key: "commissionPercentage",
      header: "Comisión (%)",
      width: "120px",
      align: "center",
      accessor: (b) => `${b.commissionPercentage}%`,
    },
    {
      key: "status",
      header: "Estado",
      width: "120px",
      align: "center",
      render: (b) => getStatusBadge(b.status),
    },
    {
      key: "actions",
      header: "Acciones",
      width: "180px",
      align: "center",
      render: (b) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditBooking(b.id)}
            icon={<Edit size={16} />}
            style={{ padding: "4px 8px" }}
          >
            Editar
          </Button>
          {b.status !== "cancelled" && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleCancelBooking(b.id)}
              icon={<X size={16} />}
              style={{ padding: "4px 8px" }}
            >
              Cancelar
            </Button>
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
          Todas
        </Button>
        <Button
          variant={statusFilter === "pending" ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter("pending");
            setPage(1);
          }}
        >
          Pendientes
        </Button>
        <Button
          variant={statusFilter === "confirmed" ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter("confirmed");
            setPage(1);
          }}
        >
          Confirmadas
        </Button>
        <Button
          variant={statusFilter === "cancelled" ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter("cancelled");
            setPage(1);
          }}
        >
          Canceladas
        </Button>
      </div>
      <Button onClick={handleCreateBooking} icon={<Plus size={18} />} size="sm">
        Nueva reserva
      </Button>
    </div>
  );

  return (
    <>
      <TableCard<Booking>
        title="Reservas de Actividades"
        loading={loading}
        data={bookings}
        columns={columns}
        rowKey={(b) => b.id}
        emptyText="No hay reservas aún"
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

      {/* Modal para crear/editar reserva */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => !formLoading && setShowBookingModal(false)}
        title={editingBooking ? "Editar Reserva" : "Nueva Reserva"}
        size="lg"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
      >
        {formLoading && !editingBooking ? (
          <div style={{ padding: "32px", textAlign: "center" }}>
            <div className="spinner-border spinner-border-sm me-2" />
            Cargando información…
          </div>
        ) : (
          <form onSubmit={handleSubmitBooking}>
            <div style={{ display: "grid", gap: "16px" }}>
              {/* Paso 1: Seleccionar Actividad */}
              <FormCombobox
                label="Actividad"
                value={selectedActivityId}
                onChange={(value) => {
                  setSelectedActivityId(String(value));
                  setSelectedScheduleId("");
                  setSelectedSchedule(null);
                  setAvailabilityInfo(null);
                  setFormData((prev) => ({
                    ...prev,
                    activityScheduleId: "",
                  }));
                }}
                options={activityOptions}
                placeholder={catalogsLoading ? "Cargando..." : "Selecciona una actividad"}
                searchPlaceholder="Buscar actividad..."
                required
                fullWidth
                disabled={catalogsLoading || formLoading || !!editingBooking}
              />

              {/* Paso 2: Seleccionar Fecha (solo si hay actividad seleccionada) */}
              {selectedActivityId && (
                <>
                  {availableSchedules.length === 0 && !catalogsLoading && (
                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: "#fef3c7",
                        borderRadius: "8px",
                        border: "1px solid #fbbf24",
                        color: "#92400e",
                        fontSize: "0.875rem",
                      }}
                    >
                      No hay fechas disponibles para esta actividad. Por favor, selecciona otra actividad o crea una planeación para esta actividad.
                    </div>
                  )}
                  <FormCombobox
                    label="Fecha y Hora Disponible"
                    value={selectedScheduleId}
                    onChange={(value) => {
                      setSelectedScheduleId(String(value));
                      // Resetear cantidades cuando cambia el schedule
                      setFormData((prev) => ({
                        ...prev,
                        adultCountInput: "",
                        childCountInput: "",
                        seniorCountInput: "",
                      }));
                    }}
                    options={scheduleOptions}
                    placeholder={
                      availableSchedules.length === 0
                        ? "No hay fechas disponibles"
                        : "Selecciona una fecha"
                    }
                    searchPlaceholder="Buscar fecha..."
                    required
                    fullWidth
                    disabled={formLoading || availableSchedules.length === 0}
                  />
                  {/* Mostrar precios del schedule seleccionado */}
                  {selectedSchedule && (
                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: "#f8fafc",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "0.875rem",
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: "8px" }}>Precios por persona:</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                        {selectedSchedule.adultPrice !== undefined && (
                          <div>
                            <span style={{ color: "#64748b" }}>Adultos:</span>{" "}
                            <span style={{ fontWeight: 600 }}>${formatPrice(selectedSchedule.adultPrice)}</span>
                          </div>
                        )}
                        {selectedSchedule.childPrice !== undefined && (
                          <div>
                            <span style={{ color: "#64748b" }}>Niños:</span>{" "}
                            <span style={{ fontWeight: 600 }}>${formatPrice(selectedSchedule.childPrice)}</span>
                          </div>
                        )}
                        {selectedSchedule.seniorPrice !== undefined && (
                          <div>
                            <span style={{ color: "#64748b" }}>Adultos mayores:</span>{" "}
                            <span style={{ fontWeight: 600 }}>${formatPrice(selectedSchedule.seniorPrice)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Información de disponibilidad */}
              {availabilityInfo && (
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 600 }}>Disponibilidad:</span>
                    <span
                      style={{
                        ...badgeStyles.base,
                        ...(availabilityInfo.availableSpaces > 0
                          ? badgeStyles.success
                          : badgeStyles.danger),
                      }}
                    >
                      {availabilityInfo.availableSpaces} espacios disponibles
                    </span>
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                    Capacidad total: {availabilityInfo.partySize} | Reservados:{" "}
                    {availabilityInfo.bookedPeople}
                  </div>
                </div>
              )}

              {/* Paso 3: Cantidad de Personas y desglose */}
              <FormInput
                label="Cantidad de Personas"
                type="number"
                min={1}
                max={availabilityInfo?.availableSpaces || undefined}
                value={formData.numberOfPeopleInput}
                onChange={(e) => {
                  const inputValue = e.target.value === "" ? "" : e.target.value;
                  const parsed = inputValue === "" ? null : parseInt(inputValue, 10);
                  const total = parsed !== null && !Number.isNaN(parsed) && parsed >= 0 ? parsed : 0;
                  setFormData({
                    ...formData,
                    numberOfPeopleInput: inputValue,
                    numberOfPeople: total,
                    adultCountInput: total,
                    childCountInput: 0,
                    seniorCountInput: 0,
                    passengerCount:
                      formData.transport &&
                      total > 0 &&
                      (!formData.passengerCount || formData.passengerCount < total)
                        ? total
                        : formData.passengerCount,
                  });
                }}
                required
                fullWidth
                disabled={formLoading || !availabilityInfo}
                helperText={
                  availabilityInfo
                    ? `Máximo ${availabilityInfo.availableSpaces} espacios disponibles. Desglose debe sumar esta cantidad.`
                    : "Selecciona una fecha primero"
                }
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <FormInput
                    label="Adultos"
                    type="number"
                    min={0}
                    value={formData.adultCountInput}
                    onChange={(e) => {
                      const v = e.target.value === "" ? "" : e.target.value;
                      const adultCount = parseCount(v);
                      const childCount = parseCount(formData.childCountInput);
                      const seniorCount = parseCount(formData.seniorCountInput);
                      const total = adultCount + childCount + seniorCount;
                      setFormData({
                        ...formData,
                        adultCountInput: v,
                        numberOfPeopleInput: total > 0 ? total : "",
                        numberOfPeople: total,
                      });
                    }}
                    fullWidth
                    disabled={formLoading || !availabilityInfo}
                    placeholder="0"
                  />
                  {selectedSchedule?.adultPrice !== undefined && formData.adultCountInput !== "" && (
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                      {parseCount(formData.adultCountInput)} × ${formatPrice(selectedSchedule.adultPrice)} = ${(parseCount(formData.adultCountInput) * parsePrice(selectedSchedule.adultPrice)).toFixed(2)}
                    </div>
                  )}
                </div>
                <div>
                  <FormInput
                    label="Niños"
                    type="number"
                    min={0}
                    value={formData.childCountInput}
                    onChange={(e) => {
                      const v = e.target.value === "" ? "" : e.target.value;
                      const adultCount = parseCount(formData.adultCountInput);
                      const childCount = parseCount(v);
                      const seniorCount = parseCount(formData.seniorCountInput);
                      const total = adultCount + childCount + seniorCount;
                      setFormData({
                        ...formData,
                        childCountInput: v,
                        numberOfPeopleInput: total > 0 ? total : "",
                        numberOfPeople: total,
                      });
                    }}
                    fullWidth
                    disabled={formLoading || !availabilityInfo}
                    placeholder="0"
                  />
                  {selectedSchedule?.childPrice !== undefined && formData.childCountInput !== "" && (
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                      {parseCount(formData.childCountInput)} × ${formatPrice(selectedSchedule.childPrice)} = ${(parseCount(formData.childCountInput) * parsePrice(selectedSchedule.childPrice)).toFixed(2)}
                    </div>
                  )}
                </div>
                <div>
                  <FormInput
                    label="Adultos mayores"
                    type="number"
                    min={0}
                    value={formData.seniorCountInput}
                    onChange={(e) => {
                      const v = e.target.value === "" ? "" : e.target.value;
                      const adultCount = parseCount(formData.adultCountInput);
                      const childCount = parseCount(formData.childCountInput);
                      const seniorCount = parseCount(v);
                      const total = adultCount + childCount + seniorCount;
                      setFormData({
                        ...formData,
                        seniorCountInput: v,
                        numberOfPeopleInput: total > 0 ? total : "",
                        numberOfPeople: total,
                      });
                    }}
                    fullWidth
                    disabled={formLoading || !availabilityInfo}
                    placeholder="0"
                  />
                  {selectedSchedule?.seniorPrice !== undefined && formData.seniorCountInput !== "" && (
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                      {parseCount(formData.seniorCountInput)} × ${formatPrice(selectedSchedule.seniorPrice)} = ${(parseCount(formData.seniorCountInput) * parsePrice(selectedSchedule.seniorPrice)).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
              {/* Mostrar total general */}
              {selectedSchedule && (
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#f0f9ff",
                    borderRadius: "8px",
                    border: "1px solid #bae6fd",
                    marginTop: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "#0369a1" }}>Total:</span>
                    <span style={{ fontWeight: 700, fontSize: "1.125rem", color: "#0369a1" }}>
                      $
                      {(
                        (parseCount(formData.adultCountInput) * parsePrice(selectedSchedule.adultPrice)) +
                        (parseCount(formData.childCountInput) * parsePrice(selectedSchedule.childPrice)) +
                        (parseCount(formData.seniorCountInput) * parsePrice(selectedSchedule.seniorPrice))
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              {(formData.adultCountInput !== "" || formData.childCountInput !== "" || formData.seniorCountInput !== "") && (
                <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                  Suma actual:{" "}
                  {parseCount(formData.adultCountInput) +
                    parseCount(formData.childCountInput) +
                    parseCount(formData.seniorCountInput)}
                  {typeof formData.numberOfPeopleInput === "string" &&
                  formData.numberOfPeopleInput.trim() !== "" &&
                  !Number.isNaN(parseInt(formData.numberOfPeopleInput.trim(), 10))
                    ? ` (debe ser ${parseInt(formData.numberOfPeopleInput.trim(), 10)})`
                    : ""}
                </div>
              )}

              {/* Paso 4: Datos del Cliente */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                <h4 style={{ marginBottom: "16px", fontSize: "1rem", fontWeight: 600 }}>
                  Datos del Cliente
                </h4>
                <FormInput
                  label="Nombre del Cliente"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  required
                  fullWidth
                  disabled={formLoading}
                />
                <FormInput
                  label="Email"
                  type="email"
                  value={formData.customerEmail || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customerEmail: e.target.value.trim() || null,
                    })
                  }
                  fullWidth
                  disabled={formLoading}
                  placeholder="Opcional"
                />
                <FormInput
                  label="Teléfono"
                  value={formData.customerPhone || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customerPhone: e.target.value.trim() || null,
                    })
                  }
                  fullWidth
                  disabled={formLoading}
                  placeholder="Opcional"
                />
              </div>

              {/* Paso 5: Transporte */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                <FormCheckbox
                  label="Requiere Transporte"
                  checked={formData.transport || false}
                  onChange={(e) => {
                    const needsTransport = e.target.checked;
                    setFormData({
                      ...formData,
                      transport: needsTransport,
                      passengerCount: needsTransport
                        ? formData.passengerCount ||
                          (() => {
                            const numValue =
                              typeof formData.numberOfPeopleInput === "string"
                                ? parseInt(formData.numberOfPeopleInput.trim(), 10)
                                : formData.numberOfPeopleInput;
                            return Number.isFinite(numValue) && numValue > 0 ? numValue : null;
                          })()
                        : null,
                    });
                  }}
                  disabled={formLoading}
                />
                {formData.transport && (
                  <FormInput
                    label="Cantidad de Pasajeros para Transporte"
                    type="number"
                    min={1}
                    value={formData.passengerCount !== null && formData.passengerCount !== undefined ? formData.passengerCount : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir que se limpie el campo, pero validar al enviar
                      setFormData({
                        ...formData,
                        passengerCount: value !== "" ? parseInt(value, 10) : null,
                      });
                    }}
                    required
                    fullWidth
                    disabled={formLoading}
                    placeholder="Cantidad de pasajeros"
                    helperText="Indica la cantidad de pasajeros que necesitan transporte (mínimo 1). Se establece automáticamente igual a la cantidad de personas."
                  />
                )}
              </div>

              {/* Paso 6: Comisión (solo cuando hay compañía) */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                <h4 style={{ marginBottom: "16px", fontSize: "1rem", fontWeight: 600 }}>
                  Comisión (opcional)
                </h4>
                <FormCombobox
                  label="Compañía"
                  value={formData.companyId || ""}
                  onChange={(value) => {
                    const companyId = value ? String(value) : null;
                    setFormData({
                      ...formData,
                      companyId,
                      commissionPercentage: companyId
                        ? companies.find((c) => c.id === companyId)?.commissionPercentage
                        : undefined,
                    });
                  }}
                  options={companyOptions}
                  placeholder="Ninguna (opcional)"
                  searchPlaceholder="Buscar compañía..."
                  fullWidth
                  disabled={formLoading}
                />
                {formData.companyId && (
                  <FormInput
                    label="Porcentaje de Comisión (%)"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={
                      formData.commissionPercentage !== undefined && formData.commissionPercentage !== null
                        ? formData.commissionPercentage
                        : companies.find((c) => c.id === formData.companyId)?.commissionPercentage ?? ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        commissionPercentage: value !== "" ? parseFloat(value) : undefined,
                      });
                    }}
                    required
                    fullWidth
                    disabled={formLoading}
                    placeholder={`Default ${companies.find((c) => c.id === formData.companyId)?.commissionPercentage}%`}
                    helperText="Puedes sobrescribir el porcentaje de la compañía (puede ser 0)"
                  />
                )}
              </div>
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
                onClick={handleCloseBookingModal}
                disabled={formLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={formLoading}>
                {editingBooking ? "Guardar Cambios" : "Crear Reserva"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}

