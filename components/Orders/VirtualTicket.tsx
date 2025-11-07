'use client';

import { forwardRef, useMemo } from 'react';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  category?: string;
}

export interface VirtualTicketProps {
  order: {
    id: string;
    orderNumber?: string | null;
    ticketId?: string | null;
    userEmail?: string | null;
    createdAt?: string | null;
    total?: number | null;
    items?: any;
    type?: string | null;
  };
}

const VirtualTicket = forwardRef<HTMLDivElement, VirtualTicketProps>(({ order }, ref) => {
  const items = useMemo<OrderItem[]>(() => {
    if (!order.items) return [];
    const normalizeItem = (item: any): OrderItem => ({
      name: String(item.name ?? item.productName ?? 'Producto'),
      quantity: Number(item.quantity ?? 1),
      price: Number(item.price ?? item.amount ?? 0),
      category: item.category ?? 'beverage',
    });

    if (Array.isArray(order.items)) {
      return order.items.map(normalizeItem);
    }
    if (
      typeof order.items === 'object' &&
      order.items !== null &&
      Array.isArray((order.items as any).list)
    ) {
      return (order.items as any).list.map(normalizeItem);
    }
    return [];
  }, [order.items]);

  const formatCurrency = (value?: number | null) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(value ?? 0);

  const qrValue = useMemo(() => {
    const payload = {
      ticketId: order.ticketId ?? order.orderNumber ?? order.id,
      clientEmail: order.userEmail ?? 'desconocido',
      issuedAt: order.createdAt ?? new Date().toISOString(),
      orders: {
        beverages: items
          .filter((item) => (item.category ?? 'beverage') === 'beverage')
          .map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        foods: items
          .filter((item) => item.category === 'food')
          .map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
      },
      totals: {
        itemsCount: items.reduce((acc, item) => acc + item.quantity, 0),
        totalAmount: order.total ?? 0,
      },
    };
    return JSON.stringify(payload);
  }, [
    items,
    order.createdAt,
    order.id,
    order.orderNumber,
    order.ticketId,
    order.total,
    order.userEmail,
  ]);

  return (
    <div
      ref={ref}
      className="w-[320px] rounded-3xl border border-dashed border-primary-200 bg-white p-5 text-sm text-gray-800 shadow-2xl"
    >
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-primary-500">Xoco Café</p>
        <h3 className="mt-2 text-xl font-semibold text-gray-900">Ticket de pedido</h3>
        <p className="text-xs text-gray-500">
          {order.createdAt ? new Date(order.createdAt).toLocaleString('es-MX') : ''}
        </p>
      </div>

      <div className="mt-4 flex justify-between text-xs">
        <div>
          <p className="text-gray-500">Ticket</p>
          <p className="font-semibold">{order.ticketId ?? order.orderNumber ?? order.id}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Canal</p>
          <p className="font-semibold uppercase">{order.type ?? 'web'}</p>
        </div>
      </div>

      <div className="my-3 border-t border-dashed border-gray-200" />

      <ul className="space-y-2">
        {items.length === 0 ? (
          <li className="text-gray-500">Sin artículos registrados.</li>
        ) : (
          items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex justify-between text-sm">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
            </li>
          ))
        )}
      </ul>

      <div className="my-3 border-t border-dashed border-gray-200" />

      <div className="flex items-center justify-between text-base font-semibold text-gray-900">
        <span>Total</span>
        <span>{formatCurrency(order.total)}</span>
      </div>
      <div className="mt-4 flex flex-col items-center space-y-2">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
            qrValue
          )}`}
          alt="Código QR del ticket"
          className="h-36 w-36 rounded-lg border border-gray-200 bg-white p-2"
          loading="lazy"
        />
        <p className="text-center text-xs text-gray-500">
          Escanea este código para facilitar la entrega.
        </p>
      </div>
    </div>
  );
});

VirtualTicket.displayName = 'VirtualTicket';

export default VirtualTicket;
