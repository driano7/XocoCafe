'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import '@/css/react-day-picker.css';
import { useAuth } from '@/components/Auth/AuthProvider';
import OrderReserveFlipCard from '@/components/Order/OrderReserveFlipCard';

const MAX_PEOPLE = 15;
const BRANCH_ID = 'default-branch';
const BRANCH_LABEL = 'Matriz Roma Norte';
export default function ReservePage() {
  const { token } = useAuth();
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

  const availableTimeSlots = useMemo(
    () => (selectedDate ? getTimeSlotsForDate(selectedDate) : []),
    [selectedDate]
  );

  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate]);

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
          reservationDate: selectedDate.toISOString(),
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
    } catch (error: any) {
      console.error(error);
      setAlert({
        type: 'error',
        text: error.message || 'Error creando tu reserva. Intenta de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-0">
      <div className="mb-8 text-center space-y-2">
        <p className="text-sm uppercase tracking-[0.35em] text-primary-500">Reservaciones</p>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          Reserva tu mesa en Xoco Café
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Selecciona la fecha y hora que más te convenga. Te enviaremos una confirmación con tu
          código único.
        </p>
      </div>

      <OrderReserveFlipCard variant="reserve" className="mb-8" />

      <form
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
                disabled={!selectedDate || availableTimeSlots.length === 0}
                className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Selecciona una hora disponible</option>
                {availableTimeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
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
            disabled={isSubmitting}
            className="w-full rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creando reserva...' : 'Confirmar reserva'}
          </button>
        </div>
      </form>
    </div>
  );
}
