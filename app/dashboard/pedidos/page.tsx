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
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import siteMetadata from 'content/siteMetadata';
import Snackbar from '@/components/Feedback/Snackbar';
import { useAuth } from '@/components/Auth/AuthProvider';
import LoyaltyReminderCard from '@/components/LoyaltyReminderCard';
import { OrderDetailPanel } from '@/components/Orders/OrderDetailPanel';
import { usePagination } from '@/hooks/use-pagination';
import { useLoyaltyReminder } from '@/hooks/useLoyaltyReminder';
import CoffeeBackground from '@/components/CoffeeBackground';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';
import VirtualTicket from '@/components/Orders/VirtualTicket';
import { useSnackbarNotifications, type SnackbarTone } from '@/hooks/useSnackbarNotifications';
import { useOrders, type OrderRecord, type OrderStatus } from '@/hooks/useOrders';
import { useTicketDetails } from '@/hooks/useTicketDetails';
import { useClientFavorites } from '@/hooks/useClientFavorites';
import { useLanguage } from '@/components/Language/LanguageProvider';
import TranslatedText from '@/components/Language/TranslatedText';
import { detectDeviceInfo, ensurePushPermission } from '@/lib/pushNotifications';
import { decryptField } from '@/lib/secure-fields';
import { consumePendingSnackbar } from '@/lib/pendingSnackbar';

type Order = OrderRecord & {
  status: OrderStatus;
  prepStatus?: OrderStatus | null;
};

const getStatusLabels = (t: (key: string) => string): Record<Order['status'], string> => ({
  pending: t('orders.status_pending') || 'Pendiente',
  in_progress: t('orders.status_in_progress') || 'En preparación',
  completed: t('orders.status_completed') || 'Completado',
  past: t('orders.status_past') || 'Histórico',
});

const getOrderDisplayCode = (order: Order) =>
  order.ticketId ?? order.orderNumber ?? order.id.slice(0, 6);

const resolveOrderStatus = (order?: Partial<Order> | null): Order['status'] => {
  if (!order) {
    return 'pending';
  }
  return (order.prepStatus as Order['status']) ?? order.status ?? 'pending';
};

