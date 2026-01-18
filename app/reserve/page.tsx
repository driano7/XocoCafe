/*
 * --------------------------------------------------------------------
 *  Xoco Café — Software Property
 *  Copyright (c) 2025 Xoco Café
 *  Principal Developer: Donovan Riaño
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at:
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  --------------------------------------------------------------------
 *  PROPIEDAD DEL SOFTWARE — XOCO CAFÉ.
 *  Copyright (c) 2025 Xoco Café.
 *  Desarrollador Principal: Donovan Riaño.
 *
 *  Este archivo está licenciado bajo la Apache License 2.0.
 *  Consulta el archivo LICENSE en la raíz del proyecto para más detalles.
 * --------------------------------------------------------------------
 */

'use client';

import classNames from 'classnames';
import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { DayPicker, type Formatters } from 'react-day-picker';
import { FaWhatsapp } from 'react-icons/fa';
import { FiCalendar } from 'react-icons/fi';
import '@/css/react-day-picker.css';
import { useAuth } from '@/components/Auth/AuthProvider';
import LoyaltyReminderCard from '@/components/LoyaltyReminderCard';
import SessionTimeoutNotice from '@/components/SessionTimeoutNotice';
import Snackbar from '@/components/Feedback/Snackbar';
import siteMetadata from 'content/siteMetadata';
import { DEFAULT_BRANCH_ID } from '@/lib/reservations';
import { usePagination } from '@/hooks/use-pagination';
import { cancelReservation } from '@/lib/reservations-client';
import { useLoyaltyReminder } from '@/hooks/useLoyaltyReminder';
import { useSnackbarNotifications, type SnackbarTone } from '@/hooks/useSnackbarNotifications';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';
import CoffeeBackground from '@/components/CoffeeBackground';
import { useLanguage } from '@/components/Language/LanguageProvider';
import TranslatedText from '@/components/Language/TranslatedText';
import { es, enUS } from 'date-fns/locale';

const MAX_PEOPLE = 15;
const BRANCH_ID = DEFAULT_BRANCH_ID;
const BRANCH_LABEL = 'Matriz Roma Norte';
const BRANCH_NUMBER = '001';
const QR_EXPIRATION_MINUTES = 30;
const MAX_ACTIVE_RESERVATIONS = 3;
const QR_IMAGE_SIZE = '220x220';
const QR_API_URL = '/api/qr';

const getReservationVisuals = (
  t: (key: string) => string
): Record<string, { label: string; badgeClass: string; dotClass: string; textClass: string }> => ({
  active: {
    label: t('reservations.status_active') || 'Activa',
    badgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-200',
  },
  past: {
    label: t('reservations.status_past') || 'Concluida',
    badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700 dark:text-amber-200',
  },
  failed: {
    label: t('reservations.status_failed') || 'No completada',
    badgeClass: 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-100',
    dotClass: 'bg-orange-500',
    textClass: 'text-orange-700 dark:text-orange-200',
  },
  pending: {
    label: t('reservations.status_pending') || 'Pendiente',
    badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700 dark:text-amber-200',
  },
  confirmed: {
    label: t('reservations.status_confirmed') || 'Confirmada',
    badgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-200',
  },
  completed: {
    label: t('reservations.status_completed') || 'Completada',
    badgeClass: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-100',
    dotClass: 'bg-cyan-500',
    textClass: 'text-cyan-700 dark:text-cyan-200',
  },
  cancelled: {
    label: t('reservations.status_cancelled') || 'Cancelada',
    badgeClass: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-100',
    dotClass: 'bg-red-500',
    textClass: 'text-red-700 dark:text-red-200',
  },
  default: {
    label: t('reservations.status_default') || 'En seguimiento',
    badgeClass: 'bg-primary-100 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100',
    dotClass: 'bg-primary-500',
    textClass: 'text-primary-700 dark:text-primary-200',
  },
});

const getDayPickerWeekdays = (t: (key: string) => string): Record<number, string> => ({
  0: t('common.domingo_short') || 'Do',
  1: t('common.lunes_short') || 'Lu',
  2: t('common.martes_short') || 'Ma',
  3: t('common.miercoles_short') || 'Mi',
  4: t('common.jueves_short') || 'Ju',
  5: t('common.viernes_short') || 'Vi',
  6: t('common.sabado_short') || 'Sá',
});

const getStatusVisuals = (status: string, t: (key: string) => string, fallback?: string) => {
  const visuals = getReservationVisuals(t);
  return visuals[status] ?? (fallback ? visuals[fallback] : visuals.default);
};

