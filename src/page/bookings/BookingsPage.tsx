import { useEffect, useState, useMemo, useRef, type CSSProperties } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import {
  fetchBookingsWithPagination,
  getAvailableSchedulesByActivityId,
  checkAvailability,
  createBooking,
  updateBooking,
  cancelBooking,
  getBookingById,
  getBookingConfigurationById,
} from "@/services/bookingsService";
import { fetchPaymentTypesWithPagination } from "@/services/paymentTypesService";
import { fetchActivitiesWithPagination } from "@/services/activityService";
import { fetchCompaniesWithPagination } from "@/services/companiesService";
import { fetchBookingReferencePoints } from "@/services/referencePointsService";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/form/FormInput";
import { usePermissions } from "@/hooks/usePermissions";
import { FormCombobox, type SelectOption } from "@/components/form/FormCombobox";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import ScheduleCalendarPicker from "@/components/booking/ScheduleCalendarPicker";
import ActivityCardPicker from "@/components/booking/ActivityCardPicker";
import ParticipantCounter from "@/components/booking/ParticipantCounter";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
  BusFront,
  Check,
  Search,
} from "lucide-react";
import type {
  Booking,
  BookingFormData,
  BookingStatus,
  BookingOrderBy,
  Activity,
  Company,
  AvailableSchedule,
  AvailabilityInfo,
  PaymentType,
  ReferencePoint,
} from "@/types/entities";
import type { AxiosError } from "axios";

