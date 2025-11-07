'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import '@/css/react-day-picker.css';
import { useAuth } from '@/components/Auth/AuthProvider';
import OrderReserveFlipCard from '@/components/Order/OrderReserveFlipCard';
import { DEFAULT_BRANCH_ID } from '@/lib/reservations';

const MAX_PEOPLE = 15;
const BRANCH_ID = DEFAULT_BRANCH_ID;
const BRANCH_LABEL = 'Matriz Roma Norte';
const QR_EXPIRATION_MINUTES = 30;
const MAX_ACTIVE_RESERVATIONS = 3;
const QR_IMAGE_SIZE = '220x220';
const QR_API_URL = 'https://api.qrserver.com/v1/create-qr-code/';
const RESERVATION_VISUALS: Record<
  string,
  { label: string; badgeClass: string; dotClass: string; textClass: string }
> = {
  active: {
    label: 'Activa',
    badgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-200',
  },
  past: {
    label: 'Concluida',
    badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700 dark:text-amber-200',
  },
  failed: {
    label: 'No completada',
    badgeClass: 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-100',
    dotClass: 'bg-orange-500',
    textClass: 'text-orange-700 dark:text-orange-200',
  },
  pending: {
    label: 'Pendiente',
    badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700 dark:text-amber-200',
  },
  confirmed: {
    label: 'Confirmada',
    badgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-200',
  },
  completed: {
    label: 'Completada',
    badgeClass: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-100',
    dotClass: 'bg-cyan-500',
    textClass: 'text-cyan-700 dark:text-cyan-200',
  },
  cancelled: {
    label: 'Cancelada',
    badgeClass: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-100',
    dotClass: 'bg-red-500',
    textClass: 'text-red-700 dark:text-red-200',
  },
  default: {
    label: 'En seguimiento',
    badgeClass: 'bg-primary-100 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100',
    dotClass: 'bg-primary-500',
    textClass: 'text-primary-700 dark:text-primary-200',
  },
};

const getStatusVisuals = (status: string, fallback?: string) =>
  RESERVATION_VISUALS[status] ??
  (fallback ? RESERVATION_VISUALS[fallback] : RESERVATION_VISUALS.default);

interface BaseReservationRecord {
  id: string;
  reservationCode: string;
  reservationDate: string;
  reservationTime: string;
  branchId: string;
  peopleCount: number;
  message: string | null;
  status: string;
}

interface ReservationRecord extends BaseReservationRecord {
  createdAt: string;
  updatedAt: string;
}

interface FailedReservationRecord extends BaseReservationRecord {
  originalReservationId: string;
  archivedAt: string;
  cleanupAt: string;
}