interface BaseReservationRecord {
  id: string;
  reservationCode: string;
  reservationDate: string;
  reservationTime: string;
  branchId: string;
  branchNumber?: string | null;
  peopleCount: number;
  message: string | null;
  preOrderItems?: string | null;
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

const parseReservationDate = (reservation: ReservationRecord) => {
  if (!reservation.reservationDate) {
    return null;
  }
  const isoCandidate = `${reservation.reservationDate}T${reservation.reservationTime || '00:00'}`;
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatReservationDateTime = (reservation: ReservationRecord, t: (key: string) => string) => {
  const parsed = parseReservationDate(reservation);
  if (!parsed) {
    return `${reservation.reservationDate} · ${reservation.reservationTime ?? '--:--'} hrs`;
  }
  return parsed.toLocaleString(t('common.locale')?.includes('en') ? 'en-US' : 'es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildReservationSearchTerms = (reservation: ReservationRecord) => {
  return [
    reservation.id,
    reservation.reservationCode,
    reservation.reservationDate,
    String(reservation.peopleCount),
  ].filter((value): value is string => Boolean(value && value.trim()));
};

const groupClientReservations = (reservations: ReservationRecord[]) => {
  const now = new Date();
  const pending: ReservationRecord[] = [];
  const past: ReservationRecord[] = [];
  const completed: ReservationRecord[] = [];

  reservations.forEach((reservation) => {
    const status = (reservation.status ?? 'pending').toLowerCase();
    if (status === 'completed') {
      completed.push({ ...reservation, status: 'completed' });
      return;
    }
    if (status === 'cancelled' || status === 'past') {
      past.push({ ...reservation, status: 'past' });
      return;
    }
    const parsed = parseReservationDate(reservation);
    if (parsed && parsed < now) {
      past.push({ ...reservation, status: 'past' });
      return;
    }
    pending.push(reservation);
  });

  return { pending, past, completed };
};

const formatReservationDate = (
  reservationDate: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions
) => {
  const [year, month, day] = reservationDate.split('-').map(Number);
  if ([year, month, day].some((value) => Number.isNaN(value))) {
    return reservationDate;
  }
  const date = new Date(year, (month || 1) - 1, day || 1);
  return date.toLocaleDateString(locale, options);
};

const formatDateForInput = (date?: Date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateFromInput = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if ([year, month, day].some((segment) => Number.isNaN(segment))) {
    return null;
  }
  const parsed = new Date(year, (month || 1) - 1, day || 1);
  parsed.setHours(0, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const clampDateToRange = (date: Date, min: Date, max: Date) => {
  if (date < min) return new Date(min);
  if (date > max) return new Date(max);
  return date;
};
export default function ReservePage() {
  const { t, currentLanguage } = useLanguage();
  const dateLocale = currentLanguage === 'es' ? es : enUS;
  const DAY_PICKER_WEEKDAYS = getDayPickerWeekdays(t);
  const dayPickerFormatters: Partial<Formatters> = useMemo(
    () => ({
      formatWeekdayName: (day) => DAY_PICKER_WEEKDAYS[day.getDay()] ?? '',
    }),
    [DAY_PICKER_WEEKDAYS]
  );
  const { token, user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = Boolean(token && user);
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
  const [preOrderItems, setPreOrderItems] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [failedReservations, setFailedReservations] = useState<FailedReservationRecord[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [reservationFilter, setReservationFilter] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<ReservationRecord | null>(null);
  const [showReservationHistory, setShowReservationHistory] = useState(false);
  const [showReservationCompletedHistory, setShowReservationCompletedHistory] = useState(false);
  const scrollReservationModalIntoView = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  // reservationActionState removed as it was unused in UI
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const reservationTicketRef = useRef<HTMLDivElement | null>(null);
  const reservationFormRef = useRef<HTMLDivElement | null>(null);
  const reservationBoardRef = useRef<HTMLDivElement | null>(null);
  const [reservationTicketActionError, setReservationTicketActionError] = useState<string | null>(
    null
  );
  const [isProcessingReservationTicket, setIsProcessingReservationTicket] = useState(false);
  const reservationShareState = useMemo(
    () => ({
      error: reservationTicketActionError,
      isProcessing: isProcessingReservationTicket,
    }),
    [reservationTicketActionError, isProcessingReservationTicket]
  );
  const [recentReservationCode, setRecentReservationCode] = useState<string | null>(null);
  const [reservationDeviceInfo, setReservationDeviceInfo] = useState({
    isMobile: false,
    isAndroid: false,
    isIOS: false,
  });
  const [canShareReservation, setCanShareReservation] = useState(false);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbarNotifications();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const detectDevice = () => {
      if (typeof window === 'undefined') {
        return;
      }
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const isTouchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
      const matchesViewport = window.matchMedia('(max-width: 768px)').matches;
      const isMobileMatch =
        /android|iphone|ipad|ipod|windows phone/i.test(userAgent || '') ||
        isTouchDevice ||
        matchesViewport;
      setIsMobileDevice(isMobileMatch);
    };
    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  useEffect(() => {
    const detectCapabilities = () => {
      if (typeof navigator === 'undefined' || typeof window === 'undefined') {
        return;
      }
      type WindowWithOpera = Window & { opera?: string };
      const ua =
        navigator.userAgent ||
        navigator.vendor ||
        ((window as WindowWithOpera).opera ? String((window as WindowWithOpera).opera) : '');
      const isAndroid = /android/i.test(ua);
      const isIPhone = /iphone|ipod/i.test(ua);
      const isIPad =
        /ipad/i.test(ua) ||
        (/macintosh/i.test(ua) &&
          typeof navigator.maxTouchPoints === 'number' &&
          navigator.maxTouchPoints > 1);
      setReservationDeviceInfo({
        isMobile: isAndroid || isIPhone || isIPad,
        isAndroid,
        isIOS: isIPhone,
      });
      setCanShareReservation(typeof navigator.share === 'function' && (isAndroid || isIPhone));
    };
    detectCapabilities();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setReservationTicketActionError(null);
    setIsProcessingReservationTicket(false);
  }, [selectedReservation]);

  useEffect(() => {
    if (selectedReservation) {
      scrollReservationModalIntoView();
    }
  }, [selectedReservation, scrollReservationModalIntoView]);

  useEffect(() => {
    if (showReservationHistory) {
      scrollReservationModalIntoView();
    }
  }, [showReservationHistory, scrollReservationModalIntoView]);

  useEffect(() => {
    if (showReservationCompletedHistory) {
      scrollReservationModalIntoView();
    }
  }, [showReservationCompletedHistory, scrollReservationModalIntoView]);

  const loyaltyReminder = useLoyaltyReminder({
    userId: user?.id,
    enrolled: user?.loyaltyEnrolled ?? false,
    token,
  });
  const handleWhatsappSnackbar = useCallback(() => {
    showSnackbar(
      t('orders.whatsapp_opening') || 'Abriendo chat de WhatsApp con Xoco Café…',
      'whatsapp'
    );
  }, [showSnackbar, t]);

  const handleActivateLoyaltyReminder = useCallback(async () => {
    const result = await loyaltyReminder.activate();
    const fallback = result.success
      ? t('orders.loyalty_success') ||
        'Activamos tu programa de lealtad. Ya puedes acumular sellos.'
      : t('orders.loyalty_error') ||
        'No pudimos activar tu programa de lealtad. Intenta más tarde.';
    const message = result.message ?? fallback;
    showSnackbar(
      result.success ? message : `⚠️ ${message}`,
      result.success ? 'success' : 'warning'
    );
  }, [loyaltyReminder, showSnackbar]);

  const handleMobileDateChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      if (!value) {
        setSelectedDate(undefined);
        return;
      }
      const parsed = parseDateFromInput(value);
      if (!parsed) {
        return;
      }
      const normalized = clampDateToRange(parsed, today, maxReservationDate);
      setSelectedDate(normalized);
      setDisplayMonth(new Date(normalized.getFullYear(), normalized.getMonth(), 1));
    },
    [maxReservationDate, setDisplayMonth, setSelectedDate, today, t]
  );

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

  useEffect(() => {
    if (!user) {
      return undefined;
    }
    const channel = supabase
      .channel(`reservations-user-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations', filter: `userId=eq.${user.id}` },
        (payload) => {
          const code =
            (payload.new as { reservationCode?: string } | null)?.reservationCode ??
            (payload.old as { reservationCode?: string } | null)?.reservationCode ??
            '---';
          const nextStatus = String(
            (payload.new as { status?: string } | null)?.status ?? ''
          ).toLowerCase();
          const previousStatus = String(
            (payload.old as { status?: string } | null)?.status ?? ''
          ).toLowerCase();
          let tone: SnackbarTone = 'info';
          let message: string | null = null;
          let deviceNotification: { title: string; body?: string } | null = null;
          if (payload.eventType === 'INSERT') {
            tone = 'success';
            message = `Reserva ${code} creada correctamente.`;
            deviceNotification = {
              title: 'Reserva creada',
              body: `Código ${code}`,
            };
          } else if (payload.eventType === 'UPDATE' && nextStatus !== previousStatus) {
            if (nextStatus === 'completed') {
              tone = 'success';
              message = `Tu reserva ${code} se marcó como completada.`;
              deviceNotification = {
                title: 'Reserva completada',
                body: `Código ${code}`,
              };
            }
          }
          if (message) {
            showSnackbar(message, tone, {
              deviceNotification,
            });
          }
          void loadReservations();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReservations, showSnackbar, supabase, user]);

  const handleOpenReservationForm = useCallback(() => {
    setAlert(null);
    setShowReservationForm((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!showReservationForm || !isMobileDevice) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const target = reservationFormRef.current;
    if (!target) {
      return;
    }
    window.requestAnimationFrame(() => {
      const headerOffset = Math.max(window.innerHeight * 0.2, 140);
      const top = Math.max(target.getBoundingClientRect().top + window.scrollY - headerOffset, 0);
      window.scrollTo({
        top,
        behavior: 'smooth',
      });
    });
  }, [isMobileDevice, showReservationForm]);

  useEffect(() => {
    if (!selectedReservation || !isMobileDevice) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [isMobileDevice, selectedReservation]);

  useEffect(() => {
    if (!recentReservationCode) {
      return;
    }
    if (
      !reservations.some((reservation) => reservation.reservationCode === recentReservationCode)
    ) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const scrollTarget = document.querySelector<HTMLElement>(
      `[data-reservation-code="${recentReservationCode}"]`
    );
    const scrollToBoard = () => {
      const host = reservationBoardRef.current;
      if (!host) {
        return;
      }
      const offsetTop = Math.max(host.getBoundingClientRect().top + window.scrollY - 120, 0);
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    };

    window.requestAnimationFrame(() => {
      if (scrollTarget) {
        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        scrollToBoard();
      }
    });

    const timer = window.setTimeout(() => {
      setRecentReservationCode(null);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [recentReservationCode, reservations]);

  const {
    pendingReservations,
    completedReservations,
    basePendingReservations,
    baseCompletedReservations,
    basePastReservations,
  } = useMemo(() => {
    const grouped = groupClientReservations(reservations);
    const normalizedFilter = reservationFilter.trim().toLowerCase();
    const matches = (reservation: ReservationRecord) =>
      !normalizedFilter ||
      buildReservationSearchTerms(reservation).some((term) =>
        term.toLowerCase().includes(normalizedFilter)
      );
    return {
      pendingReservations: grouped.pending.filter(matches),
      completedReservations: grouped.completed.filter(matches),
      basePendingReservations: grouped.pending,
      baseCompletedReservations: grouped.completed,
      basePastReservations: grouped.past,
    };
  }, [reservations, reservationFilter]);

  const completedReservationsLastWeek = useMemo(() => {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return baseCompletedReservations.filter((reservation) => {
      const parsed = parseReservationDate(reservation);
      return parsed && parsed.getTime() >= threshold;
    });
  }, [baseCompletedReservations]);

  const hasReachedReservationLimit =
    isAuthenticated && basePendingReservations.length >= MAX_ACTIVE_RESERVATIONS;
  const showCompletedHistoryButton = baseCompletedReservations.length > 3;
  const hasPastReservations = basePastReservations.length > 0;

  const getTimeWindowForDate = (date: Date) => {
    const day = date.getDay();
    if (day === 0) return { start: 9, end: 15 }; // Domingo 9-15
    if (day === 6) return { start: 9, end: 17 }; // Sábado 9-17
    return { start: 9, end: 18 }; // Lunes a viernes 9-18
  };

  const formatSlot = (hours: number, minutes: number) =>
    `${String(hours).padStart(2, '0')}:${minutes === 0 ? '00' : '30'}`;

  const getTimeSlotsForDate = useCallback((date: Date) => {
    const { start, end } = getTimeWindowForDate(date);
    const slots: string[] = [];
    for (let hour = start; hour < end; hour += 1) {
      slots.push(formatSlot(hour, 0));
      slots.push(formatSlot(hour, 30));
    }
    return slots;
  }, []);

  const fieldIds = {
    people: useId(),
    time: useId(),
    message: useId(),
    preOrder: useId(),
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
  }, [selectedDate, bookedSlots, currentTime, getTimeSlotsForDate]);

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

  const buildReservationShareText = useCallback(
    (reservation: ReservationRecord) => {
      const branchLabel = reservation.branchId === BRANCH_ID ? BRANCH_LABEL : reservation.branchId;
      return [
        t('reservations.share_text_res')?.replace('{code}', reservation.reservationCode) ||
          `Reserva ${reservation.reservationCode}`,
        formatReservationDateTime(reservation, t),
        `${t('reservations.people_selected') || 'Personas'}: ${reservation.peopleCount}`,
        `${t('reservations.branch') || 'Sucursal'}: ${branchLabel}${
          reservation.branchNumber ? ` (#${reservation.branchNumber})` : ''
        }`,
      ].join(' · ');
    },
    [t]
  );

  const waitForReservationAssets = useCallback(async () => {
    if (!reservationTicketRef.current) return;
    const images = Array.from(reservationTicketRef.current.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete && image.naturalWidth > 0) {
              resolve();
              return;
            }
            const handleResolve = () => {
              image.removeEventListener('load', handleResolve);
              image.removeEventListener('error', handleResolve);
              resolve();
            };
            image.addEventListener('load', handleResolve);
            image.addEventListener('error', handleResolve);
          })
      )
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
  }, []);

  const captureReservationTicket = useCallback(async () => {
    if (!reservationTicketRef.current) return null;
    await waitForReservationAssets();
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(reservationTicketRef.current, {
      scale: 2,
      backgroundColor: '#0f1524',
      useCORS: true,
    });
    return new Promise<Blob | null>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                t('reservations.capture_failed') || 'No pudimos generar la imagen de la reserva.'
              )
            );
            return;
          }
          resolve(blob);
        },
        'image/png',
        1
      );
    });
  }, [waitForReservationAssets, t]);

  const buildReservationTicketFileName = useCallback(
    (reservation: ReservationRecord) =>
      `reserva-${reservation.reservationCode}-${reservation.reservationDate}`,
    []
  );

  const triggerReservationDownload = useCallback(
    (blob: Blob, filename: string) => {
      const objectUrl = URL.createObjectURL(blob);
      if (reservationDeviceInfo.isMobile) {
        const newTab = window.open(objectUrl, '_blank');
        if (!newTab) {
          const link = document.createElement('a');
          link.href = objectUrl;
          link.download = `${filename}.png`;
          link.rel = 'noopener';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
        return;
      }
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
    },
    [reservationDeviceInfo.isMobile]
  );

  const saveReservationToGallery = useCallback(
    async (blob: Blob, filename: string) => {
      if (
        !canShareReservation ||
        typeof navigator === 'undefined' ||
        typeof navigator.share !== 'function'
      ) {
        throw new Error('reservation_gallery_unsupported');
      }
      const file = new File([blob], `${filename}.png`, { type: 'image/png' });
      const supportsFiles =
        typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });
      if (!supportsFiles && !reservationDeviceInfo.isAndroid) {
        throw new Error('reservation_gallery_unsupported');
      }
      try {
        await navigator.share({
          files: [file],
          title: t('reservations.reserva_galeria') || 'Reserva Xoco Café',
          text:
            t('reservations.reserva_galeria_text') || 'Guardaremos tu confirmación en tu galería.',
        });
      } catch (error) {
        if (
          error instanceof DOMException &&
          (error.name === 'AbortError' || error.name === 'NotAllowedError')
        ) {
          if (error.name === 'AbortError') {
            throw error;
          }
          throw new Error('reservation_gallery_permission');
        }
        throw new Error('reservation_gallery_failed');
      }
    },
    [canShareReservation, reservationDeviceInfo.isAndroid, t]
  );

  const handleDownloadReservationTicket = useCallback(
    async (reservation: ReservationRecord) => {
      setReservationTicketActionError(null);
      setIsProcessingReservationTicket(true);
      try {
        const blob = await captureReservationTicket();
        if (!blob) {
          throw new Error('reservation_capture_failed');
        }
        const filename = buildReservationTicketFileName(reservation);
        if (reservationDeviceInfo.isMobile && canShareReservation) {
          try {
            await saveReservationToGallery(blob, filename);
            return;
          } catch (mobileError) {
            if (mobileError instanceof DOMException && mobileError.name === 'AbortError') {
              setReservationTicketActionError(
                t('reservations.action_cancelled') ||
                  'Cancelaste la acción antes de guardar la reserva.'
              );
              return;
            }
            if (
              mobileError instanceof Error &&
              mobileError.message === 'reservation_gallery_permission'
            ) {
              setReservationTicketActionError(
                t('reservations.permission_denied') ||
                  'Necesitamos permiso para guardar la reserva en tu galería.'
              );
              return;
            }
            if (
              mobileError instanceof Error &&
              mobileError.message === 'reservation_gallery_failed'
            ) {
              setReservationTicketActionError(
                t('reservations.gallery_failed_download') ||
                  'No pudimos guardar en galería, enviamos la imagen a tus descargas.'
              );
            }
          }
        }
        triggerReservationDownload(blob, filename);
      } catch (error) {
        console.error('Error descargando confirmación de reserva:', error);
        if (error instanceof Error && error.message === 'reservation_capture_failed') {
          setReservationTicketActionError(
            t('reservations.capture_failed') || 'No pudimos generar la imagen de la reserva.'
          );
        } else {
          setReservationTicketActionError(
            t('reservations.download_error') || 'No pudimos descargar la reserva. Intenta de nuevo.'
          );
        }
      } finally {
        setIsProcessingReservationTicket(false);
      }
    },
    [
      buildReservationTicketFileName,
      canShareReservation,
      captureReservationTicket,
      reservationDeviceInfo.isMobile,
      saveReservationToGallery,
      triggerReservationDownload,
      t,
    ]
  );

  const handleShareReservationTicket = useCallback(
    async (reservation: ReservationRecord) => {
      setReservationTicketActionError(null);
      setIsProcessingReservationTicket(true);
      try {
        if (
          typeof navigator === 'undefined' ||
          typeof navigator.share !== 'function' ||
          !canShareReservation
        ) {
          const fallback = `${buildReservationShareText(reservation)}\n${
            t('reservations.share_te_espero') || 'Te espero en Xoco Café.'
          }`;
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(fallback);
            setReservationTicketActionError(
              t('reservations.copied_to_clipboard') ||
                'Copiamos los detalles de la reserva al portapapeles.'
            );
            return;
          }
          window.alert('Comparte manualmente: ' + fallback);
          return;
        }
        const blob = await captureReservationTicket();
        if (!blob) {
          throw new Error('reservation_capture_failed');
        }
        const file = new File([blob], `${buildReservationTicketFileName(reservation)}.png`, {
          type: 'image/png',
        });
        const supportsFiles =
          typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });
        if (!supportsFiles && !reservationDeviceInfo.isAndroid) {
          throw new Error('reservation_share_unsupported');
        }
        await navigator.share({
          files: [file],
          title: t('reservations.reserva_galeria') || 'Reserva Xoco Café',
          text: `${buildReservationShareText(reservation)}\n${
            t('reservations.share_te_espero') || 'Te espero en Xoco Café.'
          }`,
        });
      } catch (error) {
        console.error('Error compartiendo reserva:', error);
        if (error instanceof DOMException && error.name === 'AbortError') {
          setReservationTicketActionError('Cancelaste la acción de compartir.');
        } else if (error instanceof Error && error.message === 'reservation_capture_failed') {
          setReservationTicketActionError('No pudimos generar la imagen de la reserva.');
        } else {
          setReservationTicketActionError(
            'No pudimos compartir esta reservación en tu dispositivo.'
          );
        }
      } finally {
        setIsProcessingReservationTicket(false);
      }
    },
    [
      buildReservationShareText,
      buildReservationTicketFileName,
      canShareReservation,
      captureReservationTicket,
      reservationDeviceInfo.isAndroid,
      t,
    ]
  );

  const handleReservationAction = useCallback(
    async (
      reservation: ReservationRecord,
      action: 'confirm' | 'cancel',
      actionLabel: string,
      apiCall: (token: string, reservationId: string) => Promise<void>
    ) => {
      if (!token) {
        showSnackbar(
          t('reservations.confirm_action_login') ||
            'Inicia sesión de nuevo para administrar la reservación.',
          'error'
        );
        return;
      }
      try {
        await apiCall(token, reservation.id);
        await loadReservations();
        showSnackbar(`${actionLabel}.`, action === 'cancel' ? 'warning' : 'success', {
          deviceNotification: {
            title: actionLabel,
            body: `Reserva ${reservation.reservationCode}`,
          },
        });
        setSelectedReservation(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t('common.error') || 'No pudimos actualizar la reservación. Intenta de nuevo.';
        showSnackbar(message, 'error');
      }
    },
    [loadReservations, showSnackbar, token, t]
  );

  const handleCancelReservation = useCallback(
    async (reservation: ReservationRecord) => {
      await handleReservationAction(
        reservation,
        'cancel',
        t('reservations.cancelled_success') || 'Reservación cancelada',
        cancelReservation
      );
    },
    [handleReservationAction, t]
  );
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAlert(null);

    if (!token) {
      setAlert({
        type: 'error',
        text:
          t('reservations.login_to_create') || 'Necesitas iniciar sesión para crear una reserva.',
      });
      return;
    }

    if (!selectedDate || !selectedTime) {
      setAlert({
        type: 'error',
        text: t('reservations.select_valid_date_time') || 'Selecciona una fecha y hora válidas.',
      });
      return;
    }

    if (hasReachedReservationLimit) {
      setAlert({
        type: 'error',
        text:
          t('reservations.res_limit_error') ||
          'Solo puedes tener 3 reservas activas. Cancela una o espera a que termine.',
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
          branchNumber: BRANCH_NUMBER,
          message: message.trim() || null,
          preOrderItems: preOrderItems.trim() || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'No pudimos confirmar tu reserva.');
      }

      const reservationCode = payload.data?.reservationCode || '---';
      setAlert({
        type: 'success',
        text:
          t('reservations.res_confirmada_msg')?.replace('{code}', reservationCode) ||
          `¡Reserva confirmada! Tu código es: ${reservationCode}`,
      });
      showSnackbar(
        (
          t('reservations.res_confirmada_msg') || '¡Reserva confirmada! Tu código es: {code}'
        ).replace('{code}', reservationCode),
        'success',
        {
          deviceNotification: {
            title: 'Reserva creada',
            body: `Código ${reservationCode}`,
          },
        }
      );
      setMessage('');
      setPreOrderItems('');
      if (timeJustBooked) {
        setBookedSlots((prev) =>
          prev.includes(timeJustBooked) ? prev : [...prev, timeJustBooked]
        );
        setSelectedTime(null);
      }
      await loadReservations();
      setRecentReservationCode(reservationCode);
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

  if (isAuthLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-gray-700 dark:text-gray-200">
        Cargando tus reservaciones...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <SessionTimeoutNotice context="reservations" redirectDelayMs={300000} />
        <a
          href="/login"
          className="mt-6 inline-flex min-w-[220px] items-center justify-center rounded-full bg-primary-600 px-8 py-4 text-xl font-bold uppercase tracking-[0.25em] text-white shadow-xl transition hover:bg-primary-700"
        >
          Iniciar sesión
        </a>
      </div>
    );
  }

  const ReservationFormContent = () => (
    <form
      id="reservation-form"
      onSubmit={handleSubmit}
      className="grid gap-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="space-y-6">
        <div className="grid gap-6">
          <div>
            <p className="mb-3 text-sm font-medium text-gray-800 dark:text-gray-200">Fecha</p>
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              {isMobileDevice ? (
                <div className="space-y-2">
                  <input
                    type="date"
                    value={formatDateForInput(selectedDate)}
                    min={formatDateForInput(today)}
                    max={formatDateForInput(maxReservationDate)}
                    onChange={handleMobileDateChange}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-4 text-base font-semibold tracking-wide text-gray-900 shadow-inner focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900/60 dark:text-white"
                    aria-label="Selecciona la fecha de tu reserva"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    En móviles puedes deslizar el selector para elegir día, mes y año rápidamente.
                  </p>
                </div>
              ) : (
                <>
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
                      aria-label="Mes anterior"
                    >
                      ←
                    </button>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {displayMonth.toLocaleDateString(
                        currentLanguage === 'es' ? 'es-MX' : 'en-US',
                        {
                          month: 'long',
                          year: 'numeric',
                        }
                      )}
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
                      aria-label="Mes siguiente"
                    >
                      →
                    </button>
                  </div>
                  <DayPicker
                    className="w-full"
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
                    fromMonth={minMonth}
                    toMonth={maxMonth}
                    disableNavigation
                    showOutsideDays={false}
                    locale={dateLocale}
                    formatters={dayPickerFormatters}
                    modifiersClassNames={{
                      selected: 'bg-primary-600 text-white',
                      today: 'text-primary-600 font-semibold',
                    }}
                    styles={{
                      caption: { color: '#1f2937' },
                      root: { width: '100%', minWidth: 280 },
                      table: { width: '100%' },
                      head_cell: { width: '14.285%', textTransform: 'uppercase' },
                      cell: { width: '14.285%' },
                    }}
                  />
                </>
              )}
              <p className="px-1 pb-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold underline decoration-primary-400/60 underline-offset-4">
                  {t('reservations.dates_available_until').replace(
                    '{date}',
                    maxReservationDate.toLocaleDateString(
                      currentLanguage === 'es' ? 'es-MX' : 'en-US',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }
                    )
                  )}
                </span>
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor={fieldIds.time}
              className="mb-3 block text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              Hora
            </label>
            <select
              id={fieldIds.time}
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
            placeholder={
              t('reservations.message_placeholder') ||
              'Cuéntanos si celebras algo especial o si tienes alguna preferencia.'
            }
          />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor={fieldIds.preOrder}
              className="block text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              Alimentos y bebidas (opcional)
            </label>
            <textarea
              id={fieldIds.preOrder}
              value={preOrderItems}
              onChange={(event) => setPreOrderItems(event.target.value)}
              rows={4}
              className="mt-2 block w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Ej. 2 capuccinos, 1 croissant, 1 matcha."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Puedes listar lo que quieres tener preparado; se elaborará hasta que llegues a la
              sucursal.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-primary-100 bg-primary-50/60 p-5 shadow-inner dark:border-primary-700/40 dark:bg-primary-900/20">
        <div>
          <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-100">
            <TranslatedText tid="reservations.summary" fallback="Resumen" />
          </h2>
          <p className="mt-1 text-sm text-primary-700 dark:text-primary-200">
            <TranslatedText
              tid="reservations.confirm_resumen"
              fallback="Confirma que los datos sean correctos antes de enviar."
            />
          </p>
        </div>

        <ul className="space-y-3 text-sm text-primary-900 dark:text-primary-100">
          <li>
            <span className="font-medium">
              <TranslatedText tid="reservations.people_selected" fallback="Personas" />:
            </span>{' '}
            {t('reservations.num_people')
              ?.replace('{count}', String(selectedPeople))
              ?.replace(
                '{label}',
                selectedPeople === 1
                  ? t('reservations.person') || 'persona'
                  : t('reservations.people_label') || 'personas'
              ) || `${selectedPeople} ${selectedPeople === 1 ? 'persona' : 'personas'}`}
          </li>
          <li>
            <span className="font-medium">
              <TranslatedText tid="reservations.date_selected" fallback="Fecha seleccionada" />:
            </span>{' '}
            {selectedDate
              ? selectedDate.toLocaleDateString(currentLanguage === 'es' ? 'es-MX' : 'en-US')
              : t('common.pending') || 'Pendiente'}
          </li>
          <li>
            <span className="font-medium">
              <TranslatedText tid="reservations.time_selected" fallback="Hora reservada" />:
            </span>{' '}
            {selectedTime ?? (t('common.pending') || 'Pendiente')}
          </li>
          <li>
            <span className="font-medium">
              <TranslatedText tid="reservations.branch" fallback="Sucursal" />:
            </span>{' '}
            {BRANCH_LABEL} (#{BRANCH_NUMBER})
          </li>
          {preOrderItems.trim() && (
            <li>
              <span className="font-medium">
                <TranslatedText tid="reservations.pre_order" fallback="Pre-orden" />:
              </span>{' '}
              {preOrderItems.trim()}
            </li>
          )}
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
          {isSubmitting ? (
            <TranslatedText tid="reservations.creating_reservation" fallback="Creando reserva..." />
          ) : (
            <TranslatedText tid="reservations.confirm_reservation" fallback="Confirmar reserva" />
          )}
        </button>
        {hasReachedReservationLimit && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Solo puedes tener 3 reservas activas. Cancela una o espera a que concluya para crear
            otra.
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Presenta tu código 5 minutos antes; la tolerancia es de 10 minutos para mantener tu mesa.
        </p>
      </div>
    </form>
  );

  return (
    <CoffeeBackground className="py-10">
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-0">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <p className="text-xs uppercase tracking-[0.35em] text-primary-500">
              <TranslatedText tid="nav.reservas" fallback="Reservaciones" />
            </p>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
              <TranslatedText tid="reservations.title" fallback="Reserva tu mesa en Xoco Café" />
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <TranslatedText
                tid="reservations.subtitle"
                fallback="Selecciona fecha, hora y asistentes; te daremos un código QR único para tu llegada."
              />
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenReservationForm}
                  className="rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-700"
                  aria-expanded={showReservationForm}
                >
                  {showReservationForm ? (
                    <TranslatedText tid="reservations.hide_form" fallback="Ocultar formulario" />
                  ) : (
                    <TranslatedText tid="reservations.create_btn" fallback="Nueva reservación" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleRefreshReservations}
                  className="rounded-full border border-primary-600 px-5 py-2.5 text-sm font-semibold text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-200"
                >
                  <TranslatedText tid="reservations.refresh_btn" fallback="Actualizar lista" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-primary-600 px-5 py-2 text-center text-xs font-semibold tracking-[0.25em] uppercase text-white shadow hover:bg-primary-700"
              >
                <TranslatedText tid="orders.login" fallback="Iniciar sesión" />
              </Link>
            )}
          </div>
        </div>

        {isAuthenticated && loyaltyReminder.showReminder && (
          <LoyaltyReminderCard
            onActivate={handleActivateLoyaltyReminder}
            isLoading={loyaltyReminder.isActivating}
            className="mb-6"
          />
        )}
        <div className="mb-8 rounded-3xl border border-primary-100 bg-white p-5 text-sm text-gray-700 shadow-sm dark:border-primary-900/40 dark:bg-gray-900 dark:text-gray-200">
          <TranslatedText
            tid="reservations.qr_notice"
            fallback="Recibirás un código único para presentarlo a los anfitriones al llegar."
          />
        </div>
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2 rounded-3xl bg-primary-600 px-4 py-3 text-sm text-white shadow-lg dark:bg-primary-900/30 dark:text-primary-100">
          <span>
            <TranslatedText
              tid="orders.whatsapp_help_prompt"
              fallback="Si necesitas ayuda, mándanos un"
            />
          </span>
          <a
            href={siteMetadata.whats}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white shadow transition-colors hover:bg-white/30 dark:bg-[#0f1728]"
            aria-label="WhatsApp"
            onClick={handleWhatsappSnackbar}
          >
            <FaWhatsapp />
          </a>
          <span>
            <TranslatedText
              tid="profile.whatsapp_help_end"
              fallback="y con todo gusto te ayudamos."
            />
          </span>
        </div>
        {isAuthenticated ? (
          <>
            <div
              ref={reservationFormRef}
              className={`transition-all duration-500 ${
                showReservationForm
                  ? 'max-h-[5000px] scale-100 opacity-100'
                  : 'pointer-events-none max-h-0 scale-[0.98] opacity-0'
              }`}
              aria-hidden={!showReservationForm}
            >
              {showReservationForm && (
                <div className="mb-8 rounded-3xl border border-primary-100 bg-white p-6 shadow-2xl dark:border-primary-900/40 dark:bg-gray-950">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-primary-500">
                        <TranslatedText
                          tid="reservations.new_reservation"
                          fallback="Crear reservación"
                        />
                      </p>
                      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        <TranslatedText
                          tid="reservations.form_title"
                          fallback="Completa los datos de tu visita"
                        />
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <TranslatedText
                          tid="reservations.form_desc"
                          fallback="Selecciona fecha, hora, asistentes, agrega mensaje y revisa el resumen antes de confirmar."
                        />
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenReservationForm}
                      className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <TranslatedText tid="reservations.close_form" fallback="Cerrar formulario" />
                    </button>
                  </div>
                  <ReservationFormContent />
                </div>
              )}
            </div>

            <section
              ref={reservationBoardRef}
              className="mt-10 space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-primary-500">
                    <TranslatedText
                      tid="reservations.reservations_panel"
                      fallback="Panel de reservaciones"
                    />
                  </p>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    <TranslatedText tid="reservations.panel_title" fallback="Panel" />
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <TranslatedText
                      tid="reservations.panel_subtitle"
                      fallback="Organiza tus reservaciones en columnas pendientes/completadas, accede al historial y cancela desde el mismo panel."
                    />
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleOpenReservationForm}
                    disabled={hasReachedReservationLimit}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      hasReachedReservationLimit
                        ? 'border-gray-300 text-gray-400'
                        : 'border-primary-600 text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-200'
                    }`}
                    aria-expanded={showReservationForm}
                  >
                    {showReservationForm ? (
                      <TranslatedText tid="reservations.hide_form" fallback="Ocultar formulario" />
                    ) : (
                      <TranslatedText
                        tid="reservations.create_new_btn"
                        fallback="Crear nueva reserva"
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshReservations}
                    disabled={isLoadingReservations}
                    className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingReservations ? (
                      <TranslatedText tid="common.loading" fallback="Actualizando..." />
                    ) : (
                      <TranslatedText tid="reservations.refresh_btn" fallback="Actualizar lista" />
                    )}
                  </button>
                </div>
              </div>

              {hasReachedReservationLimit && (
                <div className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                  <TranslatedText
                    tid="reservations.res_limit_error"
                    fallback="Solo puedes tener 3 reservas activas. Debes esperar a que alguna finalice para crear otra."
                  />
                </div>
              )}

              {reservationsError && (
                <div className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-100">
                  {reservationsError}
                </div>
              )}

              <ReservationsSearchBar
                onSearch={setReservationFilter}
                isLoading={isLoadingReservations}
                onRefresh={handleRefreshReservations}
                onShowPast={() => setShowReservationHistory(true)}
                onShowCompleted={
                  showCompletedHistoryButton
                    ? () => setShowReservationCompletedHistory(true)
                    : undefined
                }
                showCompletedButton={showCompletedHistoryButton}
                disablePastButton={!hasPastReservations}
              />

              {isLoadingReservations ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2].map((index) => (
                    <div
                      key={index}
                      className="h-60 rounded-3xl border border-dashed border-gray-200 bg-gray-50 animate-pulse dark:border-gray-700 dark:bg-gray-900"
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="grid gap-6 lg:grid-cols-2"
                  aria-live="polite"
                  aria-label={t('reservations.panel_title') || 'Tablero de reservas'}
                >
                  <ReservationColumn
                    title={t('reservations.status_pending') || 'Pendientes'}
                    reservations={pendingReservations}
                    emptyLabel={
                      t('reservations.no_pending') ||
                      'No tienes reservas pendientes. Agenda una para asegurar tu lugar.'
                    }
                    onSelect={(reservation) => setSelectedReservation(reservation)}
                  />
                  <ReservationColumn
                    title={t('reservations.status_completed') || 'Completadas'}
                    reservations={completedReservations}
                    emptyLabel={
                      t('reservations.no_completed_reservations') ||
                      'Aún no completas reservaciones recientes.'
                    }
                    onSelect={(reservation) => setSelectedReservation(reservation)}
                  />
                </div>
              )}
            </section>

            {token && (
              <section className="mt-6 space-y-6 rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-lg dark:border-white/10 dark:bg-[#070d1a] dark:text-white">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    <TranslatedText
                      tid="reservations.uncompleted_title"
                      fallback="Reservas no completadas"
                    />
                  </h2>
                  <p className="text-sm text-gray-700 dark:text-white">
                    <TranslatedText
                      tid="reservations.uncompleted_desc"
                      fallback="Si no acudiste antes del corte (23:59), movemos la reserva aquí en color naranja y eliminamos su QR. El registro se conserva por 7 días."
                    />
                  </p>
                </div>
                {failedReservations.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-white">
                    <TranslatedText
                      tid="reservations.no_uncompleted"
                      fallback="No tienes reservas pendientes de seguimiento. ¡Todo al corriente!"
                    />
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {failedReservations.map((reservation) => {
                      const branchLabel =
                        reservation.branchId === BRANCH_ID ? BRANCH_LABEL : reservation.branchId;
                      const statusVisuals = getStatusVisuals('failed', t, 'failed');
                      const cleanupDate = new Date(reservation.cleanupAt).toLocaleDateString(
                        currentLanguage === 'es' ? 'es-MX' : 'en-US',
                        {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        }
                      );
                      const formattedDate = formatReservationDate(
                        reservation.reservationDate,
                        t('common.locale') === 'en' ? 'en-US' : 'es-MX',
                        {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        }
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
                            <span>
                              <TranslatedText tid="reservations.code" fallback="Código" />
                            </span>
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
                              {reservation.peopleCount === 1
                                ? t('reservations.person') || 'persona'
                                : t('reservations.people_label') || 'personas'}{' '}
                              · {branchLabel}
                              {reservation.branchNumber ? ` (#${reservation.branchNumber})` : ''}
                            </p>
                            {reservation.message && <p>Mensaje: {reservation.message}</p>}
                            {reservation.preOrderItems && (
                              <p className="text-primary-700 dark:text-primary-200">
                                <TranslatedText tid="reservations.pre_order" fallback="Pre-orden" />
                                : {reservation.preOrderItems}
                              </p>
                            )}
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusVisuals.badgeClass}`}
                            >
                              {statusVisuals.label}
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t('reservations.cleanup_notice')?.replace('{time}', cleanupDate) ||
                                `Registro disponible hasta ${cleanupDate}.`}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
            {selectedReservation && (
              <DetailModal onClose={() => setSelectedReservation(null)}>
                <ReservationDetailContent
                  reservation={selectedReservation}
                  onCancelReservation={handleCancelReservation}
                  currentUserName={user?.firstName || user?.email || null}
                  onDownloadTicket={handleDownloadReservationTicket}
                  onShareReservation={handleShareReservationTicket}
                  ticketRef={reservationTicketRef}
                  shareState={reservationShareState}
                  isMobile={reservationDeviceInfo.isMobile}
                />
              </DetailModal>
            )}
            {showReservationHistory && (
              <DetailModal onClose={() => setShowReservationHistory(false)}>
                <ReservationHistoryContent
                  title={t('reservations.past_history_title') || 'Reservas pasadas'}
                  reservations={basePastReservations}
                  onClose={() => setShowReservationHistory(false)}
                  hasFilter={Boolean(reservationFilter.trim())}
                  onSelect={(reservation) => {
                    setSelectedReservation(reservation);
                    setShowReservationHistory(false);
                  }}
                />
              </DetailModal>
            )}
            {showReservationCompletedHistory && (
              <DetailModal onClose={() => setShowReservationCompletedHistory(false)}>
                <ReservationHistoryContent
                  title={t('reservations.completed_history_title') || 'Reservas completadas'}
                  reservations={completedReservationsLastWeek}
                  onClose={() => setShowReservationCompletedHistory(false)}
                  hasFilter={Boolean(reservationFilter.trim())}
                  onSelect={(reservation) => {
                    setSelectedReservation(reservation);
                    setShowReservationCompletedHistory(false);
                  }}
                />
              </DetailModal>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <p className="mb-4">
              <TranslatedText
                tid="reservations.login_to_reserve"
                fallback="Necesitas iniciar sesión para crear o consultar tus reservaciones."
              />
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700"
            >
              <TranslatedText tid="orders.login_btn" fallback="Ir a iniciar sesión" />
            </Link>
          </div>
        )}
        <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
      </div>
    </CoffeeBackground>
  );
}

const ReservationColumn = ({
  title,
  highlight = 'text-primary-700 dark:text-[#d4a373]',
  reservations,
  emptyLabel,
  onSelect,
}: {
  title: string;
  highlight?: string;
  reservations: ReservationRecord[];
  emptyLabel: string;
  onSelect: (reservation: ReservationRecord) => void;
}) => {
  const { t } = useLanguage();
  const pagination = usePagination(reservations, 3);
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 text-gray-900 shadow-lg dark:border-white/10 dark:bg-[#070d1a] dark:text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500 dark:text-primary-200">
            {title}
          </p>
          <p className={`text-lg font-semibold ${highlight}`}>
            {t('reservations.num_reservations')?.replace('{count}', String(reservations.length)) ||
              `${reservations.length} reservas`}
          </p>
        </div>
        <span className="text-xs text-gray-500 dark:text-white/60">
          {pagination.totalItems > 3
            ? t('orders.page_of')
                ?.replace('{page}', String(pagination.items.length))
                ?.replace('{total}', String(pagination.totalItems)) ||
              `Mostrando ${pagination.items.length} de ${pagination.totalItems}`
            : null}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {reservations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-white/15 dark:bg-[#111b31] dark:text-white/70">
            {emptyLabel}
          </p>
        ) : (
          pagination.items.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} onSelect={onSelect} />
          ))
        )}
      </div>
      {pagination.hasPagination && (
        <ColumnPager
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          onPrev={pagination.prev}
          onNext={pagination.next}
        />
      )}
    </div>
  );
};

const ColumnPager = ({
  page,
  totalPages,
  totalItems,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
}) => {
  const { t } = useLanguage();
  return (
    <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
      <button
        type="button"
        onClick={onPrev}
        className="rounded-full border border-gray-200 px-3 py-1 font-semibold hover:border-primary-400 hover:text-primary-600 dark:border-gray-700"
        disabled={page === 0}
      >
        <TranslatedText tid="orders.prev" fallback="Anterior" />
      </button>
      <span>
        {t('orders.pager_text')
          ?.replace('{page}', String(page + 1))
          ?.replace('{total}', String(totalPages))
          ?.replace('{count}', String(totalItems)) ||
          `Página ${page + 1} de ${totalPages} · ${totalItems} registros`}
      </span>
      <button
        type="button"
        onClick={onNext}
        className="rounded-full border border-gray-200 px-3 py-1 font-semibold hover:border-primary-400 hover:text-primary-600 dark:border-gray-700"
        disabled={page >= totalPages - 1}
      >
        <TranslatedText tid="orders.next" fallback="Siguiente" />
      </button>
    </div>
  );
};

const ReservationCard = ({
  reservation,
  onSelect,
}: {
  reservation: ReservationRecord;
  onSelect: (reservation: ReservationRecord) => void;
}) => {
  const { t, currentLanguage } = useLanguage();
  const visuals = getStatusVisuals(reservation.status, t);
  const parsedDate = parseReservationDate(reservation);
  return (
    <button
      type="button"
      onClick={() => onSelect(reservation)}
      className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-[32px] overflow-hidden group"
    >
      <div className="bg-white/95 dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-5 transition-all hover:bg-white dark:hover:bg-gray-800 shadow-sm hover:shadow-md">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className={classNames('w-2 h-2 rounded-full', visuals.dotClass)} />
            <span
              className={classNames(
                'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                visuals.badgeClass
              )}
            >
              {visuals.label}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-medium">
            {reservation.reservationCode}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
            {parsedDate
              ? parsedDate.toLocaleString(currentLanguage === 'es' ? 'es-MX' : 'en-US', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : `${reservation.reservationDate} · ${reservation.reservationTime}`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
            <TranslatedText tid="reservations.people" fallback="Personas" />:{' '}
            {reservation.peopleCount} ·{' '}
            <TranslatedText tid="reservations.branch" fallback="Sucursal" />:{' '}
            {reservation.branchNumber || '001'}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            <TranslatedText tid="reservations.view_detail" fallback="Ver detalle" /> →
          </span>
          <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center">
            <FiCalendar className="text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>
    </button>
  );
};

const ReservationsSearchBar = ({
  onSearch,
  isLoading,
  onRefresh,
  onShowPast,
  onShowCompleted,
  showCompletedButton,
  disablePastButton,
}: {
  onSearch: (value: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  onShowPast: () => void;
  onShowCompleted?: () => void;
  showCompletedButton?: boolean;
  disablePastButton?: boolean;
}) => {
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    const looksLikeEmail = /\S+@\S+\.\S+/.test(trimmed);
    if (looksLikeEmail) {
      setError(t('reservations.search_error_email') || 'Ingresa código o fecha (evita correos).');
      return;
    }
    setError(null);
    onSearch(trimmed);
  };

  return (
    <div className="space-y-3 text-xs text-gray-500 dark:text-gray-400">
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <label className="flex flex-col text-[var(--brand-muted)]" htmlFor="reservation-search">
          <span className="sr-only">Buscar código o fecha</span>
          <span
            className="font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-300"
            aria-hidden="true"
          >
            <TranslatedText tid="reservations.search_label" fallback="Buscar código o fecha" />
          </span>
          <input
            id="reservation-search"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            placeholder={t('reservations.search_placeholder') || 'Código o fecha (ej. 2024-05-12)'}
            className="mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700"
        >
          <TranslatedText tid="common.search" fallback="Buscar" />
        </button>
        <button
          type="button"
          onClick={() => {
            setValue('');
            setError(null);
            onSearch('');
          }}
          className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
        >
          <TranslatedText tid="common.clear" fallback="Limpiar" />
        </button>
        <div className="flex items-center gap-3">
          {isLoading && <TranslatedText tid="common.loading" fallback="Actualizando..." />}
          <button
            type="button"
            onClick={() => onRefresh()}
            className="rounded-full border border-primary-200 px-3 py-1 font-semibold text-primary-600 transition hover:bg-primary-50 dark:border-gray-700 dark:text-primary-200"
          >
            <TranslatedText tid="common.refresh" fallback="Refrescar" />
          </button>
        </div>
      </form>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onShowPast}
          className="rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          disabled={disablePastButton}
        >
          <TranslatedText tid="reservations.past_btn" fallback="Pasadas" />
        </button>
        {showCompletedButton && onShowCompleted && (
          <button
            type="button"
            onClick={onShowCompleted}
            className="rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700"
          >
            <TranslatedText tid="reservations.completed_btn" fallback="Completadas" />
          </button>
        )}
      </div>
    </div>
  );
};

const DetailModal = ({ children, onClose }: { children: ReactNode; onClose: () => void }) => {
  const headerHeight = useHeaderHeight();
  const { t } = useLanguage();
  const modalVars = useMemo(() => {
    const safeHeaderHeight = Number.isFinite(headerHeight) ? headerHeight : 96;
    const mobileTopOffset = Math.round(Math.max(safeHeaderHeight * 0.45, 48));
    const desktopTopOffset = Math.round(Math.max(safeHeaderHeight * 1.2, safeHeaderHeight + 32));
    const mobileHeight = `calc(100vh - ${mobileTopOffset + 48}px)`;
    const desktopHeight = `min(calc((100vh - ${desktopTopOffset}px) * 1.35), calc(100vh - ${Math.round(
      safeHeaderHeight * 0.25
    )}px))`;
    return {
      '--detail-modal-mobile-top': `${mobileTopOffset}px`,
      '--detail-modal-desktop-top': `${desktopTopOffset}px`,
      '--detail-modal-mobile-height': mobileHeight,
      '--detail-modal-desktop-height': desktopHeight,
    } as CSSProperties;
  }, [headerHeight]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className={classNames(
        'fixed inset-0 z-50 flex items-start justify-center',
        'px-3 pb-[calc(72px+env(safe-area-inset-bottom))] pt-[var(--detail-modal-mobile-top)]',
        'sm:px-6 sm:pb-10 sm:pt-[var(--detail-modal-desktop-top)]'
      )}
      style={modalVars}
    >
      <div
        className="absolute inset-0 bg-black/70"
        role="button"
        tabIndex={-1}
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClose();
          }
        }}
      />
      <div
        className={classNames(
          'relative z-10 w-full max-w-3xl overflow-y-auto border border-[#462b20] bg-[#2a170f] text-white shadow-[0_45px_95px_rgba(0,0,0,0.85)]',
          'rounded-t-[34px] sm:rounded-[34px]',
          'h-[var(--detail-modal-mobile-height)] max-h-[var(--detail-modal-mobile-height)] sm:h-[var(--detail-modal-desktop-height)] sm:max-h-[var(--detail-modal-desktop-height)]',
          'p-6 sm:p-7'
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label={t('orders.close') || 'Cerrar detalle'}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

const ReservationDetailContent = ({
  reservation,
  onCancelReservation,
  currentUserName,
  onDownloadTicket,
  onShareReservation,
  ticketRef,
  shareState,
  isMobile,
}: {
  reservation: ReservationRecord;
  onCancelReservation?: (reservation: ReservationRecord) => void;
  currentUserName?: string | null;
  onDownloadTicket?: (reservation: ReservationRecord) => void;
  onShareReservation?: (reservation: ReservationRecord) => void;
  ticketRef?: MutableRefObject<HTMLDivElement | null>;
  shareState?: { error: string | null; isProcessing: boolean };
  isMobile?: boolean;
}) => {
  const { t, currentLanguage } = useLanguage();
  const visuals = getStatusVisuals(reservation.status, t);
  const isExpired =
    reservation.status === 'past' ||
    reservation.status === 'failed' ||
    reservation.status === 'cancelled';

  const { user } = useAuth();
  const slotDateTime = buildSlotDateTime(reservation.reservationDate, reservation.reservationTime);
  const qrExpiresAt = new Date(slotDateTime.getTime() + QR_EXPIRATION_MINUTES * 60 * 1000);
  const qrIsActive = Date.now() < qrExpiresAt.getTime();
  const branchLabel = reservation.branchId === BRANCH_ID ? BRANCH_LABEL : reservation.branchId;
  const resolvedCustomerName =
    currentUserName || user?.firstName || user?.email || t('orders.client') || 'Cliente Xoco Café';

  const qrPayload = {
    type: 'reservation',
    reservationId: reservation.id,
    reservationCode: reservation.reservationCode,
    code: reservation.reservationCode,
    id: reservation.id,
    user: resolvedCustomerName,
    customerName: resolvedCustomerName,
    date: reservation.reservationDate,
    time: reservation.reservationTime,
    people: reservation.peopleCount,
    branch: branchLabel,
    branchNumber: reservation.branchNumber || BRANCH_NUMBER,
    message: reservation.message || null,
    preOrderItems: reservation.preOrderItems || null,
    clientId: user?.clientId ?? null,
    customerId: user?.clientId ?? null,
    email: user?.email ?? null,
    phone: user?.phone ?? null,
  };

  const qrImageSrc = `${QR_API_URL}?size=${QR_IMAGE_SIZE}&data=${encodeURIComponent(
    JSON.stringify(qrPayload)
  )}`;

  const displayDateTime = formatReservationDateTime(reservation, t);
  const showCancelButton =
    onCancelReservation && (reservation.status === 'active' || reservation.status === 'pending');

  return (
    <div className="space-y-6">
      <div
        ref={ticketRef}
        className="flex flex-col items-center justify-center rounded-[40px] border border-gray-100 !bg-white p-8 text-gray-900 shadow-xl dark:border-white/10 dark:!bg-[#0f1524] dark:text-gray-100"
        style={{ backgroundColor: '#0f1524' }}
      >
        <div className="mb-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <div className={classNames('w-2 h-2 rounded-full animate-pulse', visuals.dotClass)} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">
              {visuals.label}
            </span>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.4em] text-gray-400">
            {t('reservations.code') || 'Código'}: {reservation.reservationCode}
          </p>
        </div>

        <div className="relative mb-8 p-4 bg-white rounded-3xl shadow-inner">
          {!qrIsActive || isExpired ? (
            <div className="flex aspect-square h-52 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
              <p className="px-4 text-center text-xs font-bold uppercase tracking-widest">
                <TranslatedText tid="reservations.expired_qr" fallback="QR expirado" />
              </p>
            </div>
          ) : (
            <Image
              src={qrImageSrc}
              alt="Código QR de la reserva"
              width={220}
              height={220}
              className="rounded-2xl"
            />
          )}
        </div>

        {qrIsActive && !isExpired && (
          <div className="mb-8 flex flex-col items-center text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
              {t('reservations.valid_until')?.replace(
                '{time}',
                qrExpiresAt.toLocaleTimeString(currentLanguage === 'es' ? 'es-MX' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              ) ||
                `QR válido hasta las ${qrExpiresAt.toLocaleTimeString(
                  currentLanguage === 'es' ? 'es-MX' : 'en-US',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )}`}
            </p>
            <p className="mt-1 text-[9px] font-medium text-gray-400 max-w-[200px] leading-relaxed">
              {t('reservations.expiration_notice')?.replace(
                '{min}',
                String(QR_EXPIRATION_MINUTES)
              ) || `El QR expira ${QR_EXPIRATION_MINUTES} min después de la hora reservada.`}
            </p>
          </div>
        )}

        <div className="w-full space-y-4 pt-6 border-t border-gray-100 dark:border-white/5">
          <DetailRow label={t('reservations.state') || 'Estado'} value={visuals.label} />
          <DetailRow
            label={t('reservations.date_time') || 'Fecha y Hora'}
            value={displayDateTime}
          />
          <DetailRow
            label={t('reservations.people') || 'Personas'}
            value={reservation.peopleCount.toString()}
          />
          <DetailRow
            label={t('reservations.branch') || 'Sucursal'}
            value={reservation.branchNumber || '001'}
          />
        </div>

        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-primary-600"
          data-html2canvas-ignore="true"
        >
          {isMobile
            ? onShareReservation && (
                <button
                  type="button"
                  onClick={() => onShareReservation(reservation)}
                  className="hover:text-primary-800"
                  disabled={shareState?.isProcessing}
                >
                  {shareState?.isProcessing ? (
                    <TranslatedText tid="common.loading" fallback="Compartiendo…" />
                  ) : (
                    <TranslatedText tid="reservations.share" fallback="Compartir reservación" />
                  )}
                </button>
              )
            : onDownloadTicket && (
                <button
                  type="button"
                  onClick={() => onDownloadTicket(reservation)}
                  className="hover:text-primary-800"
                  disabled={shareState?.isProcessing}
                >
                  {shareState?.isProcessing ? (
                    <TranslatedText tid="common.loading" fallback="Descargando…" />
                  ) : (
                    <TranslatedText tid="reservations.download" fallback="Descargar reserva" />
                  )}
                </button>
              )}
        </div>
        {shareState?.error && (
          <p
            className="mt-2 text-center text-xs font-semibold text-red-300"
            data-html2canvas-ignore="true"
          >
            {shareState.error}
          </p>
        )}
      </div>

      {(reservation.preOrderItems || reservation.message) && (
        <div className="flex flex-col gap-4">
          {reservation.preOrderItems && (
            <div className="rounded-3xl border border-white/10 bg-[#161d30] px-4 py-3 text-sm text-white">
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">
                <TranslatedText tid="reservations.pre_order" fallback="Pre-orden" />
              </p>
              <p className="mt-1 whitespace-pre-line">{reservation.preOrderItems}</p>
            </div>
          )}
          {reservation.message && (
            <div className="rounded-3xl border border-white/10 bg-[#161d30] px-4 py-3 text-sm text-white">
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">
                <TranslatedText tid="common.message" fallback="Mensaje" />
              </p>
              <p className="mt-1">{reservation.message}</p>
            </div>
          )}
        </div>
      )}

      {showCancelButton && (
        <div
          className="border-t border-gray-100 dark:border-white/5 pt-6"
          data-html2canvas-ignore="true"
        >
          <button
            type="button"
            onClick={() => onCancelReservation && onCancelReservation(reservation)}
            className="w-full rounded-2xl border border-red-200 bg-red-50 py-3 text-xs font-bold uppercase tracking-widest text-red-600 transition hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
          >
            <TranslatedText tid="reservations.cancel_btn" fallback="Cancelar reservación" />
          </button>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({
  label,
  value,
  variant = 'light',
}: {
  label: string;
  value: ReactNode;
  variant?: 'light' | 'dark';
}) => (
  <div
    className={`flex items-center justify-between text-sm ${
      variant === 'dark' ? 'text-white/80' : 'text-gray-600 dark:text-gray-300'
    }`}
  >
    <span
      className={`font-semibold ${
        variant === 'dark' ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      {label}
    </span>
    <span className={variant === 'dark' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}>
      {value}
    </span>
  </div>
);

const ReservationHistoryContent = ({
  title,
  reservations,
  onClose,
  hasFilter,
  onSelect,
}: {
  title: string;
  reservations: ReservationRecord[];
  onClose: () => void;
  hasFilter: boolean;
  onSelect: (reservation: ReservationRecord) => void;
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    if (!query.trim()) {
      return reservations;
    }
    const term = query.trim().toLowerCase();
    return reservations.filter((reservation) =>
      buildReservationSearchTerms(reservation).some((value) => value.toLowerCase().includes(term))
    );
  }, [query, reservations]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-primary-500">{title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {hasFilter
              ? t('reservations.history_filter_notice') ||
                'Los filtros se aplican a estos resultados.'
              : t('reservations.history_no_filter_notice') ||
                'Incluye registros de los últimos días.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400 hover:text-gray-600"
        >
          {t('common.close') || 'Cerrar'}
        </button>
      </div>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label
        className="flex flex-col text-xs text-gray-500 dark:text-gray-400"
        htmlFor="history-search"
      >
        <TranslatedText tid="reservations.search_history" fallback="Buscar en historial" />
        <input
          id="history-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('reservations.history_search_placeholder') || 'Código, fecha o sucursal'}
          className="mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </label>
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900">
          <TranslatedText
            tid="reservations.no_results_history"
            fallback="No encontramos reservaciones con ese criterio."
          />
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};
