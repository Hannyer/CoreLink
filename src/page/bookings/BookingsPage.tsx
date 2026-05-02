import { useEffect, useState, useMemo, type CSSProperties } from "react";
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
import { fetchPaymentTypesWithPagination } from "@/services/paymentTypesService";
import { fetchCardTypesWithPagination } from "@/services/cardTypesService";
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
import {
  Edit,
  Trash2,
  Plus,
  X,
  CalendarRange,
  Users,
  Wallet,
  ClipboardCheck,
} from "lucide-react";
import type {
  Booking,
  BookingFormData,
  BookingStatus,
  Activity,
  Company,
  AvailableSchedule,
  AvailabilityInfo,
  PaymentType,
  CardType,
} from "@/types/entities";
import type { AxiosError } from "axios";

/**
 * Función helper para extraer el mensaje de error del formato del API
 *
 * Cambios recientes en esta página:
 * - Se agregó soporte para seleccionar tipo de pago (`paymentTypeId`) y tipo de tarjeta (`cardTypeId`)
 *   consumiendo los catálogos `/api/payment-types` y `/api/card-types`.
 * - Cuando el tipo de pago es "Tarjeta", el tipo de tarjeta es obligatorio antes de crear/actualizar la reserva.
 * - El payload enviado al endpoint POST/PUT `/api/bookings` ahora incluye `paymentTypeId`, `cardTypeId` (cuando aplica)
 *   y un comentario opcional (`comment`).
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

/** Pasos del asistente de reserva: 0 actividad → 1 participantes → 2 cliente/pago → 3 resumen */
const BOOKING_WIZARD_LAST_STEP = 3;

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingWizardStep, setBookingWizardStep] = useState(0);
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
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
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
    paymentTypeId: null,
    cardTypeId: null,
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
    comment: "",
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

  const paymentTypeOptions: SelectOption[] = useMemo(
    () =>
      paymentTypes
        .filter((p) => p.status)
        .map((paymentType) => ({
          value: paymentType.id,
          label: paymentType.name,
        })),
    [paymentTypes]
  );

  const cardTypeOptions: SelectOption[] = useMemo(
    () =>
      cardTypes
        .filter((c) => c.status)
        .map((cardType) => ({
          value: cardType.id,
          label: cardType.name,
        })),
    [cardTypes]
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
      const [activitiesRes, companiesRes, paymentTypesRes, cardTypesRes] = await Promise.all([
        fetchActivitiesWithPagination(1, 100, true),
        fetchCompaniesWithPagination(1, 100, true),
        fetchPaymentTypesWithPagination(1, 50),
        fetchCardTypesWithPagination(1, 50),
      ]);
      setActivities(activitiesRes.items);
      setCompanies(companiesRes.items);
      setPaymentTypes(paymentTypesRes.items);
      setCardTypes(cardTypesRes.items);
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
    setBookingWizardStep(0);
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
      paymentTypeId: null,
      cardTypeId: null,
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
      comment: "",
      status: "pending",
    });
    setBookingWizardStep(0);
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
        paymentTypeId: booking.paymentTypeId ?? null,
        cardTypeId: booking.cardTypeId ?? null,
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
        comment: booking.comment ?? "",
        status: booking.status,
      });
      setBookingWizardStep(0);
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

  /** Al editar, el API cuenta esta reserva como ocupada: se suman sus plazas al cupo usable. */
  const maxParticipantsAllowed = useMemo(() => {
    if (!availabilityInfo) return undefined;
    return availabilityInfo.availableSpaces;
  }, [availabilityInfo, editingBooking]);

  const validateWizardStep0 = (): string | null => {
    if (!selectedActivityId) return "Selecciona una actividad.";
    if (!selectedScheduleId) return "Selecciona fecha y hora.";
    if (!availabilityInfo) return "Espera la validación de disponibilidad o elige otra fecha.";
    if (!formData.activityScheduleId) return "Debes seleccionar una fecha.";
    if (formData.activityScheduleId !== selectedScheduleId) {
      return "La fecha no está sincronizada. Vuelve a seleccionarla.";
    }
    return null;
  };

  const validateWizardStep1 = (): string | null => {
    const numberOfPeopleValue =
      typeof formData.numberOfPeopleInput === "string"
        ? formData.numberOfPeopleInput.trim() === ""
          ? null
          : parseInt(formData.numberOfPeopleInput.trim(), 10)
        : formData.numberOfPeopleInput;

    if (numberOfPeopleValue === null || Number.isNaN(numberOfPeopleValue) || numberOfPeopleValue <= 0) {
      return "La cantidad de personas es obligatoria y debe ser mayor a 0.";
    }

    /* Crear: tope = cupos libres. Editar: tope = participantes originales + cupos libres (sin cambio de total siempre pasa). */
    const valor= editingBooking?editingBooking.numberOfPeople:0;
    const valueFieldsAvaleible= numberOfPeopleValue-valor
    if (
      availabilityInfo &&
      maxParticipantsAllowed !== undefined &&
    valueFieldsAvaleible > maxParticipantsAllowed
    ) {
      return editingBooking
        ? `No hay suficientes cupos. Puedes tener hasta ${maxParticipantsAllowed} participante(s) (${editingBooking.numberOfPeople} de tu reserva + ${availabilityInfo.availableSpaces} cupo(s) libre(s) en la actividad).`
        : `No hay suficientes cupos. Máximo permitido: ${maxParticipantsAllowed}.`;
    }

    const adultVal = parseCount(formData.adultCountInput);
    const childVal = parseCount(formData.childCountInput);
    const seniorVal = parseCount(formData.seniorCountInput);

    if (adultVal < 0 || childVal < 0 || seniorVal < 0) {
      return "Adultos, niños y adultos mayores no pueden ser negativos.";
    }

    const sum = adultVal + childVal + seniorVal;
    if (sum <= 0) {
      return "La suma de adultos, niños y adultos mayores debe ser mayor a 0.";
    }
    if (sum !== numberOfPeopleValue) {
      return `La suma por categoría (${sum}) debe coincidir con el total (${numberOfPeopleValue}).`;
    }

    return null;
  };

  const validateWizardStep2 = (): string | null => {
    if (!formData.paymentTypeId) return "Selecciona un tipo de pago.";

    const selectedPaymentType = paymentTypes.find((p) => p.id === formData.paymentTypeId);
    const isCardPayment =
      selectedPaymentType && selectedPaymentType.name.toLowerCase() === "tarjeta";

    if (isCardPayment && !formData.cardTypeId) {
      return "Selecciona un tipo de tarjeta.";
    }

    if (!formData.customerName.trim()) return "El nombre del cliente es obligatorio.";

    if (formData.transport) {
      if (formData.passengerCount === null || formData.passengerCount === undefined) {
        return "Indica cuántos pasajeros requieren transporte.";
      }
      if (formData.passengerCount < 1) {
        return "La cantidad de pasajeros debe ser al menos 1.";
      }
    }

    if (formData.companyId) {
      const finalCommission =
        formData.commissionPercentage !== undefined && formData.commissionPercentage !== null
          ? formData.commissionPercentage
          : companies.find((c) => c.id === formData.companyId)?.commissionPercentage;
      if (finalCommission === undefined || finalCommission === null) {
        return "Indica el porcentaje de comisión (puede ser 0).";
      }
      if (finalCommission < 0 || finalCommission > 100) {
        return "El porcentaje de comisión debe estar entre 0 y 100.";
      }
    }

    return null;
  };

  const validateFullBookingForm = (): string | null =>
    validateWizardStep0() ?? validateWizardStep1() ?? validateWizardStep2();

  const goNextBookingWizardStep = () => {
    if (bookingWizardStep === 0) {
      const err = validateWizardStep0();
      if (err) {
        toast.error(err);
        return;
      }
      setBookingWizardStep(1);
      return;
    }
    if (bookingWizardStep === 1) {
      const err = validateWizardStep1();
      if (err) {
        toast.error(err);
        return;
      }
      setBookingWizardStep(2);
      return;
    }
    if (bookingWizardStep === 2) {
      const err = validateWizardStep2();
      if (err) {
        toast.error(err);
        return;
      }
      setBookingWizardStep(3);
    }
  };

  const goPrevBookingWizardStep = () => {
    setBookingWizardStep((s) => Math.max(0, s - 1));
  };

  const handleSubmitBooking = async () => {
    if (bookingWizardStep !== BOOKING_WIZARD_LAST_STEP) {
      return;
    }

    const validationError = validateFullBookingForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const selectedPaymentType = paymentTypes.find((p) => p.id === formData.paymentTypeId);
    const isCardPayment =
      selectedPaymentType && selectedPaymentType.name.toLowerCase() === "tarjeta";

    const numberOfPeopleValue =
      typeof formData.numberOfPeopleInput === "string"
        ? parseInt(formData.numberOfPeopleInput.trim(), 10)
        : formData.numberOfPeopleInput;

    const adultVal = parseCount(formData.adultCountInput);
    const childVal = parseCount(formData.childCountInput);
    const seniorVal = parseCount(formData.seniorCountInput);

    let finalCommission: number | undefined;
    if (formData.companyId) {
      finalCommission =
        formData.commissionPercentage !== undefined && formData.commissionPercentage !== null
          ? formData.commissionPercentage
          : companies.find((c) => c.id === formData.companyId)?.commissionPercentage;
    }

    try {
      setFormLoading(true);

      const payload: BookingFormData = {
        activityScheduleId: formData.activityScheduleId,
        companyId: formData.companyId ?? null,
        paymentTypeId: formData.paymentTypeId ?? null,
        cardTypeId: isCardPayment ? formData.cardTypeId ?? null : null,
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
        comment: formData.comment?.trim() || null,
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
      setBookingWizardStep(0);
      setSelectedSchedule(null);
      await loadBookings();
    } catch (error) {
      console.error("Error al guardar reserva:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const selectedActivityLabel = useMemo(
    () => activityOptions.find((o) => o.value === selectedActivityId)?.label ?? "—",
    [activityOptions, selectedActivityId]
  );

  const scheduleSummaryRange = useMemo(() => {
    if (!selectedSchedule) return "—";
    return `${dateTimeFormatter.format(new Date(selectedSchedule.scheduledStart))} — ${dateTimeFormatter.format(new Date(selectedSchedule.scheduledEnd))}`;
  }, [selectedSchedule, dateTimeFormatter]);

  const bookingEstimatedTotal = useMemo(() => {
    if (!selectedSchedule) return 0;
    return (
      parseCount(formData.adultCountInput) * parsePrice(selectedSchedule.adultPrice) +
      parseCount(formData.childCountInput) * parsePrice(selectedSchedule.childPrice) +
      parseCount(formData.seniorCountInput) * parsePrice(selectedSchedule.seniorPrice)
    );
  }, [
    selectedSchedule,
    formData.adultCountInput,
    formData.childCountInput,
    formData.seniorCountInput,
  ]);

  const bookingWizardStepsMeta = useMemo(
    () =>
      [
        {
          label: "Actividad",
          hint: "Elige servicio y horario",
          Icon: CalendarRange,
        },
        {
          label: "Participantes",
          hint: "Personas y precios",
          Icon: Users,
        },
        {
          label: "Cliente y pago",
          hint: "Datos y cobro",
          Icon: Wallet,
        },
        {
          label: "Resumen",
          hint: "Revisa y confirma",
          Icon: ClipboardCheck,
        },
      ] as const,
    []
  );

  const summarySectionStyle: CSSProperties = {
    padding: "14px 16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#fafafa",
  };

  /** Tarjetas del resumen: misma altura en la cuadrícula 2×2 */
  const summaryCardStyle: CSSProperties = {
    ...summarySectionStyle,
    minHeight: 0,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    overflowY: "auto",
  };

  /** 2×2 con misma altura por fila y filas equilibradas */
  const summaryGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gridTemplateRows: "repeat(2, 1fr)",
    gap: "16px",
    minHeight: "clamp(400px, 42vh, 560px)",
    height: "clamp(400px, 42vh, 560px)",
    alignItems: "stretch",
  };

  const summaryRowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    fontSize: "0.875rem",
    padding: "6px 0",
    borderBottom: "1px solid #f1f5f9",
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
      hideOnMobile: true,
      accessor: (b) =>
        `${b.adultCount ?? 0} A / ${b.childCount ?? 0} N / ${b.seniorCount ?? 0} M`,
    },
    {
      key: "companyName",
      header: "Compañía",
      hideOnMobile: true,
      accessor: (b) => b.companyName || "-",
    },
    {
      key: "transport",
      header: "Transporte",
      width: "120px",
      align: "center",
      hideOnMobile: true,
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
      hideOnMobile: true,
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
          />
          {b.status !== "cancelled" && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleCancelBooking(b.id)}
              icon={<X size={16} />}
              style={{ padding: "4px 8px" }}
            />
          )}
        </div>
      ),
    },
  ];

  const statusOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "Todas" },
      { value: "pending", label: "Pendientes" },
      { value: "confirmed", label: "Confirmadas" },
      { value: "cancelled", label: "Canceladas" },
    ],
    []
  );

  const headerExtra = (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div style={{ minWidth: "220px", flex: 1 }}>
        <FormCombobox
          label="Estado"
          value={statusFilter ?? ""}
          onChange={(value) => {
            const v = String(value ?? "");
            setStatusFilter(v ? (v as BookingStatus) : null);
            setPage(1);
          }}
          options={statusOptions}
          placeholder="Todas"
          searchPlaceholder="Buscar estado..."
          fullWidth
          disabled={loading}
        />
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

      {/* Modal reserva: asistente por pasos; el último paso es el resumen */}
      <Modal
        isOpen={showBookingModal}
        onClose={handleCloseBookingModal}
        title={editingBooking ? "Editar Reserva" : "Nueva Reserva"}
        size="2xl"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
        panelStyle={{
          width: "min(calc(100vw - 40px), 1360px)",
          minHeight: "min(640px, calc(90vh - 36px))",
        }}
        bodyStyle={{
          minHeight: "min(520px, calc(90vh - 200px))",
        }}
        footer={
          !(formLoading && !editingBooking) ? (
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
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
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {bookingWizardStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goPrevBookingWizardStep}
                    disabled={formLoading}
                  >
                    Atrás
                  </Button>
                )}
                {bookingWizardStep < BOOKING_WIZARD_LAST_STEP ? (
                  <Button
                    type="button"
                    onClick={goNextBookingWizardStep}
                    disabled={formLoading}
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button
                    type="button"
                    loading={formLoading}
                    onClick={() => {
                      void handleSubmitBooking();
                    }}
                  >
                    {editingBooking ? "Guardar cambios" : "Confirmar reserva"}
                  </Button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {formLoading && !editingBooking ? (
          <div style={{ padding: "32px", textAlign: "center" }}>
            <div className="spinner-border spinner-border-sm me-2" />
            Cargando información…
          </div>
        ) : (
          <form
            id="booking-form"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <nav aria-label="Pasos del asistente de reserva" style={{ marginBottom: "22px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
                  gap: "10px",
                }}
              >
                {bookingWizardStepsMeta.map((stepMeta, index) => {
                  const StepIcon = stepMeta.Icon;
                  const done = index < bookingWizardStep;
                  const current = index === bookingWizardStep;
                  return (
                    <button
                      key={stepMeta.label}
                      type="button"
                      disabled={index > bookingWizardStep || formLoading}
                      onClick={() => {
                        if (index < bookingWizardStep) setBookingWizardStep(index);
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "6px",
                        padding: "12px 14px",
                        borderRadius: "12px",
                        border: current ? "2px solid #16a34a" : "1px solid #e2e8f0",
                        background: current ? "#f0fdf4" : done ? "#f8fafc" : "#ffffff",
                        cursor:
                          index < bookingWizardStep && !formLoading ? "pointer" : "default",
                        textAlign: "left",
                        opacity: index > bookingWizardStep ? 0.52 : 1,
                        fontFamily: "inherit",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            background: done ? "#16a34a" : current ? "#bbf7d0" : "#f1f5f9",
                            color: done ? "#ffffff" : "#0f172a",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {done ? "✓" : index + 1}
                        </span>
                        <StepIcon
                          size={16}
                          style={{
                            flexShrink: 0,
                            color: current ? "#15803d" : "#94a3b8",
                          }}
                          aria-hidden
                        />
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "0.8125rem",
                            color: "#0f172a",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {stepMeta.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          color: "#64748b",
                          lineHeight: 1.35,
                          paddingLeft: "36px",
                        }}
                      >
                        {stepMeta.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {bookingWizardStep === 0 && (
              <div
                style={{
                  maxWidth: "720px",
                  margin: "0 auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9375rem",
                    color: "#475569",
                    lineHeight: 1.5,
                  }}
                >
                  Selecciona la actividad y el horario disponible. Confirma cupos y tarifas por
                  persona antes de continuar.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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

                {selectedActivityId && (
                  <>
                    {availableSchedules.length === 0 && !catalogsLoading && (
                      <div
                        style={{
                          padding: "10px 12px",
                          backgroundColor: "#fef3c7",
                          borderRadius: "8px",
                          border: "1px solid #fbbf24",
                          color: "#92400e",
                          fontSize: "0.8125rem",
                          lineHeight: 1.4,
                        }}
                      >
                        No hay fechas para esta actividad. Elige otra o crea una planeación.
                      </div>
                    )}
                    <FormCombobox
                      label="Fecha y hora"
                      value={selectedScheduleId}
                      onChange={(value) => {
                        setSelectedScheduleId(String(value));
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
                  </>
                )}

                {(availabilityInfo || selectedSchedule) && (
                  <div
                    style={{
                      padding: "10px 12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "0.8125rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {availabilityInfo && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: "8px 12px",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: "#64748b" }}>
                          Cupo {availabilityInfo.partySize} · Ocupados {availabilityInfo.bookedPeople}
                        </span>
                        <span
                          style={{
                            ...badgeStyles.base,
                            ...(availabilityInfo.availableSpaces > 0
                              ? badgeStyles.success
                              : badgeStyles.danger),
                          }}
                        >
                          {availabilityInfo.availableSpaces} libres
                        </span>
                      </div>
                    )}
                    {selectedSchedule && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "10px 14px",
                          color: "#475569",
                        }}
                      >
                        {selectedSchedule.adultPrice !== undefined && (
                          <span>
                            Adultos <strong>${formatPrice(selectedSchedule.adultPrice)}</strong>
                          </span>
                        )}
                        {selectedSchedule.childPrice !== undefined && (
                          <span>
                            Niños <strong>${formatPrice(selectedSchedule.childPrice)}</strong>
                          </span>
                        )}
                        {selectedSchedule.seniorPrice !== undefined && (
                          <span>
                            Mayores <strong>${formatPrice(selectedSchedule.seniorPrice)}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            )}

            {bookingWizardStep === 1 && (
              <div
                style={{
                  maxWidth: "720px",
                  margin: "0 auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9375rem",
                    color: "#475569",
                    lineHeight: 1.5,
                  }}
                >
                  Indica el total de personas y reparte entre adultos, niños y adultos mayores. La
                  suma debe coincidir con el total y respetar el máximo de cupos.
                </p>
                <FormInput
                  label="Cantidad total"
                  type="number"
                  min={1}
                  max={maxParticipantsAllowed}
                  value={formData.numberOfPeopleInput}
                  onChange={(e) => {
                    const inputValue = e.target.value === "" ? "" : e.target.value;
                    const parsed = inputValue === "" ? null : parseInt(inputValue, 10);
                    const total =
                      parsed !== null && !Number.isNaN(parsed) && parsed >= 0 ? parsed : 0;
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
                    availabilityInfo && maxParticipantsAllowed !== undefined
                      ? `Máx. ${maxParticipantsAllowed}${
                          editingBooking
                            ? " (cupos libres)"
                            : ""
                        }. La suma por categoría debe coincidir.`
                      : "Elige fecha primero"
                  }
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "10px", 
                  }}
                >
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
                    {selectedSchedule?.adultPrice !== undefined &&
                      formData.adultCountInput !== "" && (
                        <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                          = $
                          {(
                            parseCount(formData.adultCountInput) *
                            parsePrice(selectedSchedule.adultPrice)
                          ).toFixed(2)}
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
                    {selectedSchedule?.childPrice !== undefined &&
                      formData.childCountInput !== "" && (
                        <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                          = $
                          {(
                            parseCount(formData.childCountInput) *
                            parsePrice(selectedSchedule.childPrice)
                          ).toFixed(2)}
                        </div>
                      )}
                  </div>
                  <div>
                    <FormInput
                      label="Mayores"
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
                    {selectedSchedule?.seniorPrice !== undefined &&
                      formData.seniorCountInput !== "" && (
                        <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                          = $
                          {(
                            parseCount(formData.seniorCountInput) *
                            parsePrice(selectedSchedule.seniorPrice)
                          ).toFixed(2)}
                        </div>
                      )}
                  </div>
                </div>
                {selectedSchedule && (
                  <div
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#f0f9ff",
                      borderRadius: "8px",
                      border: "1px solid #bae6fd",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#0369a1", fontSize: "0.875rem" }}>
                      Total estimado
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0369a1" }}>
                      $
                      {(
                        parseCount(formData.adultCountInput) *
                          parsePrice(selectedSchedule.adultPrice) +
                        parseCount(formData.childCountInput) *
                          parsePrice(selectedSchedule.childPrice) +
                        parseCount(formData.seniorCountInput) *
                          parsePrice(selectedSchedule.seniorPrice)
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
                {(formData.adultCountInput !== "" ||
                  formData.childCountInput !== "" ||
                  formData.seniorCountInput !== "") && (
                  <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                    Suma categorías:{" "}
                    {parseCount(formData.adultCountInput) +
                      parseCount(formData.childCountInput) +
                      parseCount(formData.seniorCountInput)}
                    {typeof formData.numberOfPeopleInput === "string" &&
                    formData.numberOfPeopleInput.trim() !== "" &&
                    !Number.isNaN(parseInt(formData.numberOfPeopleInput.trim(), 10))
                      ? ` · objetivo ${parseInt(formData.numberOfPeopleInput.trim(), 10)}`
                      : ""}
                  </div>
                )}
              </div>
            )}

            {bookingWizardStep === 2 && (
              <div
                style={{
                  maxWidth: "800px",
                  margin: "0 auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9375rem",
                    color: "#475569",
                    lineHeight: 1.5,
                  }}
                >
                  Completa los datos del cliente, la forma de pago y, si aplica, transporte o
                  comisión por compañía.
                </p>

                <div style={summarySectionStyle}>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#64748b",
                      marginBottom: "10px",
                    }}
                  >
                    Cliente
                  </div>
                <FormInput
                  label="Nombre"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                  fullWidth
                  disabled={formLoading}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "10px",
                  }}
                >
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
                </div>

                <div style={summarySectionStyle}>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#64748b",
                      marginBottom: "10px",
                    }}
                  >
                    Pago y comentarios
                  </div>
                {(() => {
                  const selectedPaymentType = paymentTypes.find(
                    (p) => p.id === formData.paymentTypeId
                  );
                  const isCard =
                    selectedPaymentType &&
                    selectedPaymentType.name.toLowerCase() === "tarjeta";
                  return (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCard ? "repeat(2, minmax(0, 1fr))" : "1fr",
                        gap: "10px",
                        alignItems: "start",
                      }}
                    >
                      <FormCombobox
                        label="Tipo de pago"
                        value={formData.paymentTypeId || ""}
                        onChange={(value) => {
                          const paymentTypeId = value ? String(value) : null;
                          setFormData({
                            ...formData,
                            paymentTypeId,
                            cardTypeId: null,
                          });
                        }}
                        options={paymentTypeOptions}
                        placeholder="Selecciona tipo"
                        searchPlaceholder="Buscar..."
                        required
                        fullWidth
                        disabled={formLoading}
                      />
                      {isCard ? (
                        <FormCombobox
                          label="Tipo de tarjeta"
                          value={formData.cardTypeId || ""}
                          onChange={(value) => {
                            const cardTypeId = value ? String(value) : null;
                            setFormData({
                              ...formData,
                              cardTypeId,
                            });
                          }}
                          options={cardTypeOptions}
                          placeholder="Selecciona tarjeta"
                          searchPlaceholder="Buscar..."
                          required
                          fullWidth
                          disabled={formLoading}
                        />
                      ) : null}
                    </div>
                  );
                })()}
                <FormInput
                  label="Comentario"
                  value={formData.comment || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      comment: e.target.value,
                    })
                  }
                  fullWidth
                  disabled={formLoading}
                  placeholder="Opcional"
                />
                </div>

                <div style={summarySectionStyle}>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#64748b",
                      marginBottom: "10px",
                    }}
                  >
                    Transporte y comisión
                  </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                    gap: "12px 16px",
                  }}
                >
                  <FormCheckbox
                    label="Requiere transporte"
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
                    <div style={{ flex: "1 1 160px", minWidth: "140px" }}>
                      <FormInput
                        label="Pasajeros"
                        type="number"
                        min={1}
                        value={
                          formData.passengerCount !== null && formData.passengerCount !== undefined
                            ? formData.passengerCount
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({
                            ...formData,
                            passengerCount: value !== "" ? parseInt(value, 10) : null,
                          });
                        }}
                        required
                        fullWidth
                        disabled={formLoading}
                        placeholder="Nº"
                        helperText="Por defecto coincide con el total de personas."
                      />
                    </div>
                  )}
                </div>
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
                  placeholder="Ninguna"
                  searchPlaceholder="Buscar compañía..."
                  fullWidth
                  disabled={formLoading}
                />
                {formData.companyId && (
                  <FormInput
                    label="Comisión (%)"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={
                      formData.commissionPercentage !== undefined &&
                      formData.commissionPercentage !== null
                        ? formData.commissionPercentage
                        : companies.find((c) => c.id === formData.companyId)
                            ?.commissionPercentage ?? ""
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
                    placeholder={`Def. ${companies.find((c) => c.id === formData.companyId)?.commissionPercentage}%`}
                    helperText="Puedes sobrescribir el % de la compañía."
                  />
                )}
                </div>
              </div>
            )}

            {bookingWizardStep === BOOKING_WIZARD_LAST_STEP && (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9375rem",
                    color: "#475569",
                    lineHeight: 1.5,
                  }}
                >
                  Verifica los datos. Puedes volver con el botón Atrás o haciendo clic en un paso
                  anterior en la barra superior.
                </p>
                <div style={summaryGridStyle}>
                  <div style={summaryCardStyle}>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "#64748b",
                        marginBottom: "12px",
                      }}
                    >
                      Actividad y horario
                    </div>
                    <div style={{ ...summaryRowStyle, borderBottom: "none", paddingTop: 0 }}>
                      <span style={{ color: "#64748b" }}>Actividad</span>
                      <strong style={{ textAlign: "right" }}>{selectedActivityLabel}</strong>
                    </div>
                    <div style={{ ...summaryRowStyle, borderBottom: "none" }}>
                      <span style={{ color: "#64748b" }}>Horario</span>
                      <span style={{ textAlign: "right", fontWeight: 500 }}>{scheduleSummaryRange}</span>
                    </div>
                    {availabilityInfo && (
                      <div
                        style={{
                          ...summaryRowStyle,
                          borderBottom: "none",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: "#64748b" }}>Cupos</span>
                        <span
                          style={{
                            ...badgeStyles.base,
                            ...(availabilityInfo.availableSpaces > 0
                              ? badgeStyles.success
                              : badgeStyles.danger),
                          }}
                        >
                          {availabilityInfo.availableSpaces} libres de {availabilityInfo.partySize}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={summaryCardStyle}>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "#64748b",
                        marginBottom: "12px",
                      }}
                    >
                      Participantes
                    </div>
                    <div style={summaryRowStyle}>
                      <span style={{ color: "#64748b" }}>Total personas</span>
                      <strong>
                        {typeof formData.numberOfPeopleInput === "string" &&
                        formData.numberOfPeopleInput.trim() !== ""
                          ? parseInt(formData.numberOfPeopleInput.trim(), 10)
                          : formData.numberOfPeople}
                      </strong>
                    </div>
                    <div style={{ ...summaryRowStyle, borderBottom: "none" }}>
                      <span style={{ color: "#64748b" }}>Adultos / Niños / Mayores</span>
                      <span>
                        {parseCount(formData.adultCountInput)} /{" "}
                        {parseCount(formData.childCountInput)} /{" "}
                        {parseCount(formData.seniorCountInput)}
                      </span>
                    </div>
                    {selectedSchedule && (
                      <div
                        style={{
                          marginTop: "10px",
                          paddingTop: "10px",
                          borderTop: "1px dashed #e2e8f0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "#0369a1" }}>Total estimado</span>
                        <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "#0369a1" }}>
                          ${bookingEstimatedTotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={summaryCardStyle}>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "#64748b",
                        marginBottom: "12px",
                      }}
                    >
                      Cliente y pago
                    </div>
                    <div style={summaryRowStyle}>
                      <span style={{ color: "#64748b" }}>Nombre</span>
                      <strong style={{ textAlign: "right" }}>{formData.customerName || "—"}</strong>
                    </div>
                    <div style={summaryRowStyle}>
                      <span style={{ color: "#64748b" }}>Contacto</span>
                      <span style={{ textAlign: "right", fontSize: "0.8125rem" }}>
                        {[formData.customerEmail, formData.customerPhone].filter(Boolean).join(" · ") ||
                          "—"}
                      </span>
                    </div>
                    <div style={{ ...summaryRowStyle, borderBottom: "none" }}>
                      <span style={{ color: "#64748b" }}>Pago</span>
                      <span style={{ textAlign: "right" }}>
                        {paymentTypes.find((p) => p.id === formData.paymentTypeId)?.name ?? "—"}
                        {(() => {
                          const pt = paymentTypes.find((p) => p.id === formData.paymentTypeId);
                          const isCard =
                            pt && pt.name.toLowerCase() === "tarjeta" && formData.cardTypeId;
                          if (!isCard) return null;
                          const cn = cardTypes.find((c) => c.id === formData.cardTypeId)?.name;
                          return cn ? ` · ${cn}` : "";
                        })()}
                      </span>
                    </div>
                    {formData.comment?.trim() ? (
                      <div style={{ marginTop: "8px", fontSize: "0.8125rem", color: "#475569" }}>
                        <span style={{ color: "#64748b" }}>Nota: </span>
                        {formData.comment}
                      </div>
                    ) : null}
                  </div>

                  <div style={summaryCardStyle}>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "#64748b",
                        marginBottom: "12px",
                      }}
                    >
                      Extras
                    </div>
                    <div style={summaryRowStyle}>
                      <span style={{ color: "#64748b" }}>Transporte</span>
                      <span>
                        {formData.transport
                          ? `Sí (${formData.passengerCount ?? "—"} pasajeros)`
                          : "No"}
                      </span>
                    </div>
                    <div style={{ ...summaryRowStyle, borderBottom: "none" }}>
                      <span style={{ color: "#64748b" }}>Compañía / Comisión</span>
                      <span style={{ textAlign: "right", fontSize: "0.8125rem" }}>
                        {formData.companyId
                          ? `${companies.find((c) => c.id === formData.companyId)?.name ?? ""} · ${
                              formData.commissionPercentage ??
                              companies.find((c) => c.id === formData.companyId)
                                ?.commissionPercentage ??
                              ""
                            }%`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}