const formatOrderCustomer = (order: Order, t: (key: string) => string) => {
  const preferred = (order.customerName ?? '').trim();
  if (preferred.length > 0) return preferred;
  const fallback = (order.userEmail ?? '').trim();
  if (fallback.length > 0) return fallback;
  return t('orders.public_general') || 'Público general';
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

type TicketSnapshot = {
  blob: Blob;
  displayWidth: number;
  displayHeight: number;
  imageWidth: number;
  imageHeight: number;
};

const useOrderStatusTracker = (
  showSnackbar: (
    message: string,
    tone?: SnackbarTone,
    options?: { deviceNotification?: { title: string; body?: string } | null }
  ) => void,
  t: (key: string) => string
) => {
  const hasSnapshotRef = useRef(false);
  const statusMapRef = useRef(new Map<string, Order['status']>());
  const sessionStartRef = useRef(Date.now());
  const sessionOrdersRef = useRef(new Set<string>());
  const parseTimestamp = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  };

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
          const createdTs = parseTimestamp(order.createdAt);
          if (!createdTs || createdTs >= sessionStartRef.current - 60_000) {
            sessionOrdersRef.current.add(orderId);
            notices.push({
              tone: 'ticket',
              message:
                t('orders.order_registered')?.replace('{code}', displayCode) ||
                `Pedido ${displayCode} registrado correctamente.`,
              title: t('orders.new_order_title') || 'Nuevo pedido creado',
              body:
                t('orders.ticket_queued')?.replace('{code}', displayCode) ||
                `Ticket ${displayCode} está en cola.`,
            });
          }
        } else if (prevStatus !== nextStatus) {
          const updatedTs = parseTimestamp(order.updatedAt ?? order.createdAt);
          const belongsToSession =
            sessionOrdersRef.current.has(orderId) ||
            (updatedTs ? updatedTs >= sessionStartRef.current : false);
          if (!belongsToSession) {
            statusMapRef.current.set(orderId, nextStatus);
            return;
          }
          if (nextStatus === 'in_progress') {
            notices.push({
              tone: 'info',
              message:
                t('orders.order_in_prep')?.replace('{code}', displayCode) ||
                `Tu pedido ${displayCode} está en preparación.`,
              title: t('orders.order_in_prep_title') || 'Pedido en preparación',
              body: t('orders.order_being_served') || 'Tu orden ya está siendo atendida.',
            });
          } else if (nextStatus === 'completed') {
            notices.push({
              tone: 'success',
              message:
                t('orders.order_completed_msg')?.replace('{code}', displayCode) ||
                `Pedido ${displayCode} completado. Puedes recogerlo.`,
              title: t('orders.order_completed_title') || 'Pedido completado',
              body: t('orders.order_ready_msg') || 'Tu orden está lista para entrega.',
            });
          }
        }

        statusMapRef.current.set(orderId, nextStatus);
      });

      statusMapRef.current.forEach((_, id) => {
        if (!seenIds.has(id)) {
          statusMapRef.current.delete(id);
          sessionOrdersRef.current.delete(id);
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
    [showSnackbar, t]
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

const formatOrderChannelLabel = (order: Order, t: (key: string) => string) => {
  const code = (order.ticketId ?? order.orderNumber ?? '').toUpperCase();
  if (code.startsWith('C-')) {
    return t('orders.client') || 'Cliente';
  }
  if (code.startsWith('XL-')) {
    return t('orders.xoco') || 'Xoco';
  }
  return (order.type ?? 'Web').toUpperCase();
};

const OrderCard = ({ order, onSelect }: { order: Order; onSelect: (order: Order) => void }) => {
  const { t } = useLanguage();
  const STATUS_LABELS = getStatusLabels(t);
  const effectiveStatusKey = (order.prepStatus as Order['status']) ?? order.status ?? 'pending';
  const status = STATUS_LABELS[effectiveStatusKey] ?? STATUS_LABELS.pending;
  const channelLabel = formatOrderChannelLabel(order, t);
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
            {channelLabel === (t('orders.client') || 'Cliente').toUpperCase() ? (
              <TranslatedText tid="orders.client_order" fallback="Pedido cliente" />
            ) : (
              t('orders.order_label')?.replace('{label}', channelLabel) || `Pedido ${channelLabel}`
            )}
            <span className="text-primary-600 dark:text-primary-100"> · {status}</span>
          </p>
        </div>
        <div className="text-right text-xs uppercase tracking-[0.35em] text-gray-400 dark:text-gray-100">
          {order.createdAt
            ? new Date(order.createdAt).toLocaleTimeString(
                t('common.locale') === 'en' ? 'en-US' : 'es-MX',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )
            : '--:--'}
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-200">
        <TranslatedText tid="orders.client" fallback="Cliente" />: {formatOrderCustomer(order, t)} ·{' '}
        <TranslatedText tid="orders.pos_ticket" fallback="Ticket POS" />:{' '}
        {order.ticketId ?? <TranslatedText tid="orders.no_ticket" fallback="Sin ticket" />}
      </p>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-200">
        <span>
          <TranslatedText tid="orders.articles" fallback="Artículos" />: {getOrderArticles(order)}
        </span>
        <span className="text-base font-semibold text-primary-700 dark:text-gray-50">
          {formatCurrency(order.total)}
        </span>
      </div>
      <div className="mt-3 grid gap-1 text-xs text-gray-500 dark:text-gray-300">
        <p>
          <TranslatedText tid="orders.select_view_detail" fallback="Selecciona para ver detalle." />
        </p>
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
}) => {
  const { t } = useLanguage();
  return (
    <div className="mt-4 flex items-center justify-between text-xs text-gray-600 dark:text-white/70">
      <button
        type="button"
        onClick={onPrev}
        className="rounded-full border border-gray-200 px-3 py-1 font-semibold hover:border-primary-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-white dark:hover:border-primary-400 dark:hover:text-primary-200"
        disabled={page === 0}
      >
        <TranslatedText tid="orders.prev" fallback="Anterior" />
      </button>
      <span>
        {t('orders.page_of')
          ?.replace('{page}', String(page + 1))
          ?.replace('{total}', String(totalPages))
          ?.replace('{count}', String(totalItems)) ||
          `Página ${page + 1} de ${totalPages} · ${totalItems} registros`}
      </span>
      <button
        type="button"
        onClick={onNext}
        className="rounded-full border border-gray-200 px-3 py-1 font-semibold hover:border-primary-400 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-white dark:hover:border-primary-400 dark:hover:text-primary-200"
        disabled={page + 1 >= totalPages}
      >
        <TranslatedText tid="orders.next" fallback="Siguiente" />
      </button>
    </div>
  );
};

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
  const { t, currentLanguage } = useLanguage();
  const headerHeight = useHeaderHeight();
  const modalVars = useMemo(() => {
    const safeHeaderHeight = Number.isFinite(headerHeight) ? headerHeight : 96;
    const mobileTopOffset = Math.round(Math.max(safeHeaderHeight * 0.65, 56));
    const desktopTopOffset = Math.round(Math.max(safeHeaderHeight * 1.2, safeHeaderHeight + 32));
    const mobileHeight = `calc(100vh - ${mobileTopOffset + 48}px)`;
    const desktopHeight = `min(calc((100vh - ${desktopTopOffset}px) * 1.35), calc(100vh - ${Math.round(
      safeHeaderHeight * 0.3
    )}px))`;
    return {
      '--historical-modal-mobile-top': `${mobileTopOffset}px`,
      '--historical-modal-desktop-top': `${desktopTopOffset}px`,
      '--historical-modal-mobile-height': mobileHeight,
      '--historical-modal-desktop-height': desktopHeight,
    } as CSSProperties;
  }, [headerHeight]);
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
      className="fixed inset-0 z-40 flex items-start justify-center px-3 pb-6 pt-[var(--historical-modal-mobile-top)] sm:px-6 sm:pt-[var(--historical-modal-desktop-top)]"
      role="presentation"
      style={modalVars}
    >
      <div className="relative flex h-full w-full items-start justify-center">
        <button
          type="button"
          className="absolute inset-0 h-full w-full bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Cerrar registros históricos"
          onClick={onClose}
        />
        <div className="relative z-10 mx-auto flex h-full min-h-full max-w-4xl items-start justify-center">
          <div
            className="flex min-h-0 w-full max-w-md flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-white/10 dark:bg-[#070d1a] dark:text-white h-[var(--historical-modal-mobile-height)] max-h-[var(--historical-modal-mobile-height)] sm:h-[var(--historical-modal-desktop-height)] sm:max-h-[var(--historical-modal-desktop-height)]"
            role="dialog"
            aria-modal="true"
            data-historical-modal
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 pb-3 pt-5 dark:border-white/10">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-primary-600 dark:text-primary-200">
                  <TranslatedText tid="orders.historical" fallback="Histórico" />
                </p>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  <TranslatedText tid="orders.historical_title" fallback="Pedidos vencidos" />
                </h3>
                <p className="text-xs text-gray-500 dark:text-white/60">
                  <TranslatedText
                    tid="orders.historical_desc"
                    fallback="Pedidos que pasaron el corte 23:59 · se depuran cada 48 horas."
                  />
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/40 dark:bg-white dark:text-gray-900 dark:hover:bg-white/80"
              >
                <TranslatedText tid="orders.close" fallback="Cerrar" />
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
              aria-label={t('orders.historical_records') || 'Registros históricos'}
              style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              onWheelCapture={(event) => event.stopPropagation()}
              onTouchMoveCapture={(event) => event.stopPropagation()}
            >
              {orders.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:border-white/15 dark:bg-[#111b31] dark:text-white/70">
                  <TranslatedText tid="orders.empty" fallback="No hay pedidos disponibles." />
                </p>
              ) : (
                orders.map((order) => {
                  const labels = getStatusLabels(t);
                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-100 shadow-sm !bg-[#111827] dark:border-white/15 dark:!bg-[#111827]"
                      style={{ backgroundColor: '#111827' }}
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-gray-300 dark:text-white/60">
                        <span>{getOrderDisplayCode(order)}</span>
                        <span>
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleString(
                                currentLanguage === 'es' ? 'es-MX' : 'en-US'
                              )
                            : '--:--'}
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-semibold text-white dark:text-gray-100">
                        {formatOrderChannelLabel(order, t)} · {labels.past}
                      </p>
                      <div className="mt-2 grid gap-1 text-xs text-gray-200 dark:text-gray-300">
                        <p>
                          <TranslatedText tid="orders.client" fallback="Cliente" />:{' '}
                          {formatOrderCustomer(order, t)}
                        </p>
                        <p className="font-semibold text-primary-200 dark:text-gray-50">
                          Total: {formatCurrency(order.total)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-gray-100 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-[0.35em] text-gray-400 dark:text-white/50">
                  <TranslatedText tid="orders.scrolled" fallback="Recorridos" />
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={scrollProgress}
                  onChange={handleSliderChange}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary-500 dark:bg-white/10"
                  aria-label={
                    t('orders.scroll_historical_desc') ||
                    'Desliza para recorrer los registros históricos'
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatCurrency(value?: number | null, locale: string = 'es-MX') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MXN',
  }).format(value ?? 0);
}

export default function OrdersDashboardPage() {
  const { t } = useLanguage();
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
  const [ticketShareSnapshot, setTicketShareSnapshot] = useState<TicketSnapshot | null>(null);
  const [ticketSharePdf, setTicketSharePdf] = useState<Blob | null>(null);
  const [isPreparingShareSnapshot, setIsPreparingShareSnapshot] = useState(false);
  const isShareCapableDevice =
    isShareSupported && (deviceInfo.isAndroid || deviceInfo.isIOS || deviceInfo.isIPadOS);
  const isTicketShareReady = Boolean(ticketShareSnapshot);
  const shouldShowShareButton = deviceInfo.isMobile;
  const ticketRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const isAuthenticated = Boolean(user && token);
  const scrollModalIntoView = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    // Ajustado para funcionar en móvil y escritorio como solicitado
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  const headerHeight = useHeaderHeight();
  const orderModalVars = useMemo(() => {
    const safeHeaderHeight = Number.isFinite(headerHeight) ? headerHeight : 96;
    const mobileTopOffset = Math.round(Math.max(safeHeaderHeight * 0.45, 48));
    const desktopTopOffset = Math.round(Math.max(safeHeaderHeight * 1.4, safeHeaderHeight + 72));
    const mobileHeight = `calc(100vh - ${mobileTopOffset + 60}px)`;
    const desktopHeightBase = `min(calc((100vh - ${desktopTopOffset}px) * 1.35), calc(100vh - ${Math.round(
      safeHeaderHeight * 0.25
    )}px))`;
    const desktopHeight = `calc(${desktopHeightBase} * 0.85)`;
    return {
      '--order-modal-mobile-top': `${mobileTopOffset}px`,
      '--order-modal-desktop-top': `${desktopTopOffset}px`,
      '--order-modal-mobile-height': mobileHeight,
      '--order-modal-desktop-height': desktopHeight,
    } as CSSProperties;
  }, [headerHeight]);
  const {
    snackbar,
    showSnackbar,
    dismissSnackbar,
    notificationPermission,
    requestNotificationPermission,
    shouldDisplayPermissionPrompt,
    notificationSupported,
  } = useSnackbarNotifications();
  const handleWhatsappSnackbar = useCallback(() => {
    showSnackbar(
      t('orders.whatsapp_opening') || 'Abriendo chat de WhatsApp con Xoco Café…',
      'whatsapp'
    );
  }, [showSnackbar, t]);
  const [pushPermissionInfo, setPushPermissionInfo] = useState<string | null>(null);
  const trackOrderStatuses = useOrderStatusTracker(showSnackbar, t);
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
  const [decryptedSnapshots, setDecryptedSnapshots] = useState<{
    customerFirstName: string | null;
    customerLastName: string | null;
    customerPhone: string | null;
    handlerName: string | null;
  }>({
    customerFirstName: null,
    customerLastName: null,
    customerPhone: null,
    handlerName: null,
  });
  const showMobileNotificationPrompt =
    notificationSupported &&
    (shouldDisplayPermissionPrompt || (deviceInfo.isIOS && notificationPermission === 'default'));

  const handleRequestPushPermission = useCallback(async () => {
    const result = await ensurePushPermission(deviceInfo);
    if (notificationSupported && result.status !== 'unsupported') {
      await requestNotificationPermission();
    }
    showSnackbar(result.message, result.tone);
    setPushPermissionInfo(result.message);
  }, [deviceInfo, notificationSupported, requestNotificationPermission, showSnackbar]);

  useEffect(() => {
    trackOrderStatuses(orders);
  }, [orders, trackOrderStatuses]);

  useEffect(() => {
    if (selectedOrder) {
      scrollModalIntoView();
    }
  }, [selectedOrder, scrollModalIntoView]);

  useEffect(() => {
    if (showHistoricalModal) {
      scrollModalIntoView();
    }
  }, [showHistoricalModal, scrollModalIntoView]);

  useEffect(() => {
    const pending = consumePendingSnackbar();
    if (pending?.message) {
      showSnackbar(pending.message, pending.tone ?? 'ticket');
    }
  }, [showSnackbar]);

  useEffect(() => {
    const staffEmail = user?.email?.trim();
    if (!ticketDetails || !staffEmail) {
      setDecryptedSnapshots({
        customerFirstName: null,
        customerLastName: null,
        customerPhone: null,
        handlerName: null,
      });
      return;
    }
    let cancelled = false;
    const encryptedCustomer = ticketDetails.customer as
      | (typeof ticketDetails.customer & {
          firstNameEncrypted?: string | null;
          lastNameEncrypted?: string | null;
          phoneEncrypted?: string | null;
        })
      | null;
    const encryptedOrder = ticketDetails.order as
      | (typeof ticketDetails.order & {
          queuedByStaffNameEncrypted?: string | null;
        })
      | null;
    if (
      !encryptedCustomer?.firstNameEncrypted &&
      !encryptedCustomer?.lastNameEncrypted &&
      !encryptedCustomer?.phoneEncrypted &&
      !encryptedOrder?.queuedByStaffNameEncrypted
    ) {
      setDecryptedSnapshots({
        customerFirstName: null,
        customerLastName: null,
        customerPhone: null,
        handlerName: null,
      });
      return;
    }
    const decryptValue = (value?: string | null) =>
      value ? decryptField(value, staffEmail) : Promise.resolve(null);
    const run = async () => {
      try {
        const [firstName, lastName, phone, handlerName] = await Promise.all([
          decryptValue(encryptedCustomer?.firstNameEncrypted),
          decryptValue(encryptedCustomer?.lastNameEncrypted),
          decryptValue(encryptedCustomer?.phoneEncrypted),
          decryptValue(encryptedOrder?.queuedByStaffNameEncrypted),
        ]);
        if (!cancelled) {
          setDecryptedSnapshots({
            customerFirstName: firstName,
            customerLastName: lastName,
            customerPhone: phone,
            handlerName,
          });
        }
      } catch (error) {
        console.warn('[orders-dashboard] decrypt failed:', error);
        if (!cancelled) {
          setDecryptedSnapshots({
            customerFirstName: null,
            customerLastName: null,
            customerPhone: null,
            handlerName: null,
          });
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [ticketDetails, user?.email]);

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
          label: t('orders.status_pending') || 'Pendientes',
          description: t('orders.empty_pending') || 'Pedidos que aún no entran a barra',
          orders: pendingBucket,
        },
        {
          key: 'in_progress' as const,
          label: t('orders.status_in_progress') || 'En preparación',
          description: t('orders.empty_production') || 'Baristas trabajando en el pedido',
          orders: prepBucket,
        },
        {
          key: 'completed' as const,
          label: t('orders.status_completed') || 'Completados',
          description: t('orders.empty_completed') || 'Listos para entregar o ya recolectados',
          orders: completedBucket,
        },
      ],
      pastBucket,
    };
  }, [getEffectiveStatus, orders, t]);

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
  const { error: clientFavoritesError, refresh: refreshClientFavorites = async () => {} } =
    useClientFavorites(activeClientId, token);
  useEffect(() => {
    if (!selectedOrder?.id) {
      return;
    }
    if (selectedOrderEffectiveStatus !== 'completed') {
      return;
    }
    void refreshClientFavorites();
  }, [refreshClientFavorites, selectedOrder?.id, selectedOrderEffectiveStatus]);
  const handleLoyaltyActivation = useCallback(async () => {
    const result = await activateLoyaltyProgram();
    setLoyaltyNotice({
      type: result.success ? 'success' : 'error',
      message:
        result.message ??
        (result.success
          ? t('orders.loyalty_success') ||
            'Activamos tu programa de lealtad. Ya puedes acumular sellos.'
          : t('orders.loyalty_error') ||
            'No pudimos activar tu programa de lealtad. Intenta más tarde.'),
    });
  }, [activateLoyaltyProgram, t]);

  const [isProcessingTicket, setIsProcessingTicket] = useState(false);
  const [ticketActionError, setTicketActionError] = useState<string | null>(null);

  const detectDevice = useCallback(() => {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return;
    }
    const info = detectDeviceInfo();
    setDeviceInfo(info);
    const supportsShare = typeof navigator.share === 'function';
    setIsShareSupported(supportsShare && info.isMobile);
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

  const captureTicketSnapshot = useCallback(async (): Promise<TicketSnapshot | null> => {
    if (!ticketRef.current) return null;
    await waitForTicketAssets();
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(ticketRef.current, {
      scale: 1.5,
      backgroundColor: '#ffffff',
      useCORS: true,
    });
    const toBlob = () =>
      new Promise<Blob | null>((resolve, reject) => {
        if (typeof canvas.toBlob !== 'function') {
          try {
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrlToBlob(dataUrl));
            return;
          } catch (error) {
            reject(error);
            return;
          }
        }
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('No pudimos generar la imagen del ticket.'));
            return;
          }
          resolve(blob);
        }, 'image/png');
      });

    let blob: Blob | null = null;
    try {
      blob = await toBlob();
    } catch (error) {
      console.error('No pudimos convertir el ticket en imagen (fallback).', error);
      blob = null;
    }
    if (!blob) return null;
    const rect = ticketRef.current.getBoundingClientRect();
    return {
      blob,
      displayWidth: Math.max(1, rect.width || canvas.width),
      displayHeight: Math.max(1, rect.height || canvas.height),
      imageWidth: Math.max(1, canvas.width),
      imageHeight: Math.max(1, canvas.height),
    };
  }, [ticketRef, waitForTicketAssets]);

  const createPdfFromSnapshot = useCallback(async (snapshot: TicketSnapshot) => {
    const jpegBytes = new Uint8Array(await snapshot.blob.arrayBuffer());
    const pxToPt = (px: number) => Math.max(1, Math.round((px * 72) / 96));
    const widthPt = pxToPt(snapshot.displayWidth);
    const heightPt = pxToPt(snapshot.displayHeight);
    const imageWidth = Math.max(1, Math.round(snapshot.imageWidth));
    const imageHeight = Math.max(1, Math.round(snapshot.imageHeight));
    const textEncoder = new TextEncoder();
    const pdfChunks: Uint8Array[] = [];
    const offsets: number[] = [];
    let position = 0;

    const pushChunk = (chunk: string | Uint8Array) => {
      const nextChunk = typeof chunk === 'string' ? textEncoder.encode(chunk) : chunk;
      pdfChunks.push(nextChunk);
      position += nextChunk.length;
    };

    const addObject = (id: number, body: string) => {
      offsets[id] = position;
      pushChunk(`${id} 0 obj\n${body}\nendobj\n`);
    };

    const addStreamObject = (id: number, dict: string, data: string | Uint8Array) => {
      const payload = typeof data === 'string' ? textEncoder.encode(data) : data;
      offsets[id] = position;
      pushChunk(`${id} 0 obj\n${dict}\nstream\n`);
      pushChunk(payload);
      pushChunk('\nendstream\nendobj\n');
    };

    pushChunk('%PDF-1.4\n');

    addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
    addObject(2, '<< /Type /Pages /Count 1 /Kids [3 0 R] >>');
    addObject(
      3,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt} ${heightPt}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
    );

    addStreamObject(
      4,
      `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>`,
      jpegBytes
    );

    const contentStream = `q\n${widthPt} 0 0 ${heightPt} 0 0 cm\n/Im0 Do\nQ\n`;
    addStreamObject(5, `<< /Length ${textEncoder.encode(contentStream).length} >>`, contentStream);

    const xrefStart = position;
    pushChunk('xref\n0 6\n');
    pushChunk('0000000000 65535 f \n');
    for (let i = 1; i <= 5; i += 1) {
      const offset = offsets[i] ?? 0;
      pushChunk(`${offset.toString().padStart(10, '0')} 00000 n \n`);
    }
    pushChunk('trailer\n');
    pushChunk('<< /Size 6 /Root 1 0 R >>\n');
    pushChunk(`startxref\n${xrefStart}\n%%EOF`);
    return new Blob(pdfChunks, { type: 'application/pdf' });
  }, []);

  const generateTicketPdf = useCallback(async () => {
    const snapshot = await captureTicketSnapshot();
    if (!snapshot) {
      return null;
    }
    try {
      return await createPdfFromSnapshot(snapshot);
    } catch (error) {
      console.error('No pudimos generar el PDF del ticket.', error);
      return null;
    }
  }, [captureTicketSnapshot, createPdfFromSnapshot]);

  const buildTicketFileName = useCallback(() => {
    if (!selectedOrder) return 'ticket-xoco-cafe';
    return (selectedOrder.ticketId ?? selectedOrder.orderNumber ?? selectedOrder.id).toString();
  }, [selectedOrder]);
  const refreshTicketShareSnapshot = useCallback(async () => {
    if (!selectedOrder || typeof window === 'undefined') {
      setTicketShareSnapshot(null);
      setTicketSharePdf(null);
      return null;
    }
    setIsPreparingShareSnapshot(true);
    try {
      let attempts = 0;
      while (!ticketRef.current && attempts < 6) {
        // espera a que el ticket se monte visualmente
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        attempts += 1;
      }
      if (!ticketRef.current) {
        setTicketShareSnapshot(null);
        setTicketSharePdf(null);
        return null;
      }
      const snapshot = await captureTicketSnapshot();
      setTicketShareSnapshot(snapshot);
      setTicketSharePdf(null);
      return snapshot;
    } catch (error) {
      console.error('Error generando ticket para compartir:', error);
      setTicketShareSnapshot(null);
      setTicketSharePdf(null);
      return null;
    } finally {
      setIsPreparingShareSnapshot(false);
    }
  }, [captureTicketSnapshot, selectedOrder]);

  useEffect(() => {
    if (!selectedOrder) {
      setTicketIdentifier(null);
      setTicketShareSnapshot(null);
      setTicketSharePdf(null);
      setIsPreparingShareSnapshot(false);
      return;
    }
    const identifier = selectedOrder.ticketId ?? selectedOrder.orderNumber ?? selectedOrder.id;
    setTicketIdentifier((prev) => (prev === identifier ? prev : identifier));
    void refreshTicketShareSnapshot();
  }, [refreshTicketShareSnapshot, selectedOrder]);

  const ensureTicketSnapshot = useCallback(async () => {
    if (ticketShareSnapshot) {
      return ticketShareSnapshot;
    }
    return refreshTicketShareSnapshot();
  }, [refreshTicketShareSnapshot, ticketShareSnapshot]);

  const ensureTicketPdf = useCallback(async () => {
    if (ticketSharePdf) {
      return ticketSharePdf;
    }
    const snapshot = await ensureTicketSnapshot();
    if (!snapshot) {
      return null;
    }
    const pdf = await createPdfFromSnapshot(snapshot);
    setTicketSharePdf(pdf);
    return pdf;
  }, [createPdfFromSnapshot, ensureTicketSnapshot, ticketSharePdf]);

  const requestShareFormat = useCallback((): 'photo' | 'pdf' => {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
      return 'pdf';
    }
    const wantsPhoto = window.confirm(
      t('orders.share_choice_prompt') ||
        '¿Quieres compartir tu ticket como PNG? Presiona Aceptar para enviarlo como imagen o Cancelar para usar PDF.\nDo you want to share the ticket as a PNG photo? Press OK for the image or Cancel to generate a PDF.'
    );
    return wantsPhoto ? 'photo' : 'pdf';
  }, [t]);

  useEffect(() => {
    if (!selectedOrder || !deviceInfo.isMobile) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [deviceInfo.isMobile, selectedOrder]);

  const triggerDownload = useCallback(
    (blob: Blob, filename: string, extension: string) => {
      const objectUrl = URL.createObjectURL(blob);
      if (deviceInfo.isMobile) {
        const newTab = window.open(objectUrl, '_blank');
        if (!newTab) {
          const mobileLink = document.createElement('a');
          mobileLink.href = objectUrl;
          mobileLink.download = `${filename}.${extension}`;
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
      link.download = `${filename}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
    },
    [deviceInfo.isMobile]
  );

  const shareTicketFileDirectly = useCallback(
    async ({
      blob,
      filename,
      extension,
      title,
      text,
    }: {
      blob: Blob;
      filename: string;
      extension: string;
      title?: string;
      text?: string;
    }) => {
      if (
        !isShareCapableDevice ||
        typeof navigator === 'undefined' ||
        typeof navigator.share !== 'function'
      ) {
        throw new Error('gallery_not_supported');
      }
      const file = new File([blob], `${filename}.${extension}`, {
        type: blob.type || 'application/octet-stream',
      });
      const supportsFiles =
        typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });
      if (!supportsFiles && !deviceInfo.isAndroid) {
        throw new Error('gallery_not_supported');
      }
      try {
        await navigator.share({
          files: [file],
          title: title ?? (t('orders.digital_ticket') || 'Ticket digital Xoco Café'),
          text:
            text ||
            t('orders.save_gallery_text') ||
            'Guardaremos tu ticket como PDF o foto en tus archivos.',
        });
      } catch (error) {
        console.error('Error al compartir ticket:', error);
        if (
          error instanceof DOMException &&
          (error.name === 'AbortError' || error.name === 'NotAllowedError')
        ) {
          if (error.name === 'AbortError') {
            throw error;
          }
          throw new Error('gallery_permission_denied');
        }
        throw new Error('gallery_share_failed');
      }
    },
    [deviceInfo.isAndroid, isShareCapableDevice, t]
  );

  const handleDownloadTicket = useCallback(async () => {
    if (!selectedOrder) return;
    setTicketActionError(null);
    setIsProcessingTicket(true);
    try {
      const pdfBlob = await generateTicketPdf();
      if (!pdfBlob) {
        throw new Error('No pudimos generar el ticket');
      }
      const filename = buildTicketFileName();
      if (deviceInfo.isMobile && isShareCapableDevice) {
        try {
          await shareTicketFileDirectly({
            blob: pdfBlob,
            filename,
            extension: 'pdf',
            text:
              t('orders.save_gallery_text') || 'Guardaremos tu ticket como PDF en tu dispositivo.',
          });
        } catch (mobileError) {
          if (mobileError instanceof Error && mobileError.message === 'gallery_permission_denied') {
            throw mobileError;
          }
          console.warn(
            'Fallo al compartir ticket como PDF, aplicando descarga estándar:',
            mobileError
          );
          setTicketActionError(
            t('orders.gallery_save_failed_fallback') ||
              'No pudimos guardar tu ticket como PDF en tus archivos, pero lo enviamos a tu carpeta de descargas.'
          );
          triggerDownload(pdfBlob, filename, 'pdf');
        }
        return;
      }
      triggerDownload(pdfBlob, filename, 'pdf');
    } catch (error) {
      console.error('Error descargando ticket:', error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        setTicketActionError(
          t('orders.download_aborted') || 'Cancelaste la acción antes de guardar el ticket.'
        );
      } else if (error instanceof Error && error.message === 'gallery_permission_denied') {
        setTicketActionError(
          t('orders.gallery_permission_denied') ||
            'Necesitamos permiso para guardar el PDF de tu ticket. Intenta aceptarlo o usa el botón Compartir.'
        );
      } else if (error instanceof Error && error.message?.startsWith('gallery_')) {
        setTicketActionError(
          t('orders.gallery_generic_error') ||
            'No pudimos guardar tu ticket como PDF automáticamente. Revisa los permisos o usa Compartir.'
        );
      } else {
        setTicketActionError(
          t('orders.download_error') || 'No pudimos descargar el ticket. Intenta de nuevo.'
        );
      }
    } finally {
      setIsProcessingTicket(false);
    }
  }, [
    buildTicketFileName,
    isShareCapableDevice,
    generateTicketPdf,
    deviceInfo.isMobile,
    shareTicketFileDirectly,
    selectedOrder,
    t,
    triggerDownload,
  ]);

  const handleShareTicket = useCallback(async () => {
    if (!selectedOrder) {
      return;
    }
    if (
      !isShareCapableDevice ||
      typeof navigator === 'undefined' ||
      typeof navigator.share !== 'function'
    ) {
      setTicketActionError(
        t('orders.share_not_supported') ||
          'Tu navegador no permite compartir directamente este archivo.'
      );
      return;
    }
    setTicketActionError(null);
    setIsProcessingTicket(true);
    try {
      const format = requestShareFormat();
      const filename = buildTicketFileName();
      if (format === 'photo') {
        const snapshot = await ensureTicketSnapshot();
        if (!snapshot) {
          throw new Error('ticket_unavailable');
        }
        await shareTicketFileDirectly({
          blob: snapshot.blob,
          filename: `${filename}-foto`,
          extension: 'png',
          text:
            t('orders.share_photo_text') ||
            'Compartiremos tu ticket como imagen PNG para que puedas enviarlo o guardarlo fácilmente.',
        });
      } else {
        const pdfBlob = await ensureTicketPdf();
        if (!pdfBlob) {
          throw new Error('ticket_unavailable');
        }
        await shareTicketFileDirectly({
          blob: pdfBlob,
          filename,
          extension: 'pdf',
          text:
            t('orders.share_ticket_text') ||
            'Comparte tu ticket con otra persona o guárdalo como PDF.',
        });
      }
    } catch (error) {
      console.error('Error compartiendo ticket:', error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        setTicketActionError(t('orders.share_aborted') || 'Cancelaste la acción de compartir.');
      } else if (error instanceof Error && error.message === 'ticket_unavailable') {
        setTicketActionError(
          t('orders.ticket_unavailable') ||
            'No pudimos preparar el ticket para compartir. Intenta descargarlo.'
        );
      } else if (error instanceof Error && error.message?.startsWith('gallery_')) {
        setTicketActionError(
          t('orders.gallery_generic_error') ||
            'No pudimos compartir el ticket directamente. Intenta descargarlo o revisa los permisos.'
        );
      } else {
        setTicketActionError(
          t('orders.share_error') || 'No pudimos compartir el ticket en este dispositivo.'
        );
      }
    } finally {
      setIsProcessingTicket(false);
    }
  }, [
    buildTicketFileName,
    ensureTicketPdf,
    ensureTicketSnapshot,
    isShareCapableDevice,
    requestShareFormat,
    selectedOrder,
    shareTicketFileDirectly,
    t,
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
      <CoffeeBackground className="py-10">
        <div className="mx-auto max-w-4xl rounded-[32px] bg-white/90 px-4 py-12 text-center text-gray-600 shadow-2xl shadow-black/20 dark:bg-gray-900/80 dark:text-gray-200">
          <TranslatedText
            tid="orders.loading_account"
            fallback="Cargando información de tu cuenta..."
          />
        </div>
      </CoffeeBackground>
    );
  }

  if (!isAuthenticated) {
    return (
      <CoffeeBackground className="py-10">
        <div className="mx-auto max-w-4xl rounded-[32px] bg-white/95 px-4 py-12 text-center shadow-2xl shadow-black/20 dark:bg-gray-950/80">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            <TranslatedText tid="orders.title" fallback="Mis pedidos" />
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            <TranslatedText
              tid="orders.login_to_view"
              fallback="Inicia sesión para revisar el historial de pedidos y crear nuevos."
            />
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex min-w-[220px] items-center justify-center rounded-full bg-primary-600 px-8 py-4 text-xl font-bold uppercase tracking-[0.25em] text-white shadow-xl transition hover:bg-primary-700"
          >
            <TranslatedText tid="orders.login" fallback="Iniciar sesión" />
          </Link>
        </div>
      </CoffeeBackground>
    );
  }

  return (
    <CoffeeBackground className="py-10">
      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-primary-500">Panel</p>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
              <TranslatedText tid="orders.my_orders" fallback="Mis pedidos" />
            </h1>
            <p className="text-sm text-gray-500">
              <TranslatedText
                tid="orders.dashboard_description"
                fallback="Visualiza el estado de tus pedidos o los que realicemos por ti en tiempo real."
              />
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
              <TranslatedText
                tid="orders.push_notif_prompt"
                fallback="Activa las notificaciones push para enterarte cuando cambiemos el estado de tus pedidos."
              />
            </p>
            <button
              type="button"
              onClick={handleRequestPushPermission}
              className="w-full rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <TranslatedText tid="orders.allow_notifications" fallback="Permitir notificaciones" />
            </button>
            <p className="mt-2 text-xs text-gray-500 dark:text-primary-100/70">
              <TranslatedText
                tid="orders.ios_notif_notice"
                fallback="iOS requiere que aceptes manualmente para poder enviarte avisos."
              />
            </p>
            {pushPermissionInfo && (
              <p className="mt-1 text-xs font-semibold text-primary-600 dark:text-primary-200">
                {pushPermissionInfo}
              </p>
            )}
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white shadow-sm transition-colors hover:bg-white/30 dark:bg-[#222c44] dark:text-primary-200 dark:hover:bg-[#2b3650]"
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
        {hasReachedOrderLimit && (
          <div className="mb-6 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
            <TranslatedText
              tid="orders.active_order_limit"
              fallback="Solo puedes tener 3 pedidos pendientes creados desde la app. Finaliza o cancela un ticket que empiece con C- para generar otro."
            />
          </div>
        )}
        <div className="mb-6 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:bg-orange-900/30 dark:text-orange-100">
          <TranslatedText
            tid="orders.cutoff_notice"
            fallback="Si no acudiste antes del corte (23:59), movemos el ticket a seguimiento en color naranja, eliminamos su QR y conservamos el registro únicamente durante 48 horas para referencias internas."
          />
        </div>
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={handleRefreshOrders}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-white/5"
          >
            {isLoading ? (
              <TranslatedText tid="orders.updating" fallback="Actualizando..." />
            ) : (
              <TranslatedText tid="orders.update_list" fallback="Actualizar lista" />
            )}
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
                  title={t('orders.status_pending') || 'Pendientes'}
                  description={t('orders.empty_pending') || 'Pedidos que aún no entran a barra'}
                  orders={pendingOrders}
                  emptyLabel={t('orders.no_orders_pending') || 'No hay pedidos en pendientes.'}
                  onSelect={(value) => {
                    scrollModalIntoView();
                    setSelectedOrder(value);
                  }}
                />
                <OrdersBoardColumn
                  title={t('orders.status_in_progress') || 'En producción'}
                  description={t('orders.empty_production') || 'Baristas trabajando en el pedido'}
                  orders={prepOrders}
                  emptyLabel={t('orders.no_orders_production') || 'No hay pedidos en producción.'}
                  onSelect={(value) => {
                    scrollModalIntoView();
                    setSelectedOrder(value);
                  }}
                />
                <OrdersBoardColumn
                  title={t('orders.status_completed') || 'Completados'}
                  description={
                    t('orders.empty_completed') || 'Listos para entregar o ya recolectados'
                  }
                  orders={completedOrdersList}
                  emptyLabel={
                    t('orders.no_recent_orders') || 'No hay pedidos completados recientes.'
                  }
                  onSelect={(value) => {
                    scrollModalIntoView();
                    setSelectedOrder(value);
                  }}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHistoricalModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <TranslatedText tid="orders.historical" fallback="Histórico" /> (
                  {boardColumns.pastBucket.length})
                  <span className="text-xs text-white/80 dark:text-white/70">
                    <TranslatedText tid="orders.open_records" fallback="Abrir registros" />
                  </span>
                </button>
              </div>
            </>
          )}
        </section>

        {selectedOrder && (
          <div
            ref={overlayRef}
            className={classNames(
              'fixed inset-0 z-[60] flex bg-black/60',
              'px-3 pb-[calc(80px+env(safe-area-inset-bottom))] pt-[var(--order-modal-mobile-top)]',
              'sm:px-6 sm:pb-10 sm:pt-[var(--order-modal-desktop-top)]',
              'items-start justify-center sm:items-start'
            )}
            style={orderModalVars}
            onClick={handleOverlayClick}
            onKeyDown={handleOverlayKeyDown}
            role="presentation"
            tabIndex={-1}
          >
            <div
              className={classNames(
                'flex w-full max-w-md flex-col overflow-hidden border border-white/30 bg-white/90 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-gray-900/80',
                'rounded-t-3xl sm:rounded-3xl',
                'h-[var(--order-modal-mobile-height)] max-h-[var(--order-modal-mobile-height)]',
                'sm:h-[var(--order-modal-desktop-height)] sm:max-h-[var(--order-modal-desktop-height)]'
              )}
            >
              <div
                className="scrollable flex-1 overscroll-contain px-4 pb-24 pt-5 sm:px-5 sm:pb-6"
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
                      Ticket{' '}
                      {selectedOrder.ticketId ?? selectedOrder.orderNumber ?? selectedOrder.id}
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

                <OrderDetailPanel
                  order={selectedOrder}
                  ticketDetails={ticketDetails}
                  decryptedCustomer={{
                    firstName: decryptedSnapshots.customerFirstName,
                    lastName: decryptedSnapshots.customerLastName,
                    phone: decryptedSnapshots.customerPhone,
                  }}
                  decryptedHandlerName={decryptedSnapshots.handlerName}
                  isLoading={isTicketLoading && Boolean(ticketIdentifier)}
                />
                <div className="space-y-2 text-xs">
                  {ticketDetailsError && (
                    <p className="text-red-600 dark:text-red-400">{ticketDetailsError}</p>
                  )}
                  {clientFavoritesError && (
                    <p className="text-red-600 dark:text-red-400">{clientFavoritesError}</p>
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
                      ticketDetails={ticketDetails}
                    />
                  </div>
                )}

                {!expiredSelectedOrder && (
                  <div className="border-t border-gray-100 pb-2 pt-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => void handleDownloadTicket()}
                      disabled={isProcessingTicket}
                      className="w-full rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isProcessingTicket ? (
                        <TranslatedText
                          tid="orders.generating_ticket"
                          fallback="Generando ticket…"
                        />
                      ) : (
                        <TranslatedText tid="orders.download_ticket" fallback="Descargar Ticket" />
                      )}
                    </button>
                    {shouldShowShareButton && (
                      <button
                        type="button"
                        onClick={() => void handleShareTicket()}
                        disabled={isProcessingTicket || !isShareCapableDevice}
                        className="w-full rounded-full border border-primary-200 px-4 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-primary-500/60 dark:text-primary-200 dark:hover:bg-primary-500/10"
                      >
                        {isProcessingTicket
                          ? 'Compartiendo ticket…'
                          : isShareCapableDevice
                          ? isTicketShareReady
                            ? 'Compartir ticket'
                            : 'Preparando ticket…'
                          : 'Compartir no disponible'}
                      </button>
                    )}
                    {shouldShowShareButton && (!isShareCapableDevice || !isTicketShareReady) && (
                      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                        {isShareCapableDevice ? (
                          isPreparingShareSnapshot ? (
                            <TranslatedText
                              tid="orders.generating_preview"
                              fallback="Generando una vista previa del ticket para compartir…"
                            />
                          ) : (
                            <TranslatedText
                              tid="orders.share_prepare_error"
                              fallback="No pudimos preparar el ticket para compartir. Usa la descarga para guardarlo."
                            />
                          )
                        ) : (
                          <TranslatedText
                            tid="orders.share_not_supported"
                            fallback="Tu navegador no soporta compartir archivos. Usa la descarga para guardar tu ticket."
                          />
                        )}
                      </p>
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
    </CoffeeBackground>
  );
}
