'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useAuth } from '@/components/Auth/AuthProvider';
import VirtualTicket from '@/components/Orders/VirtualTicket';

interface Order {
  id: string;
  orderNumber?: string | null;
  status: 'pending' | 'completed' | 'past';
  ticketId?: string | null;
  userEmail?: string | null;
  total?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  type?: string | null;
  items?: unknown;
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
  } | null;
}

const STATUS_STYLES: Record<Order['status'], string> = {
  pending: 'bg-orange-500',
  completed: 'bg-green-500',
  past: 'bg-cyan-500',
};

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  past: 'Histórico',
};

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value ?? 0);
}

export default function OrdersDashboardPage() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const ticketRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // Fetch orders
  useEffect(() => {
    if (!user || !token) return;
    let isMounted = true;

    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/orders/history', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || 'No pudimos cargar tus pedidos');
        }
        if (isMounted) {
          setOrders(payload.data ?? []);
        }
      } catch (err: any) {
        console.error(err);
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, [token, user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`orders-user-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `userId=eq.${user.id}` },
        (payload) => {
          setOrders((prev) => {
            const next = [...prev];
            const incomingId =
              typeof (payload.new as { id?: unknown } | null)?.id === 'string'
                ? ((payload.new as { id: string }).id as string)
                : undefined;
            const index = incomingId ? next.findIndex((order) => order.id === incomingId) : -1;

            if (payload.eventType === 'DELETE') {
              if (index >= 0) {
                next.splice(index, 1);
              }
              return next;
            }

            const newOrder = payload.new as Partial<Order> | null;
            if (!newOrder || typeof newOrder.id !== 'string') {
              return next;
            }
            const mergedOrder: Order = {
              id: newOrder.id,
              status: (newOrder.status as Order['status']) ?? 'pending',
              orderNumber: newOrder.orderNumber ?? null,
              ticketId: newOrder.ticketId ?? null,
              userEmail: newOrder.userEmail ?? null,
              total: newOrder.total ?? null,
              createdAt: newOrder.createdAt ?? null,
              updatedAt: newOrder.updatedAt ?? null,
              type: newOrder.type ?? null,
              items: newOrder.items,
              shipping: (newOrder.shipping as Order['shipping']) ?? null,
            };

            if (index >= 0) {
              next[index] = { ...next[index], ...mergedOrder };
            } else {
              next.unshift(mergedOrder);
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === 'pending'),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((order) => order.status !== 'pending'),
    [orders]
  );
  const MAX_ACTIVE_ORDERS = 3;
  const hasReachedOrderLimit = pendingOrders.length >= MAX_ACTIVE_ORDERS;

  const handleDownloadTicket = async () => {
    if (!selectedOrder || !ticketRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(ticketRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
    });
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${
      selectedOrder.ticketId ?? selectedOrder.orderNumber ?? selectedOrder.id
    }.png`;
    link.click();
  };

  useEffect(() => {
    if (selectedOrder) {
      overlayRef.current?.focus();
    }
  }, [selectedOrder]);

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

  const renderOrdersList = (ordersList: Order[], title: string) => (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <span className="text-sm text-gray-500">{ordersList.length} pedidos</span>
      </div>

      {ordersList.length === 0 ? (
        <p className="text-sm text-gray-500">No hay pedidos en esta categoría.</p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {ordersList.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelectedOrder(order)}
              className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/60"
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[order.status]}`}
                      aria-hidden="true"
                    />
                    <span>Ticket {order.ticketId ?? order.orderNumber ?? order.id}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString('es-MX') : ''}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(order.total)}
                </p>
                <p className="text-xs text-gray-500">{STATUS_LABELS[order.status]}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-primary-500">Panel</p>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Mis pedidos</h1>
          <p className="text-sm text-gray-500">
            Visualiza el estado de tus pedidos web o POS en tiempo real.
          </p>
        </div>
        {hasReachedOrderLimit ? (
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-400 cursor-not-allowed dark:border-gray-600 dark:text-gray-500"
          >
            Crear nuevo pedido
          </button>
        ) : (
          <Link
            href="/order"
            className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-700"
          >
            Crear nuevo pedido
          </Link>
        )}
      </header>
      {hasReachedOrderLimit && (
        <div className="mb-6 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          Solo puedes tener 3 pedidos pendientes al mismo tiempo. Finaliza o cancela uno para crear
          otro.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/30 dark:text-red-100">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Cargando pedidos...</p>
      ) : (
        <div className="grid gap-6">
          {renderOrdersList(pendingOrders, 'Pendientes')}
          {renderOrdersList(completedOrders, 'Completados / Pasados')}
        </div>
      )}

      {selectedOrder && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={handleOverlayClick}
          onKeyDown={handleOverlayKeyDown}
          role="presentation"
          tabIndex={-1}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-detail-title"
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
                {STATUS_LABELS[selectedOrder.status]}
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
            </div>

            <div className="mt-6 flex justify-center">
              <VirtualTicket order={selectedOrder} ref={ticketRef} />
            </div>

            {selectedOrder.shipping?.address && (
              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary-600 dark:text-primary-300">
                  Detalles de entrega
                </h4>
                <p>
                  {selectedOrder.shipping.address.street}
                  {selectedOrder.shipping.address.city
                    ? `, ${selectedOrder.shipping.address.city}`
                    : ''}
                  {selectedOrder.shipping.address.state
                    ? `, ${selectedOrder.shipping.address.state}`
                    : ''}
                  {selectedOrder.shipping.address.postalCode
                    ? ` · CP ${selectedOrder.shipping.address.postalCode}`
                    : ''}
                </p>
                {selectedOrder.shipping.address.reference && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Referencia: {selectedOrder.shipping.address.reference}
                  </p>
                )}
                <p className="mt-2 text-sm font-medium">
                  Contacto:{' '}
                  {selectedOrder.shipping.contactPhone
                    ? selectedOrder.shipping.contactPhone
                    : 'No especificado'}{' '}
                  {selectedOrder.shipping.isWhatsapp ? '(WhatsApp)' : ''}
                </p>
              </div>
            )}

            {selectedOrder.status === 'pending' && (
              <button
                type="button"
                onClick={() => void handleDownloadTicket()}
                className="mt-6 w-full rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700"
              >
                Descargar Ticket
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
