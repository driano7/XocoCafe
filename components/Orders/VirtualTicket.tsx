'use client';

import { forwardRef, useEffect, useMemo, useState } from 'react';
import TicketOrderSummary from '@/components/Orders/TicketOrderSummary';

type ItemCategory = 'beverage' | 'food' | 'package' | 'other';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  category: ItemCategory;
  size?: string | null;
  packageItems?: string[] | null;
}

export interface VirtualTicketProps {
  order: {
    id: string;
    orderNumber?: string | null;
    ticketId?: string | null;
    userEmail?: string | null;
    createdAt?: string | null;
    total?: number | null;
    tipAmount?: number | null;
    tipPercent?: number | null;
    items?: any;
    type?: string | null;
  };
  showQr?: boolean;
}

const QR_API_URL = 'https://api.qrserver.com/v1/create-qr-code/';
const QR_IMAGE_SIZE = '150x150';
const BEVERAGE_KEYWORDS = [
  'bebida',
  'beverage',
  'drink',
  'coffee',
  'cafe',
  'café',
  'latte',
  'espresso',
  'matcha',
  'tea',
  'tisana',
  'agua',
  'refresc',
  'juice',
  'frapp',
];
const FOOD_KEYWORDS = [
  'food',
  'comida',
  'pan',
  'bakery',
  'postre',
  'dessert',
  'cake',
  'sandwich',
  'bagel',
  'tostada',
  'ensalada',
  'toast',
  'croissant',
];
const PACKAGE_KEYWORDS = ['paquete', 'combo'];

const normalizeText = (value?: string | null) =>
  (value ?? '').toString().toLowerCase().normalize('NFD');

const classifyItemCategory = (item: any): ItemCategory => {
  const directCategory = normalizeText(item.category);
  if (directCategory.includes('beverage')) return 'beverage';
  if (directCategory.includes('food')) return 'food';
  if (directCategory.includes('package')) return 'package';

  const haystack = [
    normalizeText(item.category),
    normalizeText(item.subcategory),
    normalizeText(item.name),
    normalizeText(item.productName),
    normalizeText(item.product?.name),
    normalizeText(item.product?.displayName),
    normalizeText(item.productId),
  ].join(' ');

  if (haystack && PACKAGE_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return 'package';
  }
  if (haystack && BEVERAGE_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return 'beverage';
  }
  if (haystack && FOOD_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return 'food';
  }
  return 'other';
};

const normalizeQuantity = (value: unknown) => {
  const numberValue = Number(value);
  if (Number.isFinite(numberValue) && numberValue > 0) {
    return numberValue;
  }
  return 1;
};

const summarizeItems = (items: OrderItem[]) =>
  items.reduce(
    (acc, item) => {
      const qty = Number.isFinite(item.quantity) ? item.quantity : 0;
      acc.total += qty;
      if (item.category === 'beverage') {
        acc.beverages += qty;
      } else if (item.category === 'food') {
        acc.foods += qty;
      } else if (item.category === 'package') {
        acc.packages += qty;
      } else {
        acc.other += qty;
      }
      return acc;
    },
    { beverages: 0, foods: 0, packages: 0, other: 0, total: 0 }
  );

