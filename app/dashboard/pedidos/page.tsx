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

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import siteMetadata from 'content/siteMetadata';
import Snackbar from '@/components/Feedback/Snackbar';
import { useAuth } from '@/components/Auth/AuthProvider';
import LoyaltyReminderCard from '@/components/LoyaltyReminderCard';
import FavoriteItemsList from '@/components/FavoriteItemsList';
import LoyaltyProgressCard from '@/components/LoyaltyProgressCard';
import { TicketAssignmentNotice } from '@/components/Orders/TicketAssignmentNotice';
import { usePagination } from '@/hooks/use-pagination';
import { useLoyaltyReminder } from '@/hooks/useLoyaltyReminder';
import VirtualTicket from '@/components/Orders/VirtualTicket';
import { useSnackbarNotifications, type SnackbarTone } from '@/hooks/useSnackbarNotifications';
import { useOrders } from '@/hooks/useOrders';
import { useLoyalty } from '@/hooks/useLoyalty';
import { useTicketDetails } from '@/hooks/useTicketDetails';
import { resolveFavoriteLabel } from '@/lib/menuFavorites';
import { useClientFavorites } from '@/hooks/useClientFavorites';

interface Order {
  id: string;
  orderNumber?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'past';
  ticketId?: string | null;
  userEmail?: string | null;
  customerName?: string | null;
  posCustomerId?: string | null;
  total?: number | null;
  tipAmount?: number | null;
  tipPercent?: number | null;
  deliveryTipAmount?: number | null;
  deliveryTipPercent?: number | null;
  prepStatus?: 'pending' | 'in_progress' | 'completed' | null;
  prepHandlerName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  type?: string | null;
  items?: unknown;
  qrPayload?: unknown;
  shipping?: {
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      reference?: string;
    };
    contactPhone?: string;
    isWhatsapp?: boolean;
    addressId?: string | null;
    deliveryTip?: {
      amount?: number | null;
      percent?: number | null;
    } | null;
  } | null;
}

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'Pendiente',
  in_progress: 'En preparación',
  completed: 'Completado',
  past: 'Histórico',
};

const getOrderDisplayCode = (order: Order) =>
  order.ticketId ?? order.orderNumber ?? order.id.slice(0, 6);

const resolveOrderStatus = (order?: Partial<Order> | null): Order['status'] => {
  if (!order) {
    return 'pending';
  }
  return (order.prepStatus as Order['status']) ?? order.status ?? 'pending';
};

const formatOrderCustomer = (order: Order) => {
  const preferred = (order.customerName ?? '').trim();
  if (preferred.length > 0) return preferred;
  const fallback = (order.userEmail ?? '').trim();
  if (fallback.length > 0) return fallback;
  return 'Público general';
};
const normalizeQuantity = (value: unknown) => {
  const numberValue = Number(value);
  if (Number.isFinite(numberValue) && numberValue > 0) {
    return numberValue;
  }
  return 1;
};

const parseTextQuantity = (value: string) => {
  const match = value.trim().match(/^[^\d]*(?<qty>\d+)\s*[x×]/i);
  return match?.groups?.qty ? Number(match.groups.qty) : 1;
};

type ItemWithQuantity = {
  quantity?: unknown;
};

type NoticePayload = {
  message: string;
  tone: SnackbarTone;
  title: string;
  body?: string;
};

const useOrderStatusTracker = (
  showSnackbar: (
    message: string,
    tone?: SnackbarTone,
    options?: { deviceNotification?: { title: string; body?: string } | null }
  ) => void
) => {
  const hasSnapshotRef = useRef(false);
  const statusMapRef = useRef(new Map<string, Order['status']>());

  return useCallback(
    (orders: Order[]) => {
      const notices: NoticePayload[] = [];
      const seenIds = new Set<string>();

      orders.forEach((order) => {
        const orderId = order.id;
        const nextStatus = resolveOrderStatus(order);
        const prevStatus = statusMapRef.current.get(orderId);
        const displayCode = getOrderDisplayCode(order);
        seenIds.add(orderId);

        if (!hasSnapshotRef.current) {
          statusMapRef.current.set(orderId, nextStatus);
          return;
        }

        if (prevStatus === undefined) {
          notices.push({
            tone: 'success',
            message: `Pedido ${displayCode} registrado correctamente.`,
            title: 'Nuevo pedido creado',
            body: `Ticket ${displayCode} está en cola.`,
          });
        } else if (prevStatus !== nextStatus) {
          if (nextStatus === 'in_progress') {
            notices.push({
              tone: 'info',
              message: `Tu pedido ${displayCode} está en preparación.`,
              title: 'Pedido en preparación',
              body: 'Tu orden ya está siendo atendida.',
            });
          } else if (nextStatus === 'completed') {
            notices.push({
              tone: 'success',
              message: `Pedido ${displayCode} completado. Puedes recogerlo.`,
              title: 'Pedido completado',
              body: 'Tu orden está lista para entrega.',
            });
          }
        }

        statusMapRef.current.set(orderId, nextStatus);
      });

      statusMapRef.current.forEach((_, id) => {
        if (!seenIds.has(id)) {
          statusMapRef.current.delete(id);
        }
      });

      if (!hasSnapshotRef.current) {
        hasSnapshotRef.current = true;
        return;
      }

      if (notices.length > 0) {
        notices.forEach((notice, index) => {
          window.setTimeout(() => {
            showSnackbar(notice.message, notice.tone, {
              deviceNotification: {
                title: notice.title,
                body: notice.body,
              },
            });
          }, index * 150);
        });
      }
    },
    [showSnackbar]
  );
};