/**
 * Función helper para extraer el mensaje de error del formato del API
 *
 * Cambios recientes en esta página:
 * - Se agregó soporte para seleccionar tipo de pago (`paymentTypeId`) consumiendo `/api/payment-types`.
 * - El payload POST/PUT incluye montos (`subtotal`, `vatAmount`, `total`), `exempt` y `commissionAmount`
 *   alineados con el cálculo del asistente (precios por categoría, IVA y comisión).
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
const BOOKING_IVA_CONFIGURATION_ID =
  import.meta.env.VITE_BOOKING_IVA_CONFIG_ID || "615ba8af-0687-4cc1-88b4-30c076b30496";
const ONE_HOUR_MS = 60 * 60 * 1000;

export default function BookingsPage() {
  const { canWrite, canDelete } = usePermissions();
  const isMobile = useMediaQuery('(max-width: 767.98px)');
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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<BookingOrderBy>("schedule_asc");
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  // Debounce de la búsqueda: espera a que el usuario deje de escribir.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

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
  const [referencePoints, setReferencePoints] = useState<ReferencePoint[]>([]);
  const [useManualReferencePoint, setUseManualReferencePoint] = useState(false);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [ivaPercentage, setIvaPercentage] = useState(0);

  const [formData, setFormData] = useState<
    BookingFormData & {
      numberOfPeopleInput: string | number;
      adultCountInput: string | number;
      childCountInput: string | number;
      seniorCountInput: string | number;
      infantCountInput: string | number;
      exonerateTax: boolean;
    }
  >({
    activityScheduleId: "",
    companyId: null,
    paymentTypeId: null,
    referencePointId: null,
    referencePointDescription: null,
    transport: false,
    numberOfPeople: 1,
    numberOfPeopleInput: "",
    adultCount: 0,
    adultCountInput: "",
    childCount: 0,
    childCountInput: "",
    seniorCount: 0,
    seniorCountInput: "",
    infantCount: 0,
    infantCountInput: "",
    passengerCount: null,
    commissionPercentage: undefined,
    customerName: "",
    customerEmail: "",
    customerPhone: null,
    comment: "",
    exonerateTax: false,
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

  const referencePointOptions: SelectOption[] = useMemo(
    () =>
      referencePoints
        .filter((p) => p.status)
        .map((point) => ({
          value: point.id,
          label: point.description,
        })),
    [referencePoints]
  );

  const selectedReferencePointLabel = useMemo(() => {
    if (!formData.transport) return "—";

    if (useManualReferencePoint) {
      return formData.referencePointDescription?.trim() || "—";
    }

    return (
      referencePoints.find((point) => point.id === formData.referencePointId)?.description ??
      formData.referencePointDescription?.trim() ??
      "—"
    );
  }, [
    formData.referencePointDescription,
    formData.referencePointId,
    formData.transport,
    referencePoints,
    useManualReferencePoint,
  ]);

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    loadTaxConfiguration();
  }, []);

  useEffect(() => {
    loadBookings();
  }, [page, pageSize, statusFilter, search, orderBy]);

  // Cerrar el detalle con Escape.
  useEffect(() => {
    if (!detailBooking) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDetailBooking(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailBooking]);

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
      const [activitiesRes, companiesRes, paymentTypesRes, referencePointsRes] = await Promise.all([
        fetchActivitiesWithPagination(1, 100, true),
        fetchCompaniesWithPagination(1, 100, true),
        fetchPaymentTypesWithPagination(1, 50),
        fetchBookingReferencePoints(),
      ]);
      setActivities(activitiesRes.items);
      setCompanies(companiesRes.items);
      setPaymentTypes(paymentTypesRes.items);
      setReferencePoints(referencePointsRes);
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
        search: search || undefined,
        orderBy,
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

  const loadTaxConfiguration = async () => {
    try {
      const config = await getBookingConfigurationById(BOOKING_IVA_CONFIGURATION_ID);
      const parsed = parseFloat(String(config.value ?? "0"));
      setIvaPercentage(Number.isNaN(parsed) ? 0 : parsed);
    } catch (error) {
      console.error("Error al cargar configuración de IVA:", error);
      toast.error("No se pudo cargar la configuración de IVA. Se usará 0% temporalmente.");
      setIvaPercentage(0);
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
    setUseManualReferencePoint(false);
    setSelectedActivityId("");
    setSelectedScheduleId("");
    setSelectedSchedule(null);
    setAvailabilityInfo(null);
    setFormData({
      activityScheduleId: "",
      companyId: null,
      paymentTypeId: null,
      referencePointId: null,
      referencePointDescription: null,
      transport: false,
      numberOfPeople: 1,
      numberOfPeopleInput: "",
      adultCount: 0,
      adultCountInput: "",
      childCount: 0,
      childCountInput: "",
      seniorCount: 0,
      seniorCountInput: "",
      infantCount: 0,
      infantCountInput: "",
      passengerCount: null,
      commissionPercentage: undefined,
      customerName: "",
      customerEmail: "",
      customerPhone: null,
      comment: "",
      exonerateTax: false,
      status: "pending",
    });
    setBookingWizardStep(0);
    setShowBookingModal(true);
  };

  const canModifyBooking = (scheduledStart?: string | null): boolean => {
    if (!scheduledStart) return true;
    const startMs = new Date(scheduledStart).getTime();
    if (Number.isNaN(startMs)) return true;
    return startMs - Date.now() >= ONE_HOUR_MS;
  };

  const handleEditBooking = async (bookingRow: Booking) => {
    if (!canModifyBooking(bookingRow.scheduledStart)) {
      toast.error("No se puede modificar: falta menos de 1 hora para la fecha/hora de la reserva.");
      return;
    }

    try {
      setFormLoading(true);
      const booking = await getBookingById(bookingRow.id);
      setEditingBooking(booking);
      setUseManualReferencePoint(
        Boolean(
          booking.transport &&
            !booking.referencePointId &&
            booking.referencePointDescription?.trim()
        )
      );
      setSelectedActivityId(booking.activityId || "");
      setSelectedScheduleId(booking.activityScheduleId);
      
      // Cargar schedules para obtener los precios
      if (booking.activityId) {
        const schedules = await getAvailableSchedulesByActivityId(booking.activityId);
        // Refrescar el dropdown de fechas al abrir edición con datos actualizados
        setAvailableSchedules(schedules);
        const schedule = schedules.find((s) => s.id === booking.activityScheduleId);
        setSelectedSchedule(schedule || null);
      }
      
      setFormData({
        activityScheduleId: booking.activityScheduleId,
        companyId: booking.companyId ?? null,
        paymentTypeId: booking.paymentTypeId ?? null,
        referencePointId: booking.referencePointId ?? null,
        referencePointDescription: booking.referencePointDescription ?? null,
        transport: booking.transport,
        numberOfPeople: booking.numberOfPeople,
        numberOfPeopleInput: booking.numberOfPeople,
        adultCount: booking.adultCount ?? 0,
        adultCountInput: booking.adultCount ?? 0,
        childCount: booking.childCount ?? 0,
        childCountInput: booking.childCount ?? 0,
        seniorCount: booking.seniorCount ?? 0,
        seniorCountInput: booking.seniorCount ?? 0,
        infantCount: booking.infantCount ?? 0,
        infantCountInput: booking.infantCount ?? 0,
        passengerCount: booking.passengerCount ?? null,
        commissionPercentage: booking.commissionPercentage,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail ?? "",
        customerPhone: booking.customerPhone ?? null,
        comment: booking.comment ?? "",
        exonerateTax: booking.exempt ?? false,
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

  const handleCancelBooking = async (bookingRow: Booking) => {
    if (!canModifyBooking(bookingRow.scheduledStart)) {
      toast.error("No se puede modificar: falta menos de 1 hora para la fecha/hora de la reserva.");
      return;
    }

    const confirmed = await confirm({
      title: "Cancelar Reserva",
      message: "¿Estás seguro de que deseas cancelar esta reserva?",
      variant: "danger",
      confirmText: "Cancelar Reserva",
      cancelText: "No",
    });

    if (confirmed) {
      try {
        await cancelBooking(bookingRow.id);
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

  /** Tope ABSOLUTO de personas. Al editar, el API cuenta esta reserva como ocupada,
   *  así que sus propias plazas se suman de vuelta al cupo usable. */
  const maxParticipantsAllowed = useMemo(() => {
    if (!availabilityInfo) return undefined;
    // OJO: el API devuelve availableSpaces como texto ("4"); hay que forzar a número
    // o el "+" concatena en vez de sumar ("4" + 4 = "44").
    const free = Number(availabilityInfo.availableSpaces) || 0;
    const own = editingBooking ? Number(editingBooking.numberOfPeople) || 0 : 0;
    return free + own;
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

    /* maxParticipantsAllowed ya es el tope ABSOLUTO (al editar incluye las plazas de la
       propia reserva), así que se compara contra el total, no contra el cambio. */
    if (
      availabilityInfo &&
      maxParticipantsAllowed !== undefined &&
      numberOfPeopleValue > maxParticipantsAllowed
    ) {
      return editingBooking
        ? `No hay suficientes cupos. Puedes tener hasta ${maxParticipantsAllowed} participante(s) (${editingBooking.numberOfPeople} de tu reserva + ${availabilityInfo.availableSpaces} cupo(s) libre(s) en la actividad).`
        : `No hay suficientes cupos. Máximo permitido: ${maxParticipantsAllowed}.`;
    }

    const adultVal = parseCount(formData.adultCountInput);
    const childVal = parseCount(formData.childCountInput);
    const seniorVal = parseCount(formData.seniorCountInput);
    const infantVal = parseCount(formData.infantCountInput);

    if (adultVal < 0 || childVal < 0 || seniorVal < 0 || infantVal < 0) {
      return "Adultos, niños, adultos mayores e infantes no pueden ser negativos.";
    }

    const sum = adultVal + childVal + seniorVal + infantVal;
    if (sum <= 0) {
      return "La suma de adultos, niños, adultos mayores e infantes debe ser mayor a 0.";
    }
    if (sum !== numberOfPeopleValue) {
      return `La suma por categoría (${sum}) debe coincidir con el total (${numberOfPeopleValue}).`;
    }

    return null;
  };

  const validateWizardStep2 = (): string | null => {
    if (!formData.customerName.trim()) return "El nombre del cliente es obligatorio.";
    if (!formData.customerEmail.trim()) return "El email del cliente es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail.trim())) {
      return "El email del cliente debe tener un formato válido.";
    }

    if (!formData.paymentTypeId) return "Selecciona un tipo de pago.";

    if (formData.transport) {
      if (formData.passengerCount === null || formData.passengerCount === undefined) {
        return "Indica cuántos pasajeros requieren transporte.";
      }
      if (formData.passengerCount < 1) {
        return "La cantidad de pasajeros debe ser al menos 1.";
      }
      if (useManualReferencePoint) {
        if (!formData.referencePointDescription?.trim()) {
          return "Digita un punto de referencia para el transporte.";
        }
      } else if (!formData.referencePointId) {
        return "Selecciona un punto de referencia o activa la referencia manual.";
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

  // Refs para el auto-scroll guiado.
  const wizardTopRef = useRef<HTMLElement>(null);
  const transporteRef = useRef<HTMLDivElement>(null);

  // Al cambiar de paso, vuelve al inicio del asistente (empezar limpio).
  useEffect(() => {
    wizardTopRef.current?.scrollIntoView({ block: "start" });
  }, [bookingWizardStep]);

  /** El paso actual está completo (sin errores de validación). */
  const currentStepComplete =
    bookingWizardStep === 0
      ? validateWizardStep0() === null
      : bookingWizardStep === 1
        ? validateWizardStep1() === null
        : bookingWizardStep === 2
          ? validateWizardStep2() === null
          : true;

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((formData.customerEmail || "").trim());
  const clienteSectionOk = formData.customerName.trim() !== "" && emailLooksValid;
  const pagoSectionOk = !!formData.paymentTypeId;
  const transporteSectionOk =
    !formData.transport ||
    ((formData.passengerCount ?? 0) >= 1 &&
      (useManualReferencePoint
        ? (formData.referencePointDescription || "").trim() !== ""
        : !!formData.referencePointId));
  const companiaSectionOk =
    !!formData.companyId &&
    formData.commissionPercentage !== undefined &&
    formData.commissionPercentage !== null;

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

    const numberOfPeopleValue =
      typeof formData.numberOfPeopleInput === "string"
        ? parseInt(formData.numberOfPeopleInput.trim(), 10)
        : formData.numberOfPeopleInput;

    // Confirmación antes de crear/guardar (evita envíos por error).
    const confirmed = await confirm({
      title: editingBooking ? "Guardar cambios" : "Confirmar reserva",
      message: (
        <>
          {editingBooking ? "¿Guardar los cambios de esta reserva?" : "¿Crear esta reserva?"}
          <br />
          <br />
          <strong style={{ color: "#0f172a" }}>{selectedActivityLabel}</strong>
          <br />
          {scheduleSummaryRange}
          <br />
          {numberOfPeopleValue} persona(s) · Total <strong style={{ color: "#0f766e" }}>${bookingEstimatedGrandTotal.toFixed(2)}</strong>
        </>
      ),
      variant: "info",
      confirmText: editingBooking ? "Guardar" : "Confirmar reserva",
      cancelText: "Revisar",
    });
    if (!confirmed) return;

    const adultVal = parseCount(formData.adultCountInput);
    const childVal = parseCount(formData.childCountInput);
    const seniorVal = parseCount(formData.seniorCountInput);
    const infantVal = parseCount(formData.infantCountInput);

    let finalCommission: number | undefined;
    if (formData.companyId) {
      finalCommission =
        formData.commissionPercentage !== undefined && formData.commissionPercentage !== null
          ? formData.commissionPercentage
          : companies.find((c) => c.id === formData.companyId)?.commissionPercentage;
    }

    const roundMoney = (n: number) => Math.round(n * 100) / 100;

    try {
      setFormLoading(true);

      const subtotalPersist = roundMoney(bookingEstimatedTotal);
      const vatAmountPersist = roundMoney(bookingEstimatedTaxAmount);
      const totalPersist = roundMoney(bookingEstimatedGrandTotal);
      const commissionAmountPersist =
        formData.companyId != null ? roundMoney(bookingEstimatedCommissionAmount) : null;
      const selectedReferencePoint = referencePoints.find(
        (point) => point.id === formData.referencePointId
      );
      const referencePointDescription = formData.transport
        ? useManualReferencePoint
          ? formData.referencePointDescription?.trim() || null
          : selectedReferencePoint?.description ?? formData.referencePointDescription?.trim() ?? null
        : null;

      const payload: BookingFormData = {
        activityScheduleId: formData.activityScheduleId,
        companyId: formData.companyId ?? null,
        paymentTypeId: formData.paymentTypeId ?? null,
        referencePointId:
          formData.transport && !useManualReferencePoint ? formData.referencePointId ?? null : null,
        referencePointDescription,
        transport: formData.transport || false,
        numberOfPeople: numberOfPeopleValue,
        adultCount: adultVal,
        childCount: childVal,
        seniorCount: seniorVal,
        infantCount: infantVal,
        passengerCount: formData.transport ? formData.passengerCount : null,
        commissionPercentage: finalCommission,
        subtotal: subtotalPersist,
        vatAmount: vatAmountPersist,
        total: totalPersist,
        exempt: formData.exonerateTax,
        commissionAmount: commissionAmountPersist,
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim().toLowerCase(),
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

  const effectiveCommissionPercentage = useMemo(() => {
    if (!formData.companyId) return 0;
    const configured =
      formData.commissionPercentage !== undefined && formData.commissionPercentage !== null
        ? formData.commissionPercentage
        : companies.find((c) => c.id === formData.companyId)?.commissionPercentage ?? 0;
    const normalized = Number(configured);
    if (Number.isNaN(normalized)) return 0;
    return Math.min(100, Math.max(0, normalized));
  }, [formData.companyId, formData.commissionPercentage, companies]);

  const bookingEstimatedCommissionAmount = useMemo(() => {
    if (!formData.companyId) return 0;
    return bookingEstimatedTotal * (effectiveCommissionPercentage / 100);
  }, [bookingEstimatedTotal, effectiveCommissionPercentage, formData.companyId]);

  const bookingEstimatedTaxableBase = useMemo(() => Math.max(0, bookingEstimatedTotal), [bookingEstimatedTotal]);

  const bookingEstimatedTaxAmount = useMemo(() => {
    if (formData.exonerateTax) return 0;
    return bookingEstimatedTaxableBase * (ivaPercentage / 100);
  }, [bookingEstimatedTaxableBase, ivaPercentage, formData.exonerateTax]);

  const bookingEstimatedTaxExoneratedAmount = useMemo(
    () => bookingEstimatedTaxableBase * (ivaPercentage / 100),
    [bookingEstimatedTaxableBase, ivaPercentage]
  );

  const bookingEstimatedGrandTotal = useMemo(
    () => bookingEstimatedTotal + bookingEstimatedTaxAmount,
    [bookingEstimatedTotal, bookingEstimatedTaxAmount]
  );

  /** Fija el valor absoluto de una categoría, respetando el máximo de cupos. */
  const applyParticipant = (
    field: "adult" | "child" | "senior" | "infant",
    nextRaw: number
  ) => {
    const current = {
      adult: parseCount(formData.adultCountInput),
      child: parseCount(formData.childCountInput),
      senior: parseCount(formData.seniorCountInput),
      infant: parseCount(formData.infantCountInput),
    };
    const othersTotal =
      current.adult + current.child + current.senior + current.infant - current[field];
    const cap = maxParticipantsAllowed ?? Number.POSITIVE_INFINITY;
    const maxForField = Math.max(0, cap - othersTotal);
    const next = Number.isFinite(nextRaw) ? nextRaw : 0;
    current[field] = Math.min(Math.max(0, Math.floor(next)), maxForField);
    const total = current.adult + current.child + current.senior + current.infant;
    setFormData((prev) => ({
      ...prev,
      adultCountInput: current.adult,
      childCountInput: current.child,
      seniorCountInput: current.senior,
      infantCountInput: current.infant,
      numberOfPeople: total,
      numberOfPeopleInput: total > 0 ? total : "",
      passengerCount:
        prev.transport && total > 0 && (!prev.passengerCount || prev.passengerCount < total)
          ? total
          : prev.passengerCount,
    }));
  };

  /** Suma o resta participantes de una categoría (botones − / +). */
  const changeParticipant = (
    field: "adult" | "child" | "senior" | "infant",
    delta: number
  ) => {
    applyParticipant(field, parseCount(formData[`${field}CountInput` as keyof typeof formData] as string | number) + delta);
  };

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

  const stepIntroStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #dbeafe",
    background: "linear-gradient(135deg, #f8fbff 0%, #eefcf6 100%)",
    color: "#334155",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
  };

  const stepIntroIconStyle: CSSProperties = {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    background: "#0f766e",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const stepTwoGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(320px, 0.78fr)",
    gap: "16px",
    alignItems: "start",
  };

  const bookingFormCardStyle: CSSProperties = {
    borderRadius: "16px",
    border: "1px solid #dbe3ef",
    background: "#ffffff",
    padding: "16px",
    boxShadow: "0 14px 38px rgba(15, 23, 42, 0.06)",
  };

  const sectionHeaderStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "14px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e2e8f0",
  };

  const sectionEyebrowStyle: CSSProperties = {
    display: "block",
    marginBottom: "4px",
    fontSize: "0.6875rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#0f766e",
  };

  const sectionTitleStyle: CSSProperties = {
    margin: 0,
    color: "#0f172a",
    fontSize: "1rem",
    fontWeight: 800,
    lineHeight: 1.25,
  };

  const sectionHintStyle: CSSProperties = {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "0.8125rem",
    lineHeight: 1.4,
  };

  const sectionIconStyle: CSSProperties = {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "#ecfdf5",
    color: "#0f766e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const fieldGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  };

  const transportPanelStyle: CSSProperties = {
    borderRadius: "14px",
    border: formData.transport ? "1px solid #99f6e4" : "1px dashed #cbd5e1",
    background: formData.transport
      ? "linear-gradient(135deg, #f0fdfa 0%, #ffffff 64%)"
      : "#f8fafc",
    padding: "14px",
    marginBottom: "14px",
  };

  const transportFieldsGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "0.72fr 1fr",
    gap: "12px",
    marginTop: "12px",
    alignItems: "start",
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
      key: "total",
      header: "Total",
      width: "110px",
      align: "right",
      render: (b) => (
        <strong style={{ color: "#0f766e" }}>{b.total != null ? `$${formatPrice(b.total)}` : "—"}</strong>
      ),
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
      width: "150px",
      align: "center",
      render: (b) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleEditBooking(b); }}
              icon={<Edit size={16} />}
              style={{ padding: "4px 8px" }}
              disabled={!canModifyBooking(b.scheduledStart)}
              title={
                !canModifyBooking(b.scheduledStart)
                  ? "No editable: falta menos de 1 hora"
                  : "Editar"
              }
            />
          )}
          {canDelete && b.status !== "cancelled" && (
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleCancelBooking(b); }}
              icon={<X size={16} />}
              style={{ padding: "4px 8px" }}
              disabled={!canModifyBooking(b.scheduledStart)}
              title={
                !canModifyBooking(b.scheduledStart)
                  ? "No modificable: falta menos de 1 hora"
                  : "Cancelar reserva"
              }
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

  const orderOptions: SelectOption[] = useMemo(
    () => [
      { value: "schedule_asc", label: "Fecha del tour (próximas primero)" },
      { value: "schedule_desc", label: "Fecha del tour (lejanas primero)" },
      { value: "created_desc", label: "Creación (más recientes)" },
      { value: "created_asc", label: "Creación (más antiguas)" },
      { value: "customer_asc", label: "Cliente (A–Z)" },
    ],
    []
  );

  const headerExtra = (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div style={{ minWidth: "230px", flex: 2, marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#1e293b",
          }}
        >
          Buscar
        </label>
        <div className="ap-search-wrap" style={{ marginBottom: 0 }}>
          <Search size={16} className="ap-search-icon" />
          <input
            className="ap-search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cliente, actividad, compañía o email..."
            disabled={loading}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Limpiar búsqueda"
              style={{
                position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8",
                display: "inline-flex", alignItems: "center",
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>
      <div style={{ minWidth: "170px", flex: 1 }}>
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
      <div style={{ minWidth: "200px", flex: 1 }}>
        <FormCombobox
          label="Ordenar por"
          value={orderBy}
          onChange={(value) => {
            setOrderBy((String(value) || "schedule_asc") as BookingOrderBy);
            setPage(1);
          }}
          options={orderOptions}
          placeholder="Ordenar por"
          searchPlaceholder="Buscar..."
          fullWidth
          disabled={loading}
        />
      </div>
      {canWrite && (
        <Button
          onClick={handleCreateBooking}
          icon={<Plus size={18} />}
          size="md"
          style={{ height: "40px", marginBottom: "16px" }}
        >
          Nueva reserva
        </Button>
      )}
    </div>
  );

  return (
    <>
      <TableCard<Booking>
        title="Reservas de Actividades"
        loading={loading}
        data={bookings}
        columns={columns.filter(col => col.key !== "actions" || canWrite || canDelete)}
        rowKey={(b) => b.id}
        emptyText="No hay reservas aún"
        headerExtra={headerExtra}
        onRowClick={(b) => setDetailBooking(b)}
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
                    className={currentStepComplete ? "bk-next-ready" : ""}
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
            <nav ref={wizardTopRef} aria-label="Pasos del asistente de reserva" style={{ marginBottom: "22px" }}>
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

            <div className={`bk-layout ${bookingWizardStep === BOOKING_WIZARD_LAST_STEP ? "bk-layout--full" : ""}`}>
              <div className="bk-main">

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
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#1e293b",
                    }}
                  >
                    Actividad
                    <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
                  </label>
                  {catalogsLoading ? (
                    <div className="ap-empty">Cargando actividades...</div>
                  ) : (
                    <ActivityCardPicker
                      activities={activities}
                      value={selectedActivityId}
                      onChange={(id) => {
                        setSelectedActivityId(id);
                        setSelectedScheduleId("");
                        setSelectedSchedule(null);
                        setAvailabilityInfo(null);
                        setFormData((prev) => ({ ...prev, activityScheduleId: "" }));
                      }}
                      disabled={formLoading || !!editingBooking}
                      formatPrice={formatPrice}
                    />
                  )}
                </div>

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
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "#1e293b",
                        }}
                      >
                        Fecha y hora
                        <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
                      </label>
                      <ScheduleCalendarPicker
                        schedules={availableSchedules}
                        value={selectedScheduleId}
                        onChange={(id) => {
                          setSelectedScheduleId(id);
                          setFormData((prev) => ({
                            ...prev,
                            adultCountInput: "",
                            childCountInput: "",
                            seniorCountInput: "",
                            infantCountInput: "",
                          }));
                        }}
                        disabled={formLoading}
                        formatPrice={formatPrice}
                      />
                    </div>
                  </>
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
                <p className="pc-intro">
                  Ajusta cuántas personas van en cada categoría. El total y el precio se calculan
                  solos y se muestran en el panel «Tu reserva».
                </p>
                {!availabilityInfo ? (
                  <div className="ap-empty">Elige una fecha y horario en el paso anterior para continuar.</div>
                ) : (
                  (() => {
                    const adults = parseCount(formData.adultCountInput);
                    const children = parseCount(formData.childCountInput);
                    const seniors = parseCount(formData.seniorCountInput);
                    const infants = parseCount(formData.infantCountInput);
                    const total = adults + children + seniors + infants;
                    const cap = maxParticipantsAllowed ?? Number.POSITIVE_INFINITY;
                    const atMax = total >= cap;
                    return (
                      <>
                        <div className="pc-head">
                          <span className="pc-head-title">Participantes</span>
                          <span className={`pc-total-badge ${atMax ? "pc-total-badge--full" : ""}`}>
                            {total}{maxParticipantsAllowed !== undefined ? ` de ${maxParticipantsAllowed}` : ""} cupos
                          </span>
                        </div>
                        <div className="pc-list">
                          <ParticipantCounter
                            label="Adultos"
                            pricePerPerson={selectedSchedule?.adultPrice}
                            count={adults}
                            onDec={() => changeParticipant("adult", -1)}
                            onInc={() => changeParticipant("adult", 1)}
                            onSet={(v) => applyParticipant("adult", v)}
                            incDisabled={formLoading || atMax}
                            formatPrice={formatPrice}
                          />
                          <ParticipantCounter
                            label="Niños"
                            pricePerPerson={selectedSchedule?.childPrice}
                            count={children}
                            onDec={() => changeParticipant("child", -1)}
                            onInc={() => changeParticipant("child", 1)}
                            onSet={(v) => applyParticipant("child", v)}
                            incDisabled={formLoading || atMax}
                            formatPrice={formatPrice}
                          />
                          <ParticipantCounter
                            label="Mayores"
                            pricePerPerson={selectedSchedule?.seniorPrice}
                            count={seniors}
                            onDec={() => changeParticipant("senior", -1)}
                            onInc={() => changeParticipant("senior", 1)}
                            onSet={(v) => applyParticipant("senior", v)}
                            incDisabled={formLoading || atMax}
                            formatPrice={formatPrice}
                          />
                          <ParticipantCounter
                            label="Infantes"
                            pricePerPerson={0}
                            note="Menores de 6 años"
                            count={infants}
                            onDec={() => changeParticipant("infant", -1)}
                            onInc={() => changeParticipant("infant", 1)}
                            onSet={(v) => applyParticipant("infant", v)}
                            incDisabled={formLoading || atMax}
                            formatPrice={formatPrice}
                          />
                        </div>
                        {maxParticipantsAllowed !== undefined && (
                          <div className="pc-hint">
                            {atMax
                              ? "Alcanzaste el máximo de cupos disponibles."
                              : `Puedes agregar hasta ${maxParticipantsAllowed} ${maxParticipantsAllowed === 1 ? "persona" : "personas"}${editingBooking ? " (incluye las de tu reserva)" : ""}.`}
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            )}

            {bookingWizardStep === 2 && (
              <div className="cp-step">
                <p className="pc-intro">
                  Completa el contacto y el pago. Agrega transporte o comisión solo si aplica.
                </p>

                {/* Cliente */}
                <section className="sm-card">
                  <div className="sm-card-head">
                    <span className="sm-icon"><Users size={16} /></span>
                    <span className="sm-card-title">Cliente</span>
                    {clienteSectionOk && <span className="cp-check"><Check size={13} /></span>}
                  </div>
                  <div className="cp-fields">
                    <FormInput
                      label="Nombre"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      required
                      fullWidth
                      disabled={formLoading}
                    />
                    <div className="cp-grid2">
                      <FormInput
                        label="Email"
                        type="email"
                        value={formData.customerEmail || ""}
                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                        required
                        fullWidth
                        disabled={formLoading}
                        placeholder="correo@ejemplo.com"
                      />
                      <FormInput
                        label="Teléfono"
                        value={formData.customerPhone || ""}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value.trim() || null })}
                        fullWidth
                        disabled={formLoading}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </section>

                {/* Pago */}
                <section className="sm-card">
                  <div className="sm-card-head">
                    <span className="sm-icon"><Wallet size={16} /></span>
                    <span className="sm-card-title">Pago</span>
                    {pagoSectionOk && <span className="cp-check"><Check size={13} /></span>}
                  </div>
                  <div className="cp-fields">
                    <div>
                      <div className="cp-field-label">Método de pago<span>*</span></div>
                      <div className="cp-pay-grid">
                        {paymentTypes.map((pt) => (
                          <button
                            key={pt.id}
                            type="button"
                            className={`cp-pay-chip ${formData.paymentTypeId === pt.id ? "cp-pay-chip--active" : ""}`}
                            onClick={() => {
                              setFormData({ ...formData, paymentTypeId: pt.id });
                              // Revela la siguiente sección (transporte) sin brusquedad.
                              setTimeout(() => transporteRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
                            }}
                            disabled={formLoading}
                          >
                            {pt.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <FormInput
                      label="Comentario"
                      value={formData.comment || ""}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      fullWidth
                      disabled={formLoading}
                      placeholder="Nota interna (opcional)"
                    />
                  </div>
                </section>

                {/* Transporte */}
                <section className="sm-card" ref={transporteRef}>
                  <div className="cp-toggle-head">
                    <span className="sm-icon"><BusFront size={16} /></span>
                    <span className="sm-card-title">Transporte</span>
                    <div className="cp-head-right">
                      {formData.transport && transporteSectionOk && <span className="cp-check"><Check size={13} /></span>}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.transport || false}
                      aria-label="Requiere transporte"
                      className={`cp-switch ${formData.transport ? "cp-switch--on" : ""}`}
                      disabled={formLoading}
                      onClick={() => {
                        const needsTransport = !formData.transport;
                        if (!needsTransport) setUseManualReferencePoint(false);
                        setFormData({
                          ...formData,
                          transport: needsTransport,
                          referencePointId: needsTransport ? formData.referencePointId : null,
                          referencePointDescription: needsTransport ? formData.referencePointDescription : null,
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
                    />
                    </div>
                  </div>

                  {formData.transport ? (
                    <div className="cp-transport-fields">
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
                          setFormData({ ...formData, passengerCount: value !== "" ? parseInt(value, 10) : null });
                        }}
                        required
                        fullWidth
                        disabled={formLoading}
                        placeholder="Nº"
                        helperText="Por defecto coincide con el total de personas."
                      />

                      <div className="cp-manual-toggle">
                        <FormCheckbox
                          label="Digitar referencia manual"
                          checked={useManualReferencePoint}
                          onChange={(e) => {
                            const manual = e.target.checked;
                            setUseManualReferencePoint(manual);
                            setFormData({
                              ...formData,
                              referencePointId: manual ? null : formData.referencePointId,
                              referencePointDescription: manual
                                ? formData.referencePointDescription ?? ""
                                : referencePoints.find((point) => point.id === formData.referencePointId)?.description ?? null,
                            });
                          }}
                          disabled={formLoading}
                          helperText="Si no existe en catálogo, escribe la referencia."
                        />
                      </div>

                      {useManualReferencePoint ? (
                        <FormInput
                          label="Punto de referencia"
                          value={formData.referencePointDescription || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, referencePointId: null, referencePointDescription: e.target.value })
                          }
                          required
                          fullWidth
                          disabled={formLoading}
                          placeholder="Ej. Hotel, entrada principal"
                        />
                      ) : (
                        <FormCombobox
                          label="Punto de referencia"
                          value={formData.referencePointId || ""}
                          onChange={(value) => {
                            const referencePointId = value ? String(value) : null;
                            setFormData({
                              ...formData,
                              referencePointId,
                              referencePointDescription:
                                referencePoints.find((point) => point.id === referencePointId)?.description ?? null,
                            });
                          }}
                          options={referencePointOptions}
                          placeholder="Selecciona un punto"
                          searchPlaceholder="Buscar punto..."
                          required
                          fullWidth
                          disabled={formLoading || catalogsLoading}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="cp-hint">Actívalo si el cliente necesita transporte (pasajeros y punto de recogida).</div>
                  )}
                </section>

                {/* Compañía / comisión */}
                <section className="sm-card">
                  <div className="sm-card-head">
                    <span className="sm-icon"><ClipboardCheck size={16} /></span>
                    <span className="sm-card-title">Compañía y comisión</span>
                    {companiaSectionOk ? (
                      <span className="cp-check" style={{ marginLeft: "auto" }}><Check size={13} /></span>
                    ) : (
                      <span className="cp-optional">Opcional</span>
                    )}
                  </div>
                  <div className="cp-fields">
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
                          formData.commissionPercentage !== undefined && formData.commissionPercentage !== null
                            ? formData.commissionPercentage
                            : companies.find((c) => c.id === formData.companyId)?.commissionPercentage ?? ""
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, commissionPercentage: value !== "" ? parseFloat(value) : undefined });
                        }}
                        required
                        fullWidth
                        disabled={formLoading}
                        placeholder={`Def. ${companies.find((c) => c.id === formData.companyId)?.commissionPercentage}%`}
                        helperText="Puedes sobrescribir el % de la compañía."
                      />
                    )}
                  </div>
                </section>
              </div>
            )}

            {bookingWizardStep === BOOKING_WIZARD_LAST_STEP && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p className="pc-intro" style={{ margin: 0 }}>
                  Revisa los datos antes de confirmar. Puedes volver con «Atrás» o tocando un paso de arriba.
                </p>
                {/* Franja-resumen: lo esencial de un vistazo */}
                <div className="sm-hero">
                  <div>
                    <div className="sm-hero-title">{selectedActivityLabel}</div>
                    <div className="sm-hero-sub">
                      <CalendarRange size={14} />
                      {scheduleSummaryRange}
                    </div>
                  </div>
                  <div className="sm-hero-total">
                    <div className="sm-hero-total-label">Total estimado</div>
                    <div className="sm-hero-total-value">${bookingEstimatedGrandTotal.toFixed(2)}</div>
                  </div>
                </div>

                <div className="sm-grid">
                  {/* Actividad y horario */}
                  <div className="sm-card">
                    <div className="sm-card-head">
                      <span className="sm-icon"><CalendarRange size={16} /></span>
                      <span className="sm-card-title">Actividad y horario</span>
                    </div>
                    <div className="sm-row">
                      <span className="sm-label">Actividad</span>
                      <span className="sm-value">{selectedActivityLabel}</span>
                    </div>
                    <div className="sm-row">
                      <span className="sm-label">Horario</span>
                      <span className="sm-value sm-value--sub">{scheduleSummaryRange}</span>
                    </div>
                    {availabilityInfo && (
                      <div className="sm-row">
                        <span className="sm-label">Cupos</span>
                        <span className={`sm-chip ${availabilityInfo.availableSpaces > 0 ? "sm-chip--ok" : "sm-chip--danger"}`}>
                          {availabilityInfo.availableSpaces > 0
                            ? `${availabilityInfo.availableSpaces} libres de ${availabilityInfo.partySize}`
                            : "Agotado"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Participantes + recibo */}
                  <div className="sm-card">
                    <div className="sm-card-head">
                      <span className="sm-icon"><Users size={16} /></span>
                      <span className="sm-card-title">Participantes</span>
                    </div>
                    <div className="sm-row">
                      <span className="sm-label">Total personas</span>
                      <span className="sm-value">
                        {typeof formData.numberOfPeopleInput === "string" &&
                        formData.numberOfPeopleInput.trim() !== ""
                          ? parseInt(formData.numberOfPeopleInput.trim(), 10)
                          : formData.numberOfPeople}
                      </span>
                    </div>
                    <div className="sm-row">
                      <span className="sm-label">Adultos / Niños / Mayores</span>
                      <span className="sm-value">
                        {parseCount(formData.adultCountInput)} / {parseCount(formData.childCountInput)} / {parseCount(formData.seniorCountInput)}
                      </span>
                    </div>
                    {selectedSchedule && (
                      <div className="sm-receipt">
                        <div className="sm-receipt-row">
                          <span>Subtotal</span>
                          <span>${bookingEstimatedTotal.toFixed(2)}</span>
                        </div>
                        <div className="sm-receipt-row">
                          <span>IVA ({ivaPercentage.toFixed(2)}%)</span>
                          <span>${bookingEstimatedTaxAmount.toFixed(2)}</span>
                        </div>
                        {formData.exonerateTax && (
                          <div className="sm-receipt-row sm-receipt-row--exo">
                            <span>IVA exonerado</span>
                            <span>-${bookingEstimatedTaxExoneratedAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="sm-receipt-total">
                          <span className="sm-receipt-total-label">Total final</span>
                          <span className="sm-receipt-total-value">${bookingEstimatedGrandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    {selectedSchedule && (
                      <div style={{ marginTop: "12px" }}>
                        <FormCheckbox
                          label={`Exonerar impuesto (IVA ${ivaPercentage.toFixed(2)}%)`}
                          checked={formData.exonerateTax}
                          onChange={(e) => setFormData({ ...formData, exonerateTax: e.target.checked })}
                          disabled={formLoading}
                        />
                      </div>
                    )}
                  </div>

                  {/* Cliente y pago */}
                  <div className="sm-card">
                    <div className="sm-card-head">
                      <span className="sm-icon"><Wallet size={16} /></span>
                      <span className="sm-card-title">Cliente y pago</span>
                    </div>
                    <div className="sm-row">
                      <span className="sm-label">Nombre</span>
                      <span className="sm-value">{formData.customerName || "—"}</span>
                    </div>
                    <div className="sm-row">
                      <span className="sm-label">Contacto</span>
                      <span className="sm-value sm-value--sub">
                        {[formData.customerEmail, formData.customerPhone].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </div>
                    <div className="sm-row">
                      <span className="sm-label">Pago</span>
                      <span className="sm-value">{paymentTypes.find((p) => p.id === formData.paymentTypeId)?.name ?? "—"}</span>
                    </div>
                    <div className="sm-row">
                      <span className="sm-label">Impuesto</span>
                      <span className="sm-value">{formData.exonerateTax ? "Exonerado" : `IVA ${ivaPercentage.toFixed(2)}%`}</span>
                    </div>
                    {formData.comment?.trim() ? (
                      <div className="sm-note">
                        <span className="sm-note-label">Nota: </span>{formData.comment}
                      </div>
                    ) : null}
                  </div>

                  {/* Extras */}
                  <div className="sm-card">
                    <div className="sm-card-head">
                      <span className="sm-icon"><BusFront size={16} /></span>
                      <span className="sm-card-title">Extras</span>
                    </div>
                    <div className="sm-row">
                      <span className="sm-label">Transporte</span>
                      <span className="sm-value">
                        {formData.transport ? `Sí (${formData.passengerCount ?? "—"} pasajeros)` : "No"}
                      </span>
                    </div>
                    {formData.transport && (
                      <div className="sm-row">
                        <span className="sm-label">Punto de referencia</span>
                        <span className="sm-value">{selectedReferencePointLabel}</span>
                      </div>
                    )}
                    <div className="sm-row">
                      <span className="sm-label">Compañía / Comisión</span>
                      <span className="sm-value sm-value--sub">
                        {formData.companyId
                          ? `${companies.find((c) => c.id === formData.companyId)?.name ?? ""} · ${
                              formData.commissionPercentage ??
                              companies.find((c) => c.id === formData.companyId)?.commissionPercentage ??
                              ""
                            }%`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

              </div>{/* /bk-main */}

              {bookingWizardStep < BOOKING_WIZARD_LAST_STEP && (() => {
                const railAdults = parseCount(formData.adultCountInput);
                const railChildren = parseCount(formData.childCountInput);
                const railSeniors = parseCount(formData.seniorCountInput);
                const railInfants = parseCount(formData.infantCountInput);
                const railTotalPeople = railAdults + railChildren + railSeniors + railInfants;
                const railBreakdown = [
                  railAdults ? `${railAdults} ad.` : null,
                  railChildren ? `${railChildren} ni.` : null,
                  railSeniors ? `${railSeniors} may.` : null,
                  railInfants ? `${railInfants} inf.` : null,
                ].filter(Boolean).join(" · ");
                const railShowReceipt = !!selectedSchedule && railTotalPeople > 0;
                return (
                  <aside className="bk-rail">
                    <div className="bk-rail-card">
                      <div className="bk-rail-head">
                        <ClipboardCheck size={14} />
                        Tu reserva
                      </div>
                      <div className="bk-rail-body">
                        {!selectedActivityId ? (
                          <div className="bk-rail-empty">Aún no has elegido una actividad.</div>
                        ) : (
                          <>
                            <div className="bk-rail-block">
                              <span className="bk-rail-block-label">Actividad</span>
                              <span className="bk-rail-activity">{selectedActivityLabel}</span>
                              {selectedSchedule && (
                                <span className="bk-rail-line">
                                  <CalendarRange size={13} />
                                  {scheduleSummaryRange}
                                </span>
                              )}
                            </div>

                            {availabilityInfo && (
                              <span className="bk-rail-chip">
                                {availabilityInfo.availableSpaces > 0
                                  ? `${availabilityInfo.availableSpaces} cupos libres`
                                  : "Agotado"}
                              </span>
                            )}

                            {railTotalPeople > 0 && (
                              <>
                                <div className="bk-rail-divider" />
                                <div className="bk-rail-block">
                                  <span className="bk-rail-block-label">Participantes</span>
                                  <span className="bk-rail-line">
                                    <Users size={13} />
                                    {railTotalPeople} {railTotalPeople === 1 ? "persona" : "personas"}
                                    {railBreakdown ? ` · ${railBreakdown}` : ""}
                                  </span>
                                </div>
                              </>
                            )}

                            <div className="bk-rail-divider" />
                            {railShowReceipt ? (
                              <div>
                                <div className="bk-rail-receipt-row">
                                  <span>Subtotal</span>
                                  <span>${bookingEstimatedTotal.toFixed(2)}</span>
                                </div>
                                <div className="bk-rail-receipt-row">
                                  <span>IVA ({ivaPercentage.toFixed(2)}%)</span>
                                  <span>${bookingEstimatedTaxAmount.toFixed(2)}</span>
                                </div>
                                {formData.exonerateTax && (
                                  <div className="bk-rail-receipt-row bk-rail-receipt-row--exo">
                                    <span>IVA exonerado</span>
                                    <span>-${bookingEstimatedTaxExoneratedAmount.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="bk-rail-total">
                                  <span className="bk-rail-total-label">Total</span>
                                  <span className="bk-rail-total-value">${bookingEstimatedGrandTotal.toFixed(2)}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="bk-rail-empty">
                                {selectedSchedule ? "Agrega participantes para ver el total." : "Elige un horario para ver el total."}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </aside>
                );
              })()}
            </div>{/* /bk-layout */}
          </form>
        )}
      </Modal>

      {detailBooking && (
        <div className="bkd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetailBooking(null); }}>
          <div className="bkd-panel" role="dialog" aria-modal="true" aria-label="Detalle de la reserva">
            <div className="bkd-head">
              <ClipboardCheck size={18} style={{ color: "#0f766e" }} />
              <h3 className="bkd-title">Detalle de la reserva</h3>
              {getStatusBadge(detailBooking.status)}
              <button type="button" className="bkd-close" onClick={() => setDetailBooking(null)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="bkd-body">
              <div>
                <div className="bkd-section-title"><CalendarRange size={13} /> Actividad</div>
                <div className="sm-row"><span className="sm-label">Actividad</span><span className="sm-value">{detailBooking.activityTitle || "—"}</span></div>
                <div className="sm-row"><span className="sm-label">Fecha / hora</span><span className="sm-value sm-value--sub">{detailBooking.scheduledStart ? dateTimeFormatter.format(new Date(detailBooking.scheduledStart)) : "—"}</span></div>
              </div>

              <div>
                <div className="bkd-section-title"><Users size={13} /> Participantes</div>
                <div className="sm-row"><span className="sm-label">Total personas</span><span className="sm-value">{detailBooking.numberOfPeople}</span></div>
                <div className="sm-row"><span className="sm-label">Adultos / Niños / Mayores / Infantes</span><span className="sm-value">{detailBooking.adultCount ?? 0} / {detailBooking.childCount ?? 0} / {detailBooking.seniorCount ?? 0} / {detailBooking.infantCount ?? 0}</span></div>
              </div>

              <div>
                <div className="bkd-section-title"><Wallet size={13} /> Cliente y pago</div>
                <div className="sm-row"><span className="sm-label">Nombre</span><span className="sm-value">{detailBooking.customerName || "—"}</span></div>
                <div className="sm-row"><span className="sm-label">Contacto</span><span className="sm-value sm-value--sub">{[detailBooking.customerEmail, detailBooking.customerPhone].filter(Boolean).join(" · ") || "—"}</span></div>
                <div className="sm-row"><span className="sm-label">Pago</span><span className="sm-value">{detailBooking.paymentTypeName || "—"}</span></div>
                {detailBooking.comment?.trim() ? (
                  <div className="sm-note">{detailBooking.comment}</div>
                ) : null}
              </div>

              <div>
                <div className="bkd-section-title"><Wallet size={13} /> Cobro</div>
                <div className="sm-receipt" style={{ marginTop: 0 }}>
                  <div className="sm-receipt-row"><span>Subtotal</span><span>{detailBooking.subtotal != null ? `$${formatPrice(detailBooking.subtotal)}` : "—"}</span></div>
                  <div className="sm-receipt-row"><span>IVA{detailBooking.exempt ? " (exonerado)" : ""}</span><span>{detailBooking.vatAmount != null ? `$${formatPrice(detailBooking.vatAmount)}` : "—"}</span></div>
                  <div className="sm-receipt-total"><span className="sm-receipt-total-label">Total</span><span className="sm-receipt-total-value">{detailBooking.total != null ? `$${formatPrice(detailBooking.total)}` : "—"}</span></div>
                </div>
              </div>

              <div>
                <div className="bkd-section-title"><BusFront size={13} /> Extras</div>
                <div className="sm-row"><span className="sm-label">Transporte</span><span className="sm-value">{detailBooking.transport ? `Sí${detailBooking.passengerCount ? ` (${detailBooking.passengerCount} pas.)` : ""}` : "No"}</span></div>
                {detailBooking.transport && (
                  <div className="sm-row"><span className="sm-label">Punto de referencia</span><span className="sm-value sm-value--sub">{detailBooking.referencePointDescription || "—"}</span></div>
                )}
                <div className="sm-row"><span className="sm-label">Compañía</span><span className="sm-value sm-value--sub">{detailBooking.companyName || "—"}</span></div>
                {detailBooking.companyName && (
                  <>
                    <div className="sm-row"><span className="sm-label">Comisión</span><span className="sm-value">{detailBooking.commissionPercentage}%{detailBooking.commissionAmount != null ? ` · $${formatPrice(detailBooking.commissionAmount)}` : ""}</span></div>
                  </>
                )}
              </div>
            </div>

            <div className="bkd-foot">
              <Button variant="outline" onClick={() => setDetailBooking(null)}>Cerrar</Button>
              <div style={{ display: "flex", gap: ".6rem", marginLeft: "auto" }}>
                {canWrite && (
                  <Button
                    variant="outline"
                    icon={<Edit size={16} />}
                    disabled={!canModifyBooking(detailBooking.scheduledStart)}
                    onClick={() => { const b = detailBooking; setDetailBooking(null); handleEditBooking(b); }}
                  >
                    Editar
                  </Button>
                )}
                {canDelete && detailBooking.status !== "cancelled" && (
                  <Button
                    variant="danger"
                    icon={<X size={16} />}
                    disabled={!canModifyBooking(detailBooking.scheduledStart)}
                    onClick={() => { const b = detailBooking; setDetailBooking(null); handleCancelBooking(b); }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialogComponent />
    </>
  );
}