const VirtualTicket = forwardRef<HTMLDivElement, VirtualTicketProps>(
  ({ order, showQr = true }, ref) => {
    const [qrSrc, setQrSrc] = useState<string | null>(null);

    const items = useMemo<OrderItem[]>(() => {
      if (!order.items) return [];
      const normalizeItem = (item: any): OrderItem => ({
        name: String(
          item.name ??
            item.productName ??
            item.product?.name ??
            item.product?.displayName ??
            item.productId ??
            'Producto'
        ),
        quantity: normalizeQuantity(item.quantity),
        price: Number.isFinite(Number(item.price ?? item.amount))
          ? Number(item.price ?? item.amount)
          : 0,
        category: classifyItemCategory(item),
        size: typeof item.size === 'string' ? item.size : null,
        packageItems: Array.isArray(item.packageItems)
          ? item.packageItems.map((entry: any) => String(entry))
          : null,
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
      if (
        typeof order.items === 'object' &&
        order.items !== null &&
        (Array.isArray((order.items as any).beverages) ||
          Array.isArray((order.items as any).foods) ||
          Array.isArray((order.items as any).others))
      ) {
        const beverages = Array.isArray((order.items as any).beverages)
          ? (order.items as any).beverages
          : [];
        const foods = Array.isArray((order.items as any).foods) ? (order.items as any).foods : [];
        const others = Array.isArray((order.items as any).others)
          ? (order.items as any).others
          : [];
        return [...beverages, ...foods, ...others].map(normalizeItem);
      }
      return [];
    }, [order.items]);

    const formatCurrency = (value?: number | null) =>
      new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
      }).format(value ?? 0);

    const tipAmount = useMemo(() => {
      if (typeof order.tipAmount === 'number') {
        return order.tipAmount;
      }
      if (
        order.items &&
        typeof order.items === 'object' &&
        (order.items as any)?.totals &&
        typeof (order.items as any).totals.tip === 'number'
      ) {
        return (order.items as any).totals.tip;
      }
      return 0;
    }, [order.items, order.tipAmount]);

    const tipPercent = useMemo(() => {
      if (typeof order.tipPercent === 'number') {
        return order.tipPercent;
      }
      if (
        order.items &&
        typeof order.items === 'object' &&
        (order.items as any)?.totals &&
        typeof (order.items as any).totals.tipPercent === 'number'
      ) {
        return (order.items as any).totals.tipPercent;
      }
      if (typeof order.total === 'number' && order.total > 0 && tipAmount > 0) {
        const subtotal = order.total - tipAmount;
        if (subtotal > 0) {
          return Math.round((tipAmount / subtotal) * 100);
        }
      }
      return null;
    }, [order.items, order.tipPercent, order.total, tipAmount]);

    const qrValue = useMemo(() => {
      const itemsCount = items.reduce((acc, item) => acc + item.quantity, 0);
      const beveragePayload = items
        .filter((item) => (item.category ?? 'beverage') === 'beverage')
        .map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          size: item.size ?? null,
        }));
      const foodPayload = items
        .filter((item) => item.category === 'food')
        .map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
        }));
      const packagePayload = items
        .filter((item) => item.category === 'package')
        .map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          contents: item.packageItems ?? [],
        }));
      const payload = {
        ticketId: order.ticketId ?? order.orderNumber ?? order.id,
        clientEmail: order.userEmail ?? 'desconocido',
        issuedAt: order.createdAt ?? new Date().toISOString(),
        orders: {
          beverages: beveragePayload,
          foods: foodPayload,
          packages: packagePayload,
        },
        totals: {
          itemsCount,
          totalAmount: order.total ?? 0,
          tipAmount,
        },
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          size: item.size ?? null,
          packageItems: item.packageItems ?? null,
        })),
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
      tipAmount,
    ]);

    const summary = useMemo(() => summarizeItems(items), [items]);
    const packageDetails = useMemo(
      () =>
        items
          .filter((item) => item.category === 'package')
          .map((item) => ({
            name: item.name,
            quantity: item.quantity,
            contents: item.packageItems ?? [],
          })),
      [items]
    );

    const qrRequestUrl = useMemo(() => {
      return `${QR_API_URL}?size=${QR_IMAGE_SIZE}&data=${encodeURIComponent(qrValue)}`;
    }, [qrValue]);

    useEffect(() => {
      if (!showQr) {
        setQrSrc(null);
        return;
      }
      let isMounted = true;
      let objectUrl: string | null = null;
      const loadQr = async () => {
        try {
          const response = await fetch(qrRequestUrl);
          if (!response.ok) {
            throw new Error('No pudimos generar el QR del ticket');
          }
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          if (isMounted) {
            setQrSrc(objectUrl);
          }
        } catch (error) {
          console.error('Error generando código QR del ticket:', error);
          if (isMounted) {
            setQrSrc(qrRequestUrl);
          }
        }
      };

      loadQr();

      return () => {
        isMounted = false;
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }, [qrRequestUrl, showQr]);

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
            <p className="font-semibold uppercase">
              {(() => {
                const code = (order.ticketId ?? order.orderNumber ?? '').toUpperCase();
                if (code.startsWith('C-')) return 'Cliente';
                if (code.startsWith('XL-')) return 'Xoco';
                return (order.type ?? 'web').toUpperCase();
              })()}
            </p>
          </div>
        </div>

        <div className="my-3 border-t border-dashed border-gray-200" />

        <ul className="space-y-2">
          {items.length === 0 ? (
            <li className="text-gray-500">Sin artículos registrados.</li>
          ) : (
            items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="text-sm">
                <div className="flex justify-between">
                  <span>
                    {item.quantity} × {item.name}
                    {item.size ? (
                      <span className="ml-1 text-xs uppercase text-gray-500">({item.size})</span>
                    ) : null}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
                {item.category === 'package' && item.packageItems?.length ? (
                  <p className="text-xs text-gray-500">Incluye: {item.packageItems.join(', ')}</p>
                ) : null}
              </li>
            ))
          )}
        </ul>

        {summary.total > 0 && <TicketOrderSummary stats={summary} packages={packageDetails} />}

        <div className="my-3 border-t border-dashed border-gray-200" />

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="flex items-center gap-2">
            {typeof tipPercent === 'number' && tipPercent > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-900">
                {tipPercent}%
              </span>
            )}
            <span>Propina</span>
          </span>
          <span className="font-semibold text-gray-900">{formatCurrency(tipAmount)}</span>
        </div>

        <div className="my-3 border-t border-dashed border-gray-200" />

        <div className="flex items-center justify-between text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
        {showQr && (
          <div className="mt-4 flex flex-col items-center space-y-2">
            <img
              src={qrSrc ?? qrRequestUrl}
              alt="Código QR del ticket"
              className="h-36 w-36 rounded-lg border border-gray-200 bg-white p-2"
              loading="lazy"
            />
            <p className="text-center text-xs text-gray-500">
              Escanea este código para facilitar la entrega.
            </p>
          </div>
        )}
      </div>
    );
  }
);

VirtualTicket.displayName = 'VirtualTicket';

export default VirtualTicket;