const extractOrderItems = (items: unknown) => {
  if (!items) return [];
  const normalizeItem = (item: unknown) => {
    const quantity =
      item && typeof item === 'object' && 'quantity' in item
        ? (item as ItemWithQuantity).quantity
        : undefined;
    return { quantity: normalizeQuantity(quantity ?? 1) };
  };
  if (Array.isArray(items)) {
    return items.map(normalizeItem);
  }
  if (
    typeof items === 'object' &&
    items !== null &&
    Array.isArray((items as { list?: unknown[] }).list)
  ) {
    return ((items as { list: unknown[] }).list ?? []).map(normalizeItem);
  }
  if (
    typeof items === 'object' &&
    items !== null &&
    (Array.isArray((items as { beverages?: unknown[] }).beverages) ||
      Array.isArray((items as { foods?: unknown[] }).foods) ||
      Array.isArray((items as { others?: unknown[] }).others))
  ) {
    const beverages = Array.isArray((items as { beverages?: unknown[] }).beverages)
      ? (items as { beverages: unknown[] }).beverages
      : [];
    const foods = Array.isArray((items as { foods?: unknown[] }).foods)
      ? (items as { foods: unknown[] }).foods
      : [];
    const others = Array.isArray((items as { others?: unknown[] }).others)
      ? (items as { others: unknown[] }).others
      : [];
    return [...beverages, ...foods, ...others].map(normalizeItem);
  }
  if (typeof items === 'object' && items !== null) {
    const body = (items as { body?: unknown }).body;
    if (typeof body === 'string') {
      return body
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => /\d+\s*[x×]/i.test(line))
        .map((line) => ({ quantity: normalizeQuantity(parseTextQuantity(line)) }));
    }
    if (Array.isArray(body)) {
      return body.map((entry) =>
        typeof entry === 'string'
          ? { quantity: normalizeQuantity(parseTextQuantity(entry)) }
          : normalizeItem(entry)
      );
    }
  }
  return [];
};

const getOrderArticles = (order: Order) =>
  extractOrderItems(order.items).reduce((total, item) => total + item.quantity, 0);
const getOrderTicketCode = (order: Order) =>
  (order.ticketId ?? order.orderNumber ?? '').trim().toUpperCase();
const isClientTicket = (order: Order) => {
  const code = getOrderTicketCode(order);
  if (!code) return true;
  if (code.startsWith('XL-')) return false;
  if (code.startsWith('C-')) return true;
  return true;
};

const formatOrderChannelLabel = (order: Order) => {
  const code = (order.ticketId ?? order.orderNumber ?? '').toUpperCase();
  if (code.startsWith('C-')) {
    return 'Cliente';
  }
  if (code.startsWith('XL-')) {
    return 'Xoco';
  }
  return (order.type ?? 'Web').toUpperCase();
};

const OrderCard = ({ order, onSelect }: { order: Order; onSelect: (order: Order) => void }) => {
  const effectiveStatusKey = (order.prepStatus as Order['status']) ?? order.status ?? 'pending';
  const status = STATUS_LABELS[effectiveStatusKey] ?? STATUS_LABELS.pending;
  const channelLabel = formatOrderChannelLabel(order);
  return (
    <button
      type="button"
      onClick={() => onSelect(order)}
      className="w-full rounded-[32px] border border-gray-200 bg-white/95 p-5 text-left text-sm text-gray-900 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-white/10 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-gray-200">
            {getOrderDisplayCode(order)}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {channelLabel === 'CLIENTE' ? 'Pedido cliente' : `Pedido ${channelLabel}`}
            <span className="text-primary-600 dark:text-primary-100"> · {status}</span>
          </p>
        </div>
        <div className="text-right text-xs uppercase tracking-[0.35em] text-gray-400 dark:text-gray-100">
          {order.createdAt
            ? new Date(order.createdAt).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '--:--'}
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-200">
        Cliente: {formatOrderCustomer(order)} · Ticket POS: {order.ticketId ?? 'Sin ticket'}
      </p>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-200">
        <span>Artículos: {getOrderArticles(order)}</span>
        <span className="text-base font-semibold text-primary-700 dark:text-gray-50">
          {formatCurrency(order.total)}
        </span>
      </div>
      <div className="mt-3 grid gap-1 text-xs text-gray-500 dark:text-gray-300">
        <p>Selecciona para ver detalle.</p>
      </div>
    </button>
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
}) => (
  <div className="mt-4 flex items-center justify-between text-xs text-gray-600 dark:text-white/70">
    <button
      type="button"
      onClick={onPrev}
      className="rounded-full border border-gray-200 px-3 py-1 font-semibold hover:border-primary-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-white dark:hover:border-primary-400 dark:hover:text-primary-200"
      disabled={page === 0}
    >
      Anterior
    </button>
    <span>
      Página {page + 1} de {totalPages} · {totalItems} registros
    </span>
    <button
      type="button"
      onClick={onNext}
      className="rounded-full border border-gray-200 px-3 py-1 font-semibold hover:border-primary-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-white dark:hover:border-primary-400 dark:hover:text-primary-200"
      disabled={page + 1 >= totalPages}
    >
      Siguiente
    </button>
  </div>
);