const formatDateForApi = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const buildSlotDateTime = (reservationDate: string, reservationTime: string) => {
  const [hours, minutes] = reservationTime.split(':').map(Number);
  const [year, month, day] = reservationDate.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
};
export default function ReservePage() {
  const { token, user } = useAuth();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const maxReservationDate = useMemo(() => {
    const limit = new Date(today);
    limit.setMonth(limit.getMonth() + 1);
    return limit;
  }, [today]);
  const [displayMonth, setDisplayMonth] = useState(today);
  const minMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const maxMonth = useMemo(
    () => new Date(maxReservationDate.getFullYear(), maxReservationDate.getMonth(), 1),
    [maxReservationDate]
  );
  const canGoPrev =
    displayMonth.getFullYear() > minMonth.getFullYear() ||
    displayMonth.getMonth() > minMonth.getMonth();
  const canGoNext =
    displayMonth.getFullYear() < maxMonth.getFullYear() ||
    displayMonth.getMonth() < maxMonth.getMonth();
  const [selectedPeople, setSelectedPeople] = useState<number>(2);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [failedReservations, setFailedReservations] = useState<FailedReservationRecord[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const userDisplayName = useMemo(() => {
    if (!user) return null;
    const parts = [user.firstName, user.lastName].map((value) => value?.trim());
    const filtered = parts.filter((value): value is string => Boolean(value));
    if (filtered.length === 0) {
      return null;
    }
    return filtered.join(' ');
  }, [user]);

  const loadReservations = useCallback(async () => {
    if (!token) {
      setReservations([]);
      setFailedReservations([]);
      setReservationsError(null);
      return;
    }
    setIsLoadingReservations(true);
    setReservationsError(null);
    try {
      const response = await fetch('/api/reservations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'No pudimos cargar tus reservaciones.');
      }
      setReservations(Array.isArray(payload.data) ? payload.data : []);
      setFailedReservations(Array.isArray(payload.failed) ? payload.failed : []);
    } catch (error) {
      console.error('Error cargando reservaciones:', error);
      const message =
        error instanceof Error ? error.message : 'No pudimos cargar tus reservaciones.';
      setReservationsError(message);
    } finally {
      setIsLoadingReservations(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setReservations([]);
      setReservationsError(null);
      return;
    }
    loadReservations();
  }, [token, loadReservations]);
  const handleRefreshReservations = useCallback(() => {
    void loadReservations();
  }, [loadReservations]);

  const handleScrollToForm = useCallback(() => {
    const form = document.getElementById('reservation-form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const categorizedReservations = useMemo(() => {
    const active: ReservationRecord[] = [];
    const past: ReservationRecord[] = [];

    reservations.forEach((reservation) => {
      const slotDateTime = buildSlotDateTime(
        reservation.reservationDate,
        reservation.reservationTime
      );
      const slotGraceEnd = new Date(slotDateTime.getTime() + QR_EXPIRATION_MINUTES * 60 * 1000);
      if (slotGraceEnd.getTime() > currentTime.getTime()) {
        active.push(reservation);
      } else {
        past.push(reservation);
      }
    });

    // Ordenar para que las activas más próximas aparezcan primero
    active.sort((a, b) => {
      const aTime = buildSlotDateTime(a.reservationDate, a.reservationTime).getTime();
      const bTime = buildSlotDateTime(b.reservationDate, b.reservationTime).getTime();
      return aTime - bTime;
    });
    past.sort((a, b) => {
      const aTime = buildSlotDateTime(a.reservationDate, a.reservationTime).getTime();
      const bTime = buildSlotDateTime(b.reservationDate, b.reservationTime).getTime();
      return bTime - aTime;
    });

    return { activeReservations: active, pastReservations: past };
  }, [reservations, currentTime]);

  const { activeReservations, pastReservations } = categorizedReservations;
  const hasReachedReservationLimit =
    Boolean(token) && activeReservations.length >= MAX_ACTIVE_RESERVATIONS;

  const getTimeWindowForDate = (date: Date) => {
    const day = date.getDay();
    if (day === 0) return { start: 9, end: 15 }; // Domingo 9-15
    if (day === 6) return { start: 9, end: 17 }; // Sábado 9-17
    return { start: 9, end: 18 }; // Lunes a viernes 9-18
  };

  const formatSlot = (hours: number, minutes: number) =>
    `${String(hours).padStart(2, '0')}:${minutes === 0 ? '00' : '30'}`;

  const getTimeSlotsForDate = (date: Date) => {
    const { start, end } = getTimeWindowForDate(date);
    const slots: string[] = [];
    for (let hour = start; hour < end; hour += 1) {
      slots.push(formatSlot(hour, 0));
      slots.push(formatSlot(hour, 30));
    }
    return slots;
  };

  const idPrefix = useId();
  const fieldIds = {
    people: `${idPrefix}-people`,
    message: `${idPrefix}-message`,
  };

  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];

    const baseSlots = getTimeSlotsForDate(selectedDate).filter(
      (slot) => !bookedSlots.includes(slot)
    );

    const isSameDay = selectedDate.toDateString() === currentTime.toDateString();
    if (!isSameDay) {
      return baseSlots;
    }

    return baseSlots.filter((slot) => {
      const [hours, minutes] = slot.split(':').map(Number);
      const slotDate = new Date(selectedDate);
      slotDate.setHours(hours || 0, minutes || 0, 0, 0);
      return slotDate.getTime() > currentTime.getTime();
    });
  }, [selectedDate, bookedSlots, currentTime]);

  const timeSelectPlaceholder = useMemo(() => {
    if (!selectedDate) return 'Selecciona una fecha primero';
    if (isLoadingSlots) return 'Cargando horarios...';
    if (availableTimeSlots.length === 0) return 'No hay horarios disponibles';
    return 'Selecciona una hora disponible';
  }, [selectedDate, isLoadingSlots, availableTimeSlots.length]);

  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate) {
      setBookedSlots([]);
      setAvailabilityError(null);
      setIsLoadingSlots(false);
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    const fetchAvailability = async () => {
      setIsLoadingSlots(true);
      setAvailabilityError(null);

      try {
        const dateParam = formatDateForApi(selectedDate);
        const response = await fetch(
          `/api/reservations/availability?date=${dateParam}&branchId=${encodeURIComponent(
            BRANCH_ID
          )}`,
          { signal: controller.signal }
        );
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || 'No pudimos obtener la disponibilidad.');
        }

        if (!ignore) {
          setBookedSlots(payload.slots || []);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Error consultando disponibilidad:', error);
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : 'No pudimos cargar los horarios disponibles.';
          setBookedSlots([]);
          setAvailabilityError(message);
        }
      } finally {
        if (!ignore) {
          setIsLoadingSlots(false);
        }
      }
    };

    fetchAvailability();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTime && !availableTimeSlots.includes(selectedTime)) {
      setSelectedTime(null);
    }
  }, [availableTimeSlots, selectedTime]);

  const handleDownloadQr = useCallback(
    async (reservation: ReservationRecord) => {
      try {
        const branchLabel =
          reservation.branchId === BRANCH_ID ? BRANCH_LABEL : reservation.branchId;
        const qrPayload = {
          reservationId: reservation.id,
          code: reservation.reservationCode,
          user: userDisplayName || user?.email || 'Cliente Xoco Café',
          date: reservation.reservationDate,
          time: reservation.reservationTime,
          people: reservation.peopleCount,
          branch: branchLabel,
          message: reservation.message || null,
        };
        const qrDataString = JSON.stringify(qrPayload);
        const qrImageSrc = `${QR_API_URL}?size=${QR_IMAGE_SIZE}&data=${encodeURIComponent(
          qrDataString
        )}`;

        const response = await fetch(qrImageSrc);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reservation.reservationCode}-${reservation.reservationDate}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error descargando QR:', error);
        setAlert({
          type: 'error',
          text: 'No pudimos descargar el QR. Intenta de nuevo.',
        });
      }
    },
    [userDisplayName, user, setAlert]
  );

  const renderReservationCard = (
    reservation: ReservationRecord,
    categoryKey: 'active' | 'past'
  ) => {
    const slotDateTime = buildSlotDateTime(
      reservation.reservationDate,
      reservation.reservationTime
    );
    const branchLabel = reservation.branchId === BRANCH_ID ? BRANCH_LABEL : reservation.branchId;
    const qrExpiresAt = new Date(slotDateTime.getTime() + QR_EXPIRATION_MINUTES * 60 * 1000);
    const qrIsActive = currentTime.getTime() < qrExpiresAt.getTime();
    const qrPayload = {
      reservationId: reservation.id,
      code: reservation.reservationCode,
      user: userDisplayName || user?.email || 'Cliente Xoco Café',
      date: reservation.reservationDate,
      time: reservation.reservationTime,
      people: reservation.peopleCount,
      branch: branchLabel,
      message: reservation.message || null,
    };
    const qrDataString = JSON.stringify(qrPayload);
    const qrImageSrc = `${QR_API_URL}?size=${QR_IMAGE_SIZE}&data=${encodeURIComponent(
      qrDataString
    )}`;
    const formattedDate = new Date(reservation.reservationDate).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const statusVisuals = getStatusVisuals(reservation.status, categoryKey);

    return (
      <li
        key={reservation.id}
        className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
            <span
              className={`h-2.5 w-2.5 rounded-full ${statusVisuals.dotClass}`}
              aria-hidden="true"
            />
            <span>Código</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100">
              {reservation.reservationCode}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {formattedDate} · {reservation.reservationTime} hrs
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {reservation.peopleCount} {reservation.peopleCount === 1 ? 'persona' : 'personas'} ·{' '}
            {branchLabel}
          </p>
          {reservation.message && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mensaje: {reservation.message}
            </p>
          )}
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusVisuals.badgeClass}`}
          >
            {statusVisuals.label}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          {qrIsActive ? (
            <img
              src={qrImageSrc}
              alt={`QR de la reservación ${reservation.reservationCode}`}
              className="h-40 w-40 rounded-2xl border border-dashed border-gray-300 bg-white p-3 dark:border-gray-600"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-dashed border-gray-300 text-center text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
              QR expirado
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {qrIsActive
              ? `QR válido hasta las ${qrExpiresAt.toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : `Este QR se eliminó automáticamente ${QR_EXPIRATION_MINUTES} min después de la hora.`}
          </p>
          {qrIsActive && (
            <button
              type="button"
              onClick={() => void handleDownloadQr(reservation)}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-300"
            >
              Descargar QR
            </button>
          )}
        </div>
      </li>
    );
  };

  const renderReservationGroup = (
    list: ReservationRecord[],
    config: {
      title: string;
      description: string;
      emptyState: string;
      categoryKey: 'active' | 'past';
    }
  ) => (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white/60 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{config.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{config.description}</p>
        </div>
        <span className="text-xs uppercase tracking-[0.3em] text-gray-400">
          {list.length} reservas
        </span>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{config.emptyState}</p>
      ) : (
        <ul className="space-y-4">
          {list.map((reservation) => renderReservationCard(reservation, config.categoryKey))}
        </ul>
      )}
    </div>
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAlert(null);

    if (!token) {
      setAlert({ type: 'error', text: 'Necesitas iniciar sesión para crear una reserva.' });
      return;
    }

    if (!selectedDate || !selectedTime) {
      setAlert({ type: 'error', text: 'Selecciona una fecha y hora válidas.' });
      return;
    }

    if (hasReachedReservationLimit) {
      setAlert({
        type: 'error',
        text: 'Solo puedes tener 3 reservas activas. Cancela una o espera a que termine.',
      });
      return;
    }

    const timeJustBooked = selectedTime;

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          numPeople: selectedPeople,
          reservationDate: formatDateForApi(selectedDate),
          reservationTime: selectedTime,
          branchId: BRANCH_ID,
          message: message.trim() || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'No pudimos confirmar tu reserva.');
      }

      const reservationCode = payload.data?.reservationCode || '---';
      setAlert({
        type: 'success',
        text: `¡Reserva confirmada! Tu código es: ${reservationCode}`,
      });
      setMessage('');
      if (timeJustBooked) {
        setBookedSlots((prev) =>
          prev.includes(timeJustBooked) ? prev : [...prev, timeJustBooked]
        );
        setSelectedTime(null);
      }
      await loadReservations();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Error creando tu reserva. Intenta de nuevo.';
      setAlert({
        type: 'error',
        text: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-0">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-center md:text-left">
          <p className="text-xs uppercase tracking-[0.35em] text-primary-500">Reservaciones</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            Reserva tu mesa en Xoco Café
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Selecciona fecha, hora y asistentes; te daremos un código QR único para tu llegada.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleScrollToForm}
            className="rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-700"
          >
            Nueva reservación
          </button>
          <button
            type="button"
            onClick={handleRefreshReservations}
            className="rounded-full border border-primary-600 px-5 py-2.5 text-sm font-semibold text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-200"
          >
            Actualizar lista
          </button>
        </div>
      </div>

      <OrderReserveFlipCard variant="reserve" className="mb-8" />

      <form
        id="reservation-form"
        onSubmit={handleSubmit}
        className="grid gap-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900 lg:grid-cols-[1.1fr,0.9fr]"
      >
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-medium text-gray-800 dark:text-gray-200">Fecha</p>
              <div className="space-y-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
                    onClick={() => {
                      if (!canGoPrev) return;
                      const prev = new Date(
                        displayMonth.getFullYear(),
                        displayMonth.getMonth() - 1,
                        1
                      );
                      setDisplayMonth(prev < minMonth ? minMonth : prev);
                    }}
                    disabled={!canGoPrev}
                  >
                    ← Anterior
                  </button>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {displayMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                  </p>
                  <button
                    type="button"
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
                    onClick={() => {
                      if (!canGoNext) return;
                      const next = new Date(
                        displayMonth.getFullYear(),
                        displayMonth.getMonth() + 1,
                        1
                      );
                      setDisplayMonth(next > maxMonth ? maxMonth : next);
                    }}
                    disabled={!canGoNext}
                  >
                    Siguiente →
                  </button>
                </div>
                <DayPicker
                  mode="single"
                  month={displayMonth}
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  onMonthChange={(month) => {
                    const normalized = new Date(month.getFullYear(), month.getMonth(), 1);
                    if (normalized < minMonth) {
                      setDisplayMonth(minMonth);
                      return;
                    }
                    if (normalized > maxMonth) {
                      setDisplayMonth(maxMonth);
                      return;
                    }
                    setDisplayMonth(normalized);
                  }}
                  disabled={{ before: today, after: maxReservationDate }}
                  weekStartsOn={1}
                  fromDate={today}
                  toDate={maxReservationDate}
                  showOutsideDays={false}
                  modifiersClassNames={{
                    selected: 'bg-primary-600 text-white',
                    today: 'text-primary-600 font-semibold',
                  }}
                  styles={{
                    caption: { color: '#1f2937' },
                  }}
                />
                <p className="px-4 pb-4 text-xs text-gray-500 dark:text-gray-400">
                  Fechas disponibles desde hoy hasta{' '}
                  {maxReservationDate.toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  .
                </p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-gray-800 dark:text-gray-200">Hora</p>
              <select
                value={selectedTime ?? ''}
                onChange={(event) => setSelectedTime(event.target.value || null)}
                disabled={!selectedDate || isLoadingSlots || availableTimeSlots.length === 0}
                className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">{timeSelectPlaceholder}</option>
                {availableTimeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              {availabilityError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{availabilityError}</p>
              )}
              {!availabilityError &&
                selectedDate &&
                !isLoadingSlots &&
                availableTimeSlots.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Todos los horarios ya están reservados para esta fecha. Intenta con otro día.
                  </p>
                )}
            </div>
          </div>

          <div>
            <label
              htmlFor={fieldIds.people}
              className="block text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              Total de asistentes
            </label>
            <select
              id={fieldIds.people}
              value={selectedPeople}
              onChange={(event) => setSelectedPeople(Number(event.target.value))}
              className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {Array.from({ length: MAX_PEOPLE }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value} {value === 1 ? 'persona' : 'personas'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Sucursal</p>
            <p>{BRANCH_LABEL}</p>
            <p className="text-xs text-gray-500">
              Próximamente podrás elegir entre distintas ubicaciones de Xoco Café.
            </p>
          </div>

          <div>
            <label
              htmlFor={fieldIds.message}
              className="block text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              Mensaje (opcional)
            </label>
            <textarea
              id={fieldIds.message}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              className="mt-2 block w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Cuéntanos si celebras algo especial o si tienes alguna preferencia."
            />
          </div>
        </div>

        <div className="space-y-6 rounded-2xl border border-primary-100 bg-primary-50/60 p-5 shadow-inner dark:border-primary-700/40 dark:bg-primary-900/20">
          <div>
            <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-100">
              Resumen
            </h2>
            <p className="mt-1 text-sm text-primary-700 dark:text-primary-200">
              Confirma que los datos sean correctos antes de enviar.
            </p>
          </div>

          <ul className="space-y-3 text-sm text-primary-900 dark:text-primary-100">
            <li>
              <span className="font-medium">Personas:</span> {selectedPeople}
            </li>
            <li>
              <span className="font-medium">Fecha seleccionada:</span>{' '}
              {selectedDate ? selectedDate.toLocaleDateString('es-MX') : 'Pendiente'}
            </li>
            <li>
              <span className="font-medium">Hora:</span> {selectedTime ?? 'Pendiente'}
            </li>
            <li>
              <span className="font-medium">Sucursal:</span> {BRANCH_LABEL}
            </li>
          </ul>

          {alert && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                alert.type === 'success'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-100'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-100'
              }`}
            >
              {alert.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || hasReachedReservationLimit}
            className="w-full rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creando reserva...' : 'Confirmar reserva'}
          </button>
          {hasReachedReservationLimit && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Solo puedes tener 3 reservas activas. Cancela una o espera a que concluya para crear
              otra.
            </p>
          )}
        </div>
      </form>

      <section className="mt-10 space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Mis reservaciones
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Verde = activas, amarillo = ya concluidas. El QR solo aparece mientras el horario está
              vigente.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleScrollToForm}
              disabled={hasReachedReservationLimit}
              className={`rounded-full border border-primary-600 px-4 py-2 text-sm font-semibold ${
                hasReachedReservationLimit
                  ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                  : 'text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-200'
              }`}
            >
              Crear nueva reserva
            </button>
            {token && (
              <button
                type="button"
                onClick={handleRefreshReservations}
                disabled={isLoadingReservations}
                className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingReservations ? 'Actualizando...' : 'Actualizar lista'}
              </button>
            )}
          </div>
        </div>

        {hasReachedReservationLimit && (
          <div className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
            Tienes 3 reservas activas. Debes esperar a que alguna finalice para crear otra.
          </div>
        )}

        {!token ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Inicia sesión para ver tus reservaciones activas y obtener su código QR.
          </p>
        ) : (
          <>
            {reservationsError && (
              <div className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-100">
                {reservationsError}
              </div>
            )}

            {isLoadingReservations ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                Cargando tus reservaciones...
              </div>
            ) : (
              <div className="space-y-6">
                {renderReservationGroup(activeReservations, {
                  title: 'Reservas activas',
                  description: 'Próximas visitas con QR disponible.',
                  emptyState: 'No tienes reservas activas. Agenda una para asegurar tu lugar.',
                  categoryKey: 'active',
                })}
                {renderReservationGroup(pastReservations, {
                  title: 'Reservas pasadas',
                  description: 'Historial reciente (QR expirado automáticamente).',
                  emptyState: 'Aún no tienes reservas pasadas en el historial.',
                  categoryKey: 'past',
                })}
              </div>
            )}
          </>
        )}
      </section>

      {token && (
        <section className="mt-6 space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Reservas no completadas
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Si no acudiste antes del corte (23:59), movemos la reserva aquí en color naranja y
              eliminamos su QR. El registro se conserva por 7 días.
            </p>
          </div>
          {failedReservations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No tienes reservas pendientes de seguimiento. ¡Todo al corriente!
            </p>
          ) : (
            <ul className="space-y-4">
              {failedReservations.map((reservation) => {
                const branchLabel =
                  reservation.branchId === BRANCH_ID ? BRANCH_LABEL : reservation.branchId;
                const statusVisuals = getStatusVisuals('failed', 'failed');
                const cleanupDate = new Date(reservation.cleanupAt).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                });
                const formattedDate = new Date(reservation.reservationDate).toLocaleDateString(
                  'es-MX',
                  { weekday: 'long', day: 'numeric', month: 'long' }
                );
                return (
                  <li
                    key={reservation.id}
                    className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${statusVisuals.dotClass}`}
                        aria-hidden="true"
                      />
                      <span>Código</span>
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                        {reservation.reservationCode}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {formattedDate} · {reservation.reservationTime} hrs
                      </p>
                      <p>
                        {reservation.peopleCount}{' '}
                        {reservation.peopleCount === 1 ? 'persona' : 'personas'} · {branchLabel}
                      </p>
                      {reservation.message && <p>Mensaje: {reservation.message}</p>}
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusVisuals.badgeClass}`}
                      >
                        {statusVisuals.label}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Registro disponible hasta {cleanupDate}.
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