const OrdersBoardColumn = ({
  title,
  description,
  orders,
  emptyLabel,
  onSelect,
}: {
  title: string;
  description: string;
  orders: Order[];
  emptyLabel: string;
  onSelect: (order: Order) => void;
}) => {
  const pagination = usePagination(orders, 3);
  return (
    <div className="rounded-3xl border border-[#e8eaef] bg-white p-5 text-gray-900 shadow-sm dark:border-white/10 dark:bg-[#070d1a] dark:text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-primary-600 dark:text-primary-200">
            {title}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {orders.length} pedidos
          </p>
          <p className="text-xs text-gray-500 dark:text-white/60">{description}</p>
        </div>
        <span className="text-xs text-gray-500 dark:text-white/60">
          {pagination.totalItems > 3
            ? `Mostrando ${pagination.items.length} de ${pagination.totalItems}`
            : null}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {orders.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#e8eaef] bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-white/10 dark:bg-[#070d1a] dark:text-white/70">
            {emptyLabel}
          </p>
        ) : (
          pagination.items.map((order) => (
            <OrderCard key={order.id} order={order} onSelect={onSelect} />
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

const HistoricalModal = ({
  open,
  onClose,
  orders,
}: {
  open: boolean;
  onClose: () => void;
  orders: Order[];
}) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const updateScrollProgress = () => {
    const container = listRef.current;
    if (!container) {
      setScrollProgress(0);
      return;
    }
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    const nextProgress = (container.scrollTop / maxScroll) * 100;
    setScrollProgress(nextProgress);
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const container = listRef.current;
    if (!container) return;
    const value = Number(event.target.value);
    setScrollProgress(value);
    const maxScroll = container.scrollHeight - container.clientHeight;
    container.scrollTop = (value / 100) * maxScroll;
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-3 py-6 sm:px-6"
      role="presentation"
    >
      <div className="relative flex h-full w-full items-center justify-center">
        <button
          type="button"
          className="absolute inset-0 h-full w-full bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Cerrar registros históricos"
          onClick={onClose}
        />
        <div className="relative z-10 mx-auto flex h-full min-h-full max-w-4xl items-center justify-center">
          <div
            className="flex h-full min-h-0 w-full max-w-md flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-white/10 dark:bg-[#070d1a] dark:text-white"
            style={{ maxHeight: 'calc(100vh - 96px)', height: 'calc(100vh - 96px)' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 pb-3 pt-5 dark:border-white/10">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-primary-600 dark:text-primary-200">
                  Histórico
                </p>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Pedidos vencidos
                </h3>
                <p className="text-xs text-gray-500 dark:text-white/60">
                  Pedidos que pasaron el corte 23:59 · se depuran cada 48 horas.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/40 dark:bg-white dark:text-gray-900 dark:hover:bg-white/80"
              >
                Cerrar
              </button>
            </div>
            <div
              className="mx-auto mt-2 mb-4 h-1 w-12 rounded-full bg-gray-200 md:hidden"
              aria-hidden
            />
            <div
              className="scrollable flex-1 min-h-0 space-y-3 overflow-y-scroll overscroll-contain px-5 pb-4 pr-2"
              ref={listRef}
              onScroll={updateScrollProgress}
              role="region"
              aria-label="Registros históricos"
              style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              onWheelCapture={(event) => event.stopPropagation()}
              onTouchMoveCapture={(event) => event.stopPropagation()}
            >
              {orders.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:border-white/15 dark:bg-[#111b31] dark:text-white/70">
                  No hay pedidos históricos disponibles.
                </p>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-100 shadow-sm !bg-[#111827] dark:border-white/15 dark:!bg-[#111827]"
                    style={{ backgroundColor: '#111827' }}
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-gray-300 dark:text-white/60">
                      <span>{getOrderDisplayCode(order)}</span>
                      <span>
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString('es-MX')
                          : '--:--'}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-white dark:text-gray-100">
                      {formatOrderChannelLabel(order)} · {STATUS_LABELS.past}
                    </p>
                    <div className="mt-2 grid gap-1 text-xs text-gray-200 dark:text-gray-300">
                      <p>Cliente: {formatOrderCustomer(order)}</p>
                      <p className="font-semibold text-primary-200 dark:text-gray-50">
                        Total: {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-100 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-[0.35em] text-gray-400 dark:text-white/50">
                  Recorridos
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={scrollProgress}
                  onChange={handleSliderChange}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary-500 dark:bg-white/10"
                  aria-label="Desliza para recorrer los registros históricos"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value ?? 0);
}

export default function OrdersDashboardPage() {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [loyaltyNotice, setLoyaltyNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isAndroid: false,
    isIOS: false,
    isIPadOS: false,
  });
  const [isShareSupported, setIsShareSupported] = useState(false);
  const canShareTicket = isShareSupported && (deviceInfo.isAndroid || deviceInfo.isIOS);
  const ticketRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const isAuthenticated = Boolean(user && token);
  const {
    snackbar,
    showSnackbar,
    dismissSnackbar,
    notificationPermission,
    requestNotificationPermission,
    shouldDisplayPermissionPrompt,
    notificationSupported,
  } = useSnackbarNotifications();
  const trackOrderStatuses = useOrderStatusTracker(showSnackbar);
  const { orders, isLoading, error, refresh } = useOrders<Order>({
    token,
    enabled: Boolean(token) && !isAuthLoading,
    pollingIntervalMs: 60_000,
  });
  const [ticketIdentifier, setTicketIdentifier] = useState<string | null>(null);
  const {
    data: ticketDetails,
    isLoading: isTicketLoading,
    error: ticketDetailsError,
  } = useTicketDetails(ticketIdentifier);
  const { stats: loyaltyStats, isLoading: isLoyaltyLoading } = useLoyalty();
  const showMobileNotificationPrompt =
    notificationSupported &&
    (shouldDisplayPermissionPrompt || (deviceInfo.isIOS && notificationPermission === 'default'));

  const handleRequestPushPermission = useCallback(async () => {
    if (!notificationSupported) {
      showSnackbar(
        'Este navegador no permite notificaciones push. Revisa los ajustes del sistema o instala la app para activarlas.',
        'warning'
      );
      return;
    }
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      showSnackbar('Activamos las notificaciones para este dispositivo.', 'success');
    } else if (result === 'denied') {
      showSnackbar(
        'Tu navegador bloqueó las notificaciones. Revisa los ajustes de sitio o habilítalas manualmente.',
        'warning'
      );
    } else {
      showSnackbar('No pudimos abrir el aviso de permisos. Intenta de nuevo.', 'error');
    }
  }, [notificationSupported, requestNotificationPermission, showSnackbar]);

  useEffect(() => {
    trackOrderStatuses(orders);
  }, [orders, trackOrderStatuses]);

  useEffect(() => {
    if (!selectedOrder) {
      setTicketIdentifier(null);
      return;
    }
    const identifier = selectedOrder.ticketId ?? selectedOrder.orderNumber ?? selectedOrder.id;
    setTicketIdentifier((prev) => (prev === identifier ? prev : identifier));
  }, [selectedOrder]);

  const handleRefreshOrders = useCallback(() => {
    void refresh();
  }, [refresh]);

  const isExpiredPending = useCallback((order: Order) => {
    if (order.status !== 'pending' || !order.createdAt) {
      return false;
    }
    const cutoff = new Date(order.createdAt);
    cutoff.setHours(23, 59, 59, 999);
    return Date.now() > cutoff.getTime();
  }, []);

  const shouldAutoCompleteProduction = useCallback((order: Order) => {
    const productionActive =
      (order.prepStatus ?? '').toLowerCase() === 'in_progress' || order.status === 'in_progress';
    if (!productionActive || !order.createdAt) {
      return false;
    }
    const cutoff = new Date(order.createdAt);
    cutoff.setHours(23, 59, 59, 999);
    return Date.now() > cutoff.getTime();
  }, []);

  const getEffectiveStatus = useCallback(
    (order: Order): Order['status'] => {
      const normalizedPrep = (order.prepStatus ?? '').toLowerCase();
      if (normalizedPrep === 'completed') {
        return 'completed';
      }
      if (normalizedPrep === 'in_progress') {
        return shouldAutoCompleteProduction(order) ? 'completed' : 'in_progress';
      }
      if (order.status === 'in_progress') {
        return shouldAutoCompleteProduction(order) ? 'completed' : 'in_progress';
      }
      if (order.status === 'pending') {
        return isExpiredPending(order) ? 'past' : 'pending';
      }
      return order.status;
    },
    [isExpiredPending, shouldAutoCompleteProduction]
  );

  const boardColumns = useMemo(() => {
    const pendingBucket: Order[] = [];
    const prepBucket: Order[] = [];
    const completedBucket: Order[] = [];

    orders.forEach((order) => {
      const status = getEffectiveStatus(order);
      if (status === 'pending') {
        pendingBucket.push(order);
      } else if (status === 'in_progress') {
        prepBucket.push(order);
      } else if (status === 'completed') {
        completedBucket.push(order);
      }
    });

    const pastBucket = orders.filter((order) => getEffectiveStatus(order) === 'past');

    return {
      columns: [
        {
          key: 'pending' as const,
          label: 'Pendientes',
          description: 'Pedidos que aún no entran a barra',
          orders: pendingBucket,
        },
        {
          key: 'in_progress' as const,
          label: 'En preparación',
          description: 'Baristas trabajando en el pedido',
          orders: prepBucket,
        },
        {
          key: 'completed' as const,
          label: 'Completados',
          description: 'Listos para entregar o ya recolectados',
          orders: completedBucket,
        },
      ],
      pastBucket,
    };
  }, [getEffectiveStatus, orders]);

  const pendingOrders =
    boardColumns.columns.find((column) => column.key === 'pending')?.orders ?? [];
  const prepOrders =
    boardColumns.columns.find((column) => column.key === 'in_progress')?.orders ?? [];
  const completedOrdersList =
    boardColumns.columns.find((column) => column.key === 'completed')?.orders ?? [];
  const pendingClientOrders = pendingOrders.filter((order) => isClientTicket(order));
  const MAX_ACTIVE_ORDERS = 3;
  const hasReachedOrderLimit = isAuthenticated && pendingClientOrders.length >= MAX_ACTIVE_ORDERS;
  const expiredSelectedOrder = useMemo(
    () => (selectedOrder ? isExpiredPending(selectedOrder) : false),
    [selectedOrder, isExpiredPending]
  );
  const selectedOrderEffectiveStatus = useMemo(
    () => (selectedOrder ? getEffectiveStatus(selectedOrder) : null),
    [selectedOrder, getEffectiveStatus]
  );
  const shouldShowQr = selectedOrder ? !expiredSelectedOrder : false;
  const {
    showReminder: showLoyaltyReminder,
    isActivating: isActivatingLoyalty,
    activate: activateLoyaltyProgram,
  } = useLoyaltyReminder({
    userId: user?.id,
    enrolled: user?.loyaltyEnrolled ?? false,
    token,
  });
  const activeClientId = useMemo(() => {
    const fromOrder = selectedOrder?.posCustomerId?.trim();
    const fromTicket = ticketDetails?.customer?.clientId?.trim();
    return fromOrder || fromTicket || null;
  }, [selectedOrder?.posCustomerId, ticketDetails?.customer?.clientId]);
  const {
    data: clientFavorites,
    isLoading: isClientFavoritesLoading,
    error: clientFavoritesError,
  } = useClientFavorites(activeClientId, token);
  const activeLoyaltyCustomer = useMemo(() => {
    if (!loyaltyStats) {
      return null;
    }
    const normalizedClientId = activeClientId?.toLowerCase();
    const ticketUserId = ticketDetails?.customer?.id ?? null;
    return (
      loyaltyStats.customers.find((customer) => {
        if (normalizedClientId && customer.clientId?.toLowerCase() === normalizedClientId) {
          return true;
        }
        if (ticketUserId && customer.userId === ticketUserId) {
          return true;
        }
        return false;
      }) ?? null
    );
  }, [activeClientId, loyaltyStats, ticketDetails?.customer?.id]);
  const favoritesFromPos = clientFavorites?.favorites;
  const loyaltyFromPos = clientFavorites?.loyalty;
  const favoriteBeverageLabel =
    favoritesFromPos?.primaryBeverage?.label ??
    favoritesFromPos?.beverageCold?.label ??
    favoritesFromPos?.beverageHot?.label ??
    resolveFavoriteLabel(activeLoyaltyCustomer?.favoriteBeverage ?? null) ??
    activeLoyaltyCustomer?.favoriteBeverage ??
    null;
  const favoriteFoodLabel =
    favoritesFromPos?.food?.label ??
    resolveFavoriteLabel(activeLoyaltyCustomer?.favoriteFood ?? null) ??
    activeLoyaltyCustomer?.favoriteFood ??
    null;
  const shouldShowFavoritesPanel = Boolean(
    selectedOrder &&
      (activeClientId ||
        activeLoyaltyCustomer ||
        clientFavorites ||
        isLoyaltyLoading ||
        isClientFavoritesLoading)
  );
  const shouldShowLoyaltyPanel = Boolean(
    selectedOrder &&
      (activeLoyaltyCustomer || loyaltyFromPos || isLoyaltyLoading || isClientFavoritesLoading)
  );
  const loyaltyCardName =
    ticketDetails?.customer?.name ?? (selectedOrder ? formatOrderCustomer(selectedOrder) : null);
  const loyaltyOrders = activeLoyaltyCustomer?.orders ?? null;
  const loyaltyInteractions = activeLoyaltyCustomer?.totalInteractions ?? null;
  const loyaltyCoffees =
    loyaltyFromPos?.weeklyCoffeeCount ?? activeLoyaltyCustomer?.loyaltyCoffees ?? null;
  const combinedFavoritesLoading = isLoyaltyLoading || isClientFavoritesLoading;

  const handleLoyaltyActivation = useCallback(async () => {
    const result = await activateLoyaltyProgram();
    setLoyaltyNotice({
      type: result.success ? 'success' : 'error',
      message:
        result.message ??
        (result.success
          ? 'Activamos tu programa de lealtad. Ya puedes acumular sellos.'
          : 'No pudimos activar tu programa de lealtad. Intenta más tarde.'),
    });
  }, [activateLoyaltyProgram]);

  const [isProcessingTicket, setIsProcessingTicket] = useState(false);
  const [ticketActionError, setTicketActionError] = useState<string | null>(null);
  const runWithShareGuard = useCallback(async (action: () => Promise<void>) => {
    if (typeof document === 'undefined') {
      await action();
      return;
    }
    let wasHidden = false;
    let settled = false;
    let rejectAbort: ((reason?: unknown) => void) | null = null;
    const abortPromise = new Promise<never>((_, reject) => {
      rejectAbort = reject;
    });
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
        return;
      }
      if (document.visibilityState === 'visible' && wasHidden && !settled && rejectAbort) {
        rejectAbort(new Error('share_aborted_visibility'));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const cleanup = () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      rejectAbort = null;
    };
    try {
      await Promise.race([
        action().finally(() => {
          settled = true;
        }),
        abortPromise,
      ]);
    } finally {
      cleanup();
    }
  }, []);

  const detectDevice = useCallback(() => {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return;
    }
    type WindowWithOpera = Window & { opera?: string };
    const ua =
      navigator.userAgent ||
      navigator.vendor ||
      ((window as WindowWithOpera).opera ? String((window as WindowWithOpera).opera) : '');
    const isAndroid = /android/i.test(ua);
    const isIPad =
      /ipad/i.test(ua) ||
      (/macintosh/i.test(ua) &&
        typeof navigator.maxTouchPoints === 'number' &&
        navigator.maxTouchPoints > 1);
    const isIPhone = /iphone|ipod/i.test(ua);
    const isMobile = isAndroid || isIPad || isIPhone;
    const isIOS = isIPhone || isIPad;
    setDeviceInfo({
      isMobile,
      isAndroid,
      isIOS,
      isIPadOS: isIPad,
    });
    const supportsShare = typeof navigator.share === 'function';
    setIsShareSupported(supportsShare && (isAndroid || isIPhone || isIPad));
  }, []);

  useEffect(() => {
    detectDevice();
  }, [detectDevice]);

  const waitForTicketAssets = useCallback(async () => {
    if (!ticketRef.current) return;
    const images = Array.from(ticketRef.current.querySelectorAll('img'));
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
  }, [ticketRef]);

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [metadata, content] = dataUrl.split(',');
    const mimeMatch = metadata.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const byteString = atob(content);
    const length = byteString.length;
    const arrayBuffer = new ArrayBuffer(length);
    const uintArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < length; i += 1) {
      uintArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([uintArray], { type: mime });
  };

  const captureTicketAsBlob = useCallback(async () => {
    if (!ticketRef.current) return null;
    await waitForTicketAssets();
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(ticketRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });
    if (typeof canvas.toBlob !== 'function') {
      try {
        const dataUrl = canvas.toDataURL('image/png', 1);
        return dataUrlToBlob(dataUrl);
      } catch (error) {
        console.error('No pudimos convertir el ticket en imagen (fallback).', error);
        return null;
      }
    }
    return new Promise<Blob | null>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('No pudimos generar la imagen del ticket.'));
            return;
          }
          resolve(blob);
        },
        'image/png',
        1
      );
    });
  }, [waitForTicketAssets]);

  const buildTicketFileName = useCallback(() => {
    if (!selectedOrder) return 'ticket-xoco-cafe';
    return (selectedOrder.ticketId ?? selectedOrder.orderNumber ?? selectedOrder.id).toString();
  }, [selectedOrder]);

  const triggerDownload = useCallback(
    (blob: Blob, filename: string) => {
      const objectUrl = URL.createObjectURL(blob);
      if (deviceInfo.isMobile) {
        const newTab = window.open(objectUrl, '_blank');
        if (!newTab) {
          const mobileLink = document.createElement('a');
          mobileLink.href = objectUrl;
          mobileLink.download = `${filename}.png`;
          mobileLink.rel = 'noopener';
          document.body.appendChild(mobileLink);
          mobileLink.click();
          document.body.removeChild(mobileLink);
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
    [deviceInfo.isMobile]
  );

  const saveTicketToGallery = useCallback(
    async (blob: Blob, filename: string) => {
      if (
        !canShareTicket ||
        typeof navigator === 'undefined' ||
        typeof navigator.share !== 'function'
      ) {
        throw new Error('gallery_not_supported');
      }
      const file = new File([blob], `${filename}.png`, { type: 'image/png' });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        throw new Error('gallery_not_supported');
      }
      try {
        await runWithShareGuard(() =>
          navigator.share({
            files: [file],
            title: 'Ticket digital Xoco Café',
            text: 'Guardaremos tu ticket en tu galería.',
          })
        );
      } catch (error) {
        console.error('Error guardando ticket en galería:', error);
        if (
          error instanceof DOMException &&
          (error.name === 'AbortError' || error.name === 'NotAllowedError')
        ) {
          throw new Error('gallery_permission_denied');
        }
        if (error instanceof Error && error.message === 'share_aborted_visibility') {
          throw error;
        }
        throw new Error('gallery_share_failed');
      }
    },
    [canShareTicket, runWithShareGuard]
  );

  const handleDownloadTicket = useCallback(async () => {
    if (!selectedOrder) return;
    setTicketActionError(null);
    setIsProcessingTicket(true);
    try {
      const blob = await captureTicketAsBlob();
      if (!blob) {
        throw new Error('No pudimos generar el ticket');
      }
      const filename = buildTicketFileName();
      if (deviceInfo.isMobile && canShareTicket) {
        try {
          await saveTicketToGallery(blob, filename);
        } catch (mobileError) {
          if (mobileError instanceof Error && mobileError.message === 'gallery_permission_denied') {
            throw mobileError;
          }
          console.warn(
            'Fallo guardando ticket en galería, aplicando descarga estándar:',
            mobileError
          );
          triggerDownload(blob, filename);
          setTicketActionError(
            'No pudimos guardar tu ticket en la galería, pero lo enviamos a tu carpeta de descargas.'
          );
        }
        return;
      }
      triggerDownload(blob, filename);
    } catch (error) {
      console.error('Error descargando ticket:', error);
      if (error instanceof Error && error.message === 'share_aborted_visibility') {
        setTicketActionError('Cancelaste la acción antes de guardar el ticket.');
      } else if (error instanceof Error && error.message === 'gallery_permission_denied') {
        setTicketActionError(
          'Necesitamos permiso para guardar el ticket en tu galería. Intenta aceptarlo o usa el botón Compartir.'
        );
      } else if (error instanceof Error && error.message?.startsWith('gallery_')) {
        setTicketActionError(
          'No pudimos guardar tu ticket en la galería. Revisa los permisos o usa Compartir.'
        );
      } else {
        setTicketActionError('No pudimos descargar el ticket. Intenta de nuevo.');
      }
    } finally {
      setIsProcessingTicket(false);
    }
  }, [
    buildTicketFileName,
    canShareTicket,
    captureTicketAsBlob,
    deviceInfo.isMobile,
    saveTicketToGallery,
    selectedOrder,
    triggerDownload,
  ]);

  const handleShareTicket = useCallback(async () => {
    if (
      !selectedOrder ||
      typeof navigator === 'undefined' ||
      typeof navigator.share !== 'function' ||
      !(deviceInfo.isAndroid || deviceInfo.isIOS) ||
      !isShareSupported
    ) {
      return;
    }
    setTicketActionError(null);
    setIsProcessingTicket(true);
    try {
      const blob = await captureTicketAsBlob();
      if (!blob) {
        throw new Error('No pudimos generar el ticket');
      }
      const file = new File([blob], `${buildTicketFileName()}.png`, { type: 'image/png' });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        throw new Error('El dispositivo no soporta compartir archivos');
      }
      await runWithShareGuard(() =>
        navigator.share({
          files: [file],
          title: 'Ticket digital Xoco Café',
          text: 'Comparte tu ticket con otra persona o guárdalo en tu galería.',
        })
      );
    } catch (error) {
      console.error('Error compartiendo ticket:', error);
      if (error instanceof Error && error.message === 'share_aborted_visibility') {
        setTicketActionError('Cancelaste la acción de compartir.');
      } else {
        setTicketActionError('No pudimos compartir el ticket en este dispositivo.');
      }
    } finally {
      setIsProcessingTicket(false);
    }
  }, [
    buildTicketFileName,
    captureTicketAsBlob,
    deviceInfo.isAndroid,
    deviceInfo.isIOS,
    selectedOrder,
    isShareSupported,
    runWithShareGuard,
  ]);

  useEffect(() => {
    if (selectedOrder) {
      overlayRef.current?.focus();
    }
  }, [selectedOrder]);

  useEffect(() => {
    if (!loyaltyNotice) {
      return undefined;
    }
    const timeout = setTimeout(() => setLoyaltyNotice(null), 4000);
    return () => clearTimeout(timeout);
  }, [loyaltyNotice]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setSelectedOrder(null);
    }
  };

  const handleOverlayKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedOrder(null);
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const originalBody = document.body.style.overflow;
    const originalHtml = document.documentElement.style.overflow;
    if (selectedOrder || showHistoricalModal) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = originalBody;
      document.documentElement.style.overflow = originalHtml;
    };
  }, [selectedOrder, showHistoricalModal]);

  if (isAuthLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-gray-600 dark:text-gray-300">
        Cargando información de tu cuenta...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Mis pedidos</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Inicia sesión para revisar el historial de pedidos y crear nuevos.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-700"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-primary-500">Panel</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Mis pedidos</h1>
          <p className="text-sm text-gray-500">
            Visualiza el estado de tus pedidos o los que realicemos por ti en tiempo real.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {hasReachedOrderLimit ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-base font-semibold text-gray-400 cursor-not-allowed dark:border-gray-600 dark:text-gray-500"
            >
              Crear nuevo pedido
            </button>
          ) : (
            <Link
              href="/order"
              className="inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow hover:bg-primary-700"
            >
              Crear nuevo pedido
            </Link>
          )}
        </div>
      </header>
      {showMobileNotificationPrompt && (
        <div className="mb-6 rounded-3xl border border-primary-200 bg-white/70 p-4 text-sm text-gray-800 shadow dark:border-primary-500/30 dark:bg-primary-900/20 dark:text-primary-50">
          <p className="mb-3 font-semibold">
            Activa las notificaciones push para enterarte cuando cambiemos el estado de tus pedidos.
          </p>
          <button
            type="button"
            onClick={handleRequestPushPermission}
            className="w-full rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Permitir notificaciones
          </button>
          <p className="mt-2 text-xs text-gray-500 dark:text-primary-100/70">
            iOS requiere que aceptes manualmente para poder enviarte avisos.
          </p>
        </div>
      )}
      {isAuthenticated && loyaltyNotice && (
        <div
          className={`mb-4 rounded-full px-4 py-2 text-sm font-semibold ${
            loyaltyNotice.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100'
          }`}
        >
          {loyaltyNotice.message}
        </div>
      )}
      {isAuthenticated && showLoyaltyReminder && (
        <LoyaltyReminderCard
          onActivate={handleLoyaltyActivation}
          isLoading={isActivatingLoyalty}
          className="mb-6"
        />
      )}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2 rounded-3xl bg-primary-600 px-4 py-3 text-sm text-white shadow-lg dark:bg-primary-900/20 dark:text-primary-200">
        <span>Si necesitas ayuda, mándanos un</span>
        <a
          href={siteMetadata.whats}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white shadow-sm transition-colors hover:bg-white/30 dark:bg-[#222c44] dark:text-primary-200 dark:hover:bg-[#2b3650]"
          aria-label="WhatsApp"
        >
          <FaWhatsapp />
        </a>
        <span>y con todo gusto te ayudamos.</span>
      </div>
      {hasReachedOrderLimit && (
        <div className="mb-6 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          Solo puedes tener 3 pedidos pendientes creados desde la app. Finaliza o cancela un ticket
          que empiece con C- para generar otro.
        </div>
      )}
      <div className="mb-6 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:bg-orange-900/30 dark:text-orange-100">
        Si no acudiste antes del corte (23:59), movemos el ticket a seguimiento en color naranja,
        eliminamos su QR y conservamos el registro únicamente durante 48 horas para referencias
        internas.
      </div>
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={handleRefreshOrders}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-white/5"
        >
          {isLoading ? 'Actualizando...' : 'Actualizar lista'}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/30 dark:text-red-100">
          {error}
        </div>
      )}

      <section aria-live="polite" className="space-y-4">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((skeleton) => (
              <div
                key={skeleton}
                className="rounded-3xl border border-gray-200 bg-white p-5 text-gray-500 shadow-sm dark:border-white/10 dark:bg-[#070d1a] dark:text-white/80"
              >
                <div className="mb-4 h-5 w-32 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
                <div className="space-y-3">
                  {[1, 2, 3].map((card) => (
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={card}
                      className="h-24 rounded-2xl border border-dashed border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#070d1a]"
                    >
                      <span className="sr-only">Cargando tarjeta</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div
              className="grid gap-6 lg:grid-cols-3"
              aria-live="polite"
              aria-label="Tablero de pedidos"
            >
              <OrdersBoardColumn
                title="Pendientes"
                description="Pedidos que aún no entran a barra"
                orders={pendingOrders}
                emptyLabel="No hay pedidos en pendientes."
                onSelect={(value) => setSelectedOrder(value)}
              />
              <OrdersBoardColumn
                title="En producción"
                description="Baristas trabajando en el pedido"
                orders={prepOrders}
                emptyLabel="No hay pedidos en producción."
                onSelect={(value) => setSelectedOrder(value)}
              />
              <OrdersBoardColumn
                title="Completados"
                description="Listos para entregar o ya recolectados"
                orders={completedOrdersList}
                emptyLabel="No hay pedidos completados recientes."
                onSelect={(value) => setSelectedOrder(value)}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoricalModal(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Histórico ({boardColumns.pastBucket.length})
                <span className="text-xs text-white/80 dark:text-white/70">Abrir registros</span>
              </button>
            </div>
          </>
        )}
      </section>

      {selectedOrder && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-6 sm:px-4"
          onClick={handleOverlayClick}
          onKeyDown={handleOverlayKeyDown}
          role="presentation"
          tabIndex={-1}
        >
          <div
            className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/30 bg-white/90 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-gray-900/80"
            style={{ maxHeight: 'calc(100vh - 96px)', height: 'calc(100vh - 96px)' }}
          >
            <div
              className="scrollable flex-1 overscroll-contain px-5 py-5"
              aria-labelledby="order-detail-title"
              style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              onWheelCapture={(event) => event.stopPropagation()}
              onTouchMoveCapture={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-primary-500">Pedido</p>
                  <h3
                    id="order-detail-title"
                    className="text-xl font-semibold text-gray-900 dark:text-white"
                  >
                    Ticket {selectedOrder.ticketId ?? selectedOrder.orderNumber ?? selectedOrder.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
                  aria-label="Cerrar modal"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  <span className="font-semibold text-gray-800 dark:text-gray-100">Estado:</span>{' '}
                  {STATUS_LABELS[selectedOrderEffectiveStatus ?? selectedOrder.status]}
                </p>
                {selectedOrder.prepHandlerName && (
                  <p>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      Preparado por:
                    </span>{' '}
                    {selectedOrder.prepHandlerName}
                  </p>
                )}
                <p>
                  <span className="font-semibold text-gray-800 dark:text-gray-100">Cliente:</span>{' '}
                  {formatOrderCustomer(selectedOrder)}
                </p>
                <p>
                  <span className="font-semibold text-gray-800 dark:text-gray-100">Creado:</span>{' '}
                  {selectedOrder.createdAt
                    ? new Date(selectedOrder.createdAt).toLocaleString('es-MX')
                    : '---'}
                </p>
                <p>
                  <span className="font-semibold text-gray-800 dark:text-gray-100">Total:</span>{' '}
                  {formatCurrency(selectedOrder.total)}
                </p>
                {selectedOrder.deliveryTipAmount ? (
                  <p>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      Propina de entrega:
                    </span>{' '}
                    {formatCurrency(selectedOrder.deliveryTipAmount)}
                    {typeof selectedOrder.deliveryTipPercent === 'number'
                      ? ` (${selectedOrder.deliveryTipPercent}%)`
                      : ''}
                  </p>
                ) : null}
              </div>
              <div className="mt-5 space-y-4">
                <TicketAssignmentNotice
                  ticket={ticketDetails?.ticket}
                  order={ticketDetails?.order}
                  isLoading={isTicketLoading && Boolean(ticketIdentifier)}
                />
                {ticketDetailsError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{ticketDetailsError}</p>
                )}
                {shouldShowFavoritesPanel && (
                  <FavoriteItemsList
                    beverage={favoriteBeverageLabel}
                    food={favoriteFoodLabel}
                    isLoading={combinedFavoritesLoading}
                  />
                )}
                {clientFavoritesError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{clientFavoritesError}</p>
                )}
                {shouldShowLoyaltyPanel && (
                  <LoyaltyProgressCard
                    coffees={loyaltyCoffees ?? undefined}
                    orders={loyaltyOrders ?? undefined}
                    totalInteractions={loyaltyInteractions ?? undefined}
                    customerName={loyaltyCardName ?? undefined}
                    isLoading={combinedFavoritesLoading}
                  />
                )}
              </div>

              {expiredSelectedOrder ? (
                <div className="mt-6 rounded-2xl border border-dashed border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-100">
                  El ticket ya no está disponible porque no se completó antes del corte del día.
                  Solo conservamos su descripción para referencia.
                </div>
              ) : (
                <div className="mt-6 flex justify-center">
                  <VirtualTicket
                    order={selectedOrder}
                    ref={ticketRef}
                    showQr={shouldShowQr}
                    orderStatus={selectedOrderEffectiveStatus ?? selectedOrder.status}
                  />
                </div>
              )}

              {(() => {
                const address = selectedOrder.shipping?.address;
                const contactPhone = selectedOrder.shipping?.contactPhone?.trim();
                const hasAddressDetails =
                  !!address &&
                  [
                    address.street,
                    address.city,
                    address.state,
                    address.postalCode,
                    address.reference,
                  ]
                    .filter((value) => typeof value === 'string')
                    .some((value) => Boolean((value as string).trim().length));
                if (!hasAddressDetails) {
                  return null;
                }
                return (
                  <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary-600 dark:text-primary-300">
                      Detalles de entrega
                    </h4>
                    <p>
                      {address?.street}
                      {address?.city ? `, ${address.city}` : ''}
                      {address?.state ? `, ${address.state}` : ''}
                      {address?.postalCode ? ` · CP ${address.postalCode}` : ''}
                    </p>
                    {address?.reference && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Referencia: {address.reference}
                      </p>
                    )}
                    {contactPhone && (
                      <p className="mt-2 text-sm font-medium">
                        Contacto: {contactPhone}{' '}
                        {selectedOrder.shipping?.isWhatsapp ? '(WhatsApp)' : ''}
                      </p>
                    )}
                  </div>
                );
              })()}

              {!expiredSelectedOrder && (
                <div className="border-t border-gray-100 pb-2 pt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => void handleDownloadTicket()}
                    disabled={isProcessingTicket}
                    className="w-full rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isProcessingTicket ? 'Generando ticket…' : 'Descargar Ticket'}
                  </button>
                  {canShareTicket && (
                    <button
                      type="button"
                      onClick={() => void handleShareTicket()}
                      disabled={isProcessingTicket}
                      className="w-full rounded-full border border-primary-200 px-4 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-primary-500/60 dark:text-primary-200 dark:hover:bg-primary-500/10"
                    >
                      Compartir ticket
                    </button>
                  )}
                  {ticketActionError && (
                    <p className="text-center text-xs text-red-600 dark:text-red-400">
                      {ticketActionError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <HistoricalModal
        open={showHistoricalModal}
        onClose={() => setShowHistoricalModal(false)}
        orders={boardColumns.pastBucket}
      />
      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
