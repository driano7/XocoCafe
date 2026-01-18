'use client';

import Image from 'next/image';
import { forwardRef, useMemo } from 'react';
import TicketOrderSummary from '@/components/Orders/TicketOrderSummary';
import type { TicketDetailsPayload } from '@/hooks/useTicketDetails';
import { buildOrderQrPayload } from '@/lib/orderQrPayload';
import {
  formatPaymentTraceSummary,
  isCashPaymentMethod,
  maskPaymentReference,
  resolveMethodLabel,
  resolveReferenceTypeLabel,
} from '@/lib/paymentDisplay';

type ItemCategory = 'beverage' | 'food' | 'package' | 'other';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  category: ItemCategory;
  size?: string | null;
  packageItems?: string[] | null;
  productId?: string | null;
}

export interface VirtualTicketProps {
  order: {
    id: string;
    orderNumber?: string | null;
    ticketId?: string | null;
    status?: 'pending' | 'in_progress' | 'completed' | 'past' | null;
    userEmail?: string | null;
    customerName?: string | null;
    posCustomerId?: string | null;
    createdAt?: string | null;
    total?: number | null;
    tipAmount?: number | null;
    tipPercent?: number | null;
    subtotal?: number | null;
    vatAmount?: number | null;
    vatPercent?: number | null;
    deliveryTipAmount?: number | null;
    deliveryTipPercent?: number | null;
    items?: any;
    qrPayload?: any;
    metadata?: unknown;
    queuedPaymentMethod?: string | null;
    queuedPaymentReference?: string | null;
    queuedPaymentReferenceType?: string | null;
    montoRecibido?: number | null;
    cambioEntregado?: number | null;
    type?: string | null;
    shipping?: {
      address?: {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        reference?: string;
        label?: string | null;
        nickname?: string | null;
      };
      contactPhone?: string | null;
      isWhatsapp?: boolean | null;
      addressId?: string | null;
      addressLabel?: string | null;
      label?: string | null;
      nickname?: string | null;
      deliveryTip?: {
        amount?: number | null;
        percent?: number | null;
      } | null;
    } | null;
  };
  showQr?: boolean;
  orderStatus?: 'pending' | 'in_progress' | 'completed' | 'past' | null;
  ticketDetails?: TicketDetailsPayload | null;
}

const QR_API_URL = '/api/qr';
const QR_IMAGE_SIZE = '320x320';
const FISCAL_ADDRESS = 'Escolar 04360, C.U., Coyoacán, 04510 Ciudad de México, CDMX';
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
const CATEGORY_LABELS: Record<ItemCategory, string> = {
  beverage: 'Bebidas',
  food: 'Alimentos',
  package: 'Paquetes',
  other: 'Otros',
};

const toNumericValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const coerceMetadataObject = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
};

const toTrimmedString = (value: unknown) =>
  typeof value === 'string' ? value.trim() || null : null;

const buildFullName = (first?: string | null, last?: string | null) => {
  const parts = [toTrimmedString(first), toTrimmedString(last)].filter((value): value is string =>
    Boolean(value)
  );
  if (parts.length === 0) {
    return null;
  }
  return parts.join(' ');
};

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

const parseMaybeJson = (value: any) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('No pudimos parsear items del ticket:', error);
      return null;
    }
  }
  return value;
};

const parseTextItem = (value: string): OrderItem | null => {
  const normalized = value.trim();
  if (!normalized) return null;
  const match = normalized.match(/^[^\d]*(?<qty>\d+)\s*[x×]\s*(?<name>.+)$/i);
  const quantity = match?.groups?.qty ? Number(match.groups.qty) : 1;
  const name = (match?.groups?.name ?? normalized).trim();
  return {
    name,
    quantity: normalizeQuantity(quantity),
    price: 0,
    category: classifyItemCategory({ name }),
    size: null,
    packageItems: null,
  };
};

const buildOrderItem = (item: any): OrderItem => {
  if (typeof item === 'string') {
    const parsed = parseTextItem(item);
    if (parsed) return parsed;
    return {
      name: item.trim() || 'Producto',
      quantity: 1,
      price: 0,
      category: 'other',
      size: null,
      packageItems: null,
    };
  }
  return {
    name: String(
      item?.name ??
        item?.productName ??
        item?.product?.name ??
        item?.product?.displayName ??
        item?.productId ??
        item?.n ??
        'Producto'
    ),
    quantity: normalizeQuantity(item?.quantity ?? item?.qty ?? item?.q),
    price: Number.isFinite(Number(item?.price ?? item?.amount ?? item?.p))
      ? Number(item?.price ?? item?.amount ?? item?.p)
      : 0,
    category:
      typeof item?.category === 'string'
        ? (item.category as ItemCategory)
        : typeof item?.c === 'string'
        ? (item.c as ItemCategory)
        : classifyItemCategory(item),
    size: typeof item?.size === 'string' ? item.size : typeof item?.s === 'string' ? item.s : null,
    packageItems: Array.isArray(item?.packageItems)
      ? item.packageItems.map((entry: any) => String(entry))
      : null,
    productId:
      typeof item?.productId === 'string'
        ? item.productId
        : typeof item?.id === 'string'
        ? item.id
        : null,
  };
};

const isPotentialItemEntry = (value: any) => {
  if (typeof value === 'string') {
    return /\d+\s*[x×]/i.test(value);
  }
  if (typeof value === 'object' && value !== null) {
    return (
      'name' in value ||
      'productName' in value ||
      'productId' in value ||
      'n' in value ||
      'description' in value ||
      'text' in value
    );
  }
  return false;
};

const findNestedItemArray = (value: any): any[] | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.some(isPotentialItemEntry) ? value : null;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const nested = findNestedItemArray((value as Record<string, unknown>)[key]);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
};

const extractItemsFromSource = (source: any): OrderItem[] => {
  if (!source) return [];
  const parsedSource = parseMaybeJson(source) ?? source;

  const mapEntries = (entries: any[]) => entries.map((entry) => buildOrderItem(entry));

  if (Array.isArray(parsedSource)) {
    return mapEntries(parsedSource);
  }
  if (typeof parsedSource === 'object') {
    if (Array.isArray(parsedSource.list)) {
      return mapEntries(parsedSource.list);
    }
    if (Array.isArray(parsedSource.items)) {
      return mapEntries(parsedSource.items);
    }
    if (typeof parsedSource.body === 'string') {
      const entries = parsedSource.body
        .split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter(Boolean);
      if (entries.length) {
        return entries.map((entry: string) => buildOrderItem(entry));
      }
    }
    if (Array.isArray(parsedSource.body)) {
      return mapEntries(parsedSource.body);
    }
    if (
      Array.isArray(parsedSource.beverages) ||
      Array.isArray(parsedSource.foods) ||
      Array.isArray(parsedSource.others)
    ) {
      const beverages = Array.isArray(parsedSource.beverages) ? parsedSource.beverages : [];
      const foods = Array.isArray(parsedSource.foods) ? parsedSource.foods : [];
      const others = Array.isArray(parsedSource.others) ? parsedSource.others : [];
      return mapEntries([...beverages, ...foods, ...others]);
    }
    if (Array.isArray(parsedSource.i)) {
      return parsedSource.i.map((entry: any) => ({
        name: String(entry?.n ?? 'Producto'),
        quantity: normalizeQuantity(entry?.q),
        price: Number.isFinite(Number(entry?.p)) ? Number(entry?.p) : 0,
        category: typeof entry?.c === 'string' ? (entry.c as ItemCategory) : 'other',
        size: typeof entry?.s === 'string' ? entry.s : null,
      }));
    }
    const nested = findNestedItemArray(parsedSource);
    if (nested) {
      return mapEntries(nested);
    }
  }
  return [];
};

const VirtualTicket = forwardRef<HTMLDivElement, VirtualTicketProps>(
  ({ order, showQr = true, orderStatus, ticketDetails = null }, ref) => {
    const items = useMemo<OrderItem[]>(() => {
      const fromOrder = extractItemsFromSource(order.items);
      if (fromOrder.length > 0) {
        return fromOrder;
      }
      if (order.qrPayload) {
        const parsedQr = parseMaybeJson(order.qrPayload) ?? order.qrPayload;
        const fromQr = extractItemsFromSource(parsedQr);
        if (fromQr.length > 0) {
          return fromQr;
        }
      }
      return [];
    }, [order.items, order.qrPayload]);

    const groupedItems = useMemo(() => {
      const groups: Record<ItemCategory, OrderItem[]> = {
        beverage: [],
        food: [],
        package: [],
        other: [],
      };
      items.forEach((item) => {
        groups[item.category ?? 'other'].push(item);
      });
      return groups;
    }, [items]);
    const categoryOrder: ItemCategory[] = ['beverage', 'food', 'package', 'other'];

    const normalizedStatus = useMemo(
      () => orderStatus ?? order.status ?? null,
      [order.status, orderStatus]
    );
    const thankYouHeadline =
      normalizedStatus === 'pending' ? 'Gracias por su pedido' : 'Gracias por su compra';
    const isDelivered = normalizedStatus === 'completed';

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

    const totalsSnapshot = useMemo(() => {
      if (order.items && typeof order.items === 'object' && (order.items as any)?.totals) {
        return (order.items as any).totals;
      }
      return null;
    }, [order.items]);

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
    const shippingSummary = useMemo(() => {
      // 1. First check: does the order actually require shipping?
      // We check the root-level flag if available (some backends might provide it)
      // or infer it from the presence of a valid address structure.

      const resolveShippingSource = () => {
        if (order.shipping && typeof order.shipping === 'object') {
          return order.shipping as Record<string, unknown>;
        }
        if (order.items && typeof order.items === 'object' && (order.items as any)?.shipping) {
          const candidate = (order.items as any).shipping;
          if (candidate && typeof candidate === 'object') {
            return candidate as Record<string, unknown>;
          }
        }
        return null;
      };

      const shippingRecord = resolveShippingSource();
      if (!shippingRecord) {
        return null;
      }

      // If we have a generic "needsShipping" flag in root or shipping record, check it.
      // (This depends on backend, but let's be safe: if address is empty, it's not shipping).

      const nestedAddress =
        shippingRecord.address && typeof shippingRecord.address === 'object'
          ? (shippingRecord.address as Record<string, unknown>)
          : null;

      const resolveField = (key: string) => {
        const nestedValue =
          nestedAddress && key in nestedAddress
            ? toTrimmedString((nestedAddress[key] as string) ?? null)
            : null;
        if (nestedValue) {
          return nestedValue;
        }
        return toTrimmedString((shippingRecord[key] as string) ?? null);
      };

      const street = resolveField('street');
      const country = resolveField('country');
      const postalCode = resolveField('postalCode');

      // CRITICAL CHECK: To consider it a valid shipping order to display,
      // we must have at least a street or postal code.
      // If it's just a stray object with empty strings, return null.
      if (!street && !postalCode) {
        // Also check if maybe ONLY delivery tip is present?
        // Typically a delivery tip implies delivery, but if there's no address,
        // it might be a data anomaly. We'll hide it to be safe effectively masking "Ghost" delivery info.
        return null;
      }

      const city = resolveField('city');
      const state = resolveField('state');
      const reference = resolveField('reference');

      const label =
        toTrimmedString(
          (shippingRecord.addressLabel as string | undefined) ??
            (shippingRecord.label as string | undefined)
        ) ??
        resolveField('label') ??
        resolveField('nickname');

      const lines = [
        street,
        [city, state, country].filter(Boolean).join(', ') || null,
        postalCode ? `CP ${postalCode}` : null,
      ].filter((line): line is string => Boolean(line && line.trim().length));

      const contactPhone = toTrimmedString(
        (shippingRecord.contactPhone as string | undefined) ?? order.shipping?.contactPhone ?? null
      );

      const contactName =
        toTrimmedString(shippingRecord.contactName as string | undefined) ??
        (nestedAddress ? toTrimmedString(nestedAddress.name as string | undefined) : null) ??
        null;

      const isWhatsapp = Boolean(
        (shippingRecord.isWhatsapp as boolean | undefined) ?? order.shipping?.isWhatsapp ?? false
      );

      return {
        label: label ?? null,
        lines,
        reference: reference ? reference.trim() : null,
        contactName,
        contactPhone,
        isWhatsapp,
      };
    }, [order.shipping, order.items]);
    const resolvedTicketCustomerName = useMemo(() => {
      if (!ticketDetails?.customer) {
        return null;
      }
      return (
        toTrimmedString(ticketDetails.customer.name) ??
        buildFullName(ticketDetails.customer.firstName, ticketDetails.customer.lastName)
      );
    }, [ticketDetails]);
    const shippingCustomerName = useMemo(() => {
      return (
        resolvedTicketCustomerName ??
        toTrimmedString(shippingSummary?.contactName) ??
        toTrimmedString(order.customerName) ??
        toTrimmedString(order.userEmail) ??
        'Público general'
      );
    }, [
      order.customerName,
      order.userEmail,
      resolvedTicketCustomerName,
      shippingSummary?.contactName,
    ]);

    const paymentSummary = useMemo(() => {
      const metadataSources: Record<string, unknown>[] = [];
      const nestedPaymentSources: Record<string, unknown>[] = [];
      const pushMetadata = (value: unknown) => {
        const metadata = coerceMetadataObject(value);
        if (metadata) {
          metadataSources.push(metadata);
          if (
            metadata.payment &&
            typeof metadata.payment === 'object' &&
            !Array.isArray(metadata.payment)
          ) {
            nestedPaymentSources.push(metadata.payment as Record<string, unknown>);
          }
        }
      };
      pushMetadata((order as { metadata?: unknown }).metadata);
      if (order.items && typeof order.items === 'object' && !Array.isArray(order.items)) {
        pushMetadata((order.items as { metadata?: unknown }).metadata ?? null);
      }
      pushMetadata(ticketDetails?.order?.metadata ?? null);
      const objectSources: Record<string, unknown>[] = [];
      const pushObjectSource = (value: unknown) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          objectSources.push(value as Record<string, unknown>);
        }
      };
      pushObjectSource(order);
      pushObjectSource(ticketDetails?.order ?? null);
      pushObjectSource(ticketDetails?.ticket ?? null);
      nestedPaymentSources.forEach(pushObjectSource);
      const readStringField = (keys: string[]) => {
        for (const source of objectSources) {
          for (const key of keys) {
            if (key in source) {
              const candidate = toTrimmedString(source[key]);
              if (candidate) {
                return candidate;
              }
            }
          }
        }
        return null;
      };
      const readNumberField = (keys: string[]) => {
        for (const source of objectSources) {
          for (const key of keys) {
            if (key in source) {
              const candidate = toNumericValue(source[key]);
              if (candidate !== null) {
                return candidate;
              }
            }
          }
        }
        return null;
      };
      const methodRaw = readStringField(['queuedPaymentMethod', 'paymentMethod', 'method']);
      const reference = readStringField([
        'queuedPaymentReference',
        'paymentReference',
        'reference',
        'paymentReferenceValue',
      ]);
      const referenceType = readStringField([
        'queuedPaymentReferenceType',
        'paymentReferenceType',
        'referenceType',
        'reference_type',
      ]);
      const amountReceived = readNumberField([
        'montoRecibido',
        'monto_recibido',
        'amountReceived',
        'cashTendered',
        'cash_received',
      ]);
      const changeGiven = readNumberField([
        'cambioEntregado',
        'cambio_entregado',
        'changeGiven',
        'cashChange',
        'change',
      ]);
      const methodLabel = resolveMethodLabel(methodRaw);
      return {
        methodLabel,
        reference,
        referenceType,
        referenceTypeLabel: resolveReferenceTypeLabel(referenceType),
        maskedReference: maskPaymentReference(reference),
        trace: formatPaymentTraceSummary(reference, referenceType, methodLabel),
        amountReceived,
        changeGiven,
        isCash: isCashPaymentMethod(methodRaw),
        hasAnyValue:
          Boolean(methodRaw) ||
          Boolean(reference) ||
          amountReceived !== null ||
          changeGiven !== null ||
          nestedPaymentSources.length > 0,
      };
    }, [order, ticketDetails]);

    const deliveryTipAmount = useMemo(() => {
      if (typeof order.deliveryTipAmount === 'number') {
        return Math.max(order.deliveryTipAmount, 0);
      }
      if (
        order.shipping?.deliveryTip &&
        typeof order.shipping.deliveryTip.amount === 'number' &&
        order.shipping.deliveryTip.amount > 0
      ) {
        return order.shipping.deliveryTip.amount;
      }
      if (
        order.items &&
        typeof order.items === 'object' &&
        (order.items as any)?.deliveryTip &&
        typeof (order.items as any).deliveryTip.amount === 'number'
      ) {
        return (order.items as any).deliveryTip.amount;
      }
      if (totalsSnapshot && typeof totalsSnapshot.deliveryTip === 'number') {
        return totalsSnapshot.deliveryTip;
      }
      return 0;
    }, [order.deliveryTipAmount, order.items, order.shipping?.deliveryTip, totalsSnapshot]);

    const deliveryTipPercent = useMemo(() => {
      if (typeof order.deliveryTipPercent === 'number') {
        return order.deliveryTipPercent;
      }
      if (order.shipping?.deliveryTip && typeof order.shipping.deliveryTip.percent === 'number') {
        return order.shipping.deliveryTip.percent;
      }
      if (
        order.items &&
        typeof order.items === 'object' &&
        (order.items as any)?.deliveryTip &&
        typeof (order.items as any).deliveryTip.percent === 'number'
      ) {
        return (order.items as any).deliveryTip.percent;
      }
      return null;
    }, [order.deliveryTipPercent, order.items, order.shipping?.deliveryTip]);

    const lineItemsTotal = useMemo(
      () => items.reduce((total, item) => total + item.price * item.quantity, 0),
      [items]
    );

    const totalWithVatBeforeTips = useMemo(() => {
      if (typeof order.total === 'number') {
        return Math.max(order.total - tipAmount - deliveryTipAmount, 0);
      }
      return Math.max(lineItemsTotal, 0);
    }, [deliveryTipAmount, lineItemsTotal, order.total, tipAmount]);

    const totalWithoutTips = totalWithVatBeforeTips;

    const explicitSubtotal =
      typeof order.subtotal === 'number'
        ? order.subtotal
        : typeof totalsSnapshot?.subtotal === 'number'
        ? totalsSnapshot.subtotal
        : null;
    const explicitVatAmount =
      typeof order.vatAmount === 'number'
        ? order.vatAmount
        : typeof totalsSnapshot?.vat === 'number'
        ? totalsSnapshot.vat
        : null;
    const derivedVatPercent =
      typeof order.vatPercent === 'number'
        ? order.vatPercent
        : typeof totalsSnapshot?.vatPercent === 'number'
        ? totalsSnapshot.vatPercent
        : 16;

    const subtotalBeforeVat = useMemo(() => {
      if (typeof explicitSubtotal === 'number') {
        return Math.max(explicitSubtotal, 0);
      }
      if (typeof explicitVatAmount === 'number') {
        return Math.max(totalWithoutTips - explicitVatAmount, 0);
      }
      const vatFactor = (derivedVatPercent ?? 0) / 100;
      if (vatFactor > 0 && totalWithoutTips > 0) {
        return Math.max(totalWithoutTips / (1 + vatFactor), 0);
      }
      return Math.max(totalWithoutTips, 0);
    }, [derivedVatPercent, explicitSubtotal, explicitVatAmount, totalWithoutTips]);

    const vatAmount = useMemo(() => {
      if (typeof explicitVatAmount === 'number') {
        return Math.max(explicitVatAmount, 0);
      }
      return Math.max(totalWithoutTips - subtotalBeforeVat, 0);
    }, [explicitVatAmount, subtotalBeforeVat, totalWithoutTips]);

    const grandTotal = useMemo(() => {
      if (typeof order.total === 'number') {
        return order.total;
      }
      return totalWithVatBeforeTips + tipAmount + deliveryTipAmount;
    }, [deliveryTipAmount, order.total, tipAmount, totalWithVatBeforeTips]);

    const qrPayloadValue = useMemo(() => {
      return buildOrderQrPayload({
        ticketCode: order.ticketId ?? order.orderNumber ?? order.id,
        orderId: order.id,
        customerName: (order.customerName ?? order.userEmail ?? 'Cliente Xoco Café').trim(),
        customerEmail: order.userEmail ?? null,
        customerClientId: order.posCustomerId ?? null,
        totalAmount: grandTotal,
        tipAmount,
        tipPercent: tipPercent ?? null,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          size: item.size ?? null,
        })),
        shippingAddressId: order.shipping?.addressId ?? null,
        shippingLabel: shippingSummary?.label ?? null,
        shippingLines: shippingSummary?.lines ?? null,
        shippingReference: shippingSummary?.reference ?? null,
        shippingContact: shippingSummary?.contactPhone ?? null,
        shippingIsWhatsapp: shippingSummary?.isWhatsapp ?? null,
        deliveryTipAmount: deliveryTipAmount > 0 ? deliveryTipAmount : null,
        deliveryTipPercent: deliveryTipPercent ?? null,
        createdAt: order.createdAt ?? null,
      });
    }, [
      shippingSummary,
      deliveryTipAmount,
      deliveryTipPercent,
      grandTotal,
      items,
      order.createdAt,
      order.customerName,
      order.id,
      order.orderNumber,
      order.posCustomerId,
      order.shipping?.addressId,
      order.ticketId,
      order.userEmail,
      tipAmount,
      tipPercent,
    ]);

    const qrValue = useMemo(() => JSON.stringify(qrPayloadValue), [qrPayloadValue]);

    const qrRequestUrl = useMemo(() => {
      return `${QR_API_URL}?size=${QR_IMAGE_SIZE}&data=${encodeURIComponent(qrValue)}`;
    }, [qrValue]);

    return (
      <div
        ref={ref}
        className="w-[360px] rounded-3xl border border-dashed border-primary-200 bg-white p-5 text-sm text-gray-800 shadow-2xl"
      >
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-primary-500">Xoco Café</p>
          <h3 className="mt-2 text-xl font-semibold text-gray-900">Ticket de pedido</h3>
          <p className="text-xs text-gray-500">
            {order.createdAt ? new Date(order.createdAt).toLocaleString('es-MX') : ''}
          </p>
          <p className="text-[11px] text-gray-500">{FISCAL_ADDRESS}</p>
          <p className="mt-1 text-xs font-medium text-gray-600">
            Cliente: {(order.customerName ?? order.userEmail ?? 'Público general').trim()}
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

        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">Sin artículos registrados.</p>
          ) : (
            categoryOrder.map((category) => {
              const list = groupedItems[category];
              if (!list.length) return null;
              return (
                <div key={category}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary-500">
                    {CATEGORY_LABELS[category]}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {list.map((item, index) => (
                      <li key={`${category}-${item.name}-${index}`} className="text-sm">
                        <div className="flex justify-between">
                          <span>
                            {item.quantity} × {item.name}
                            {item.size ? (
                              <span className="ml-1 text-xs uppercase text-gray-500">
                                ({item.size})
                              </span>
                            ) : null}
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                        {item.category === 'package' && item.packageItems?.length ? (
                          <p className="text-xs text-gray-500">
                            Incluye: {item.packageItems.join(', ')}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        {summary.total > 0 && <TicketOrderSummary stats={summary} packages={packageDetails} />}

        <div className="my-3 border-t border-dashed border-gray-200" />

        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>Subtotal (sin IVA)</span>
            <span className="font-semibold text-gray-900">{formatCurrency(subtotalBeforeVat)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>
              IVA ({Number.isFinite(derivedVatPercent) ? Number(derivedVatPercent).toFixed(2) : '0'}
              %)
            </span>
            <span className="font-semibold text-gray-900">{formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold text-gray-900">
            <span>Total con IVA</span>
            <span>{formatCurrency(totalWithoutTips)}</span>
          </div>
        </div>

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
        {deliveryTipAmount > 0 && (
          <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center gap-2">
              {typeof deliveryTipPercent === 'number' && deliveryTipPercent > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-900">
                  {deliveryTipPercent}%
                </span>
              )}
              <span>Propina de entrega</span>
            </span>
            <span className="font-semibold text-gray-900">{formatCurrency(deliveryTipAmount)}</span>
          </div>
        )}

        <div className="my-3 border-t border-dashed border-gray-200" />

        <div className="flex items-center justify-between text-base font-semibold text-gray-900">
          <span>Total general</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
        {paymentSummary.hasAnyValue && (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-100">
            <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600 dark:text-primary-300">
              Pago
            </h4>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Método</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {paymentSummary.methodLabel}
                </span>
              </div>
              {paymentSummary.trace && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{paymentSummary.trace}</p>
              )}
              {paymentSummary.reference ? (
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-200">
                  <span>Referencia</span>
                  <span className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    {paymentSummary.maskedReference ?? paymentSummary.reference}
                    {paymentSummary.referenceTypeLabel && (
                      <span className="rounded-full bg-gray-200 px-2 py-[2px] text-[10px] uppercase tracking-[0.2em] text-gray-700 dark:bg-white/10 dark:text-white">
                        {paymentSummary.referenceTypeLabel}
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sin referencia capturada.
                </p>
              )}
              {paymentSummary.isCash && (
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-200">
                  <div className="flex items-center justify-between">
                    <span>Monto recibido</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(paymentSummary.amountReceived ?? grandTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cambio entregado</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(paymentSummary.changeGiven ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold text-gray-900 dark:text-white">
                    <span>Total del ticket</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {shippingSummary && (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-100">
            <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600 dark:text-primary-300">
              Entrega a domicilio
            </h4>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary-600 dark:text-primary-200">
              Cliente
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
              {shippingCustomerName}
            </p>
            {shippingSummary.label && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600 dark:text-primary-200">
                ID: {shippingSummary.label}
              </p>
            )}
            {shippingSummary.lines.length > 0 ? (
              <div className="mt-1 text-sm leading-relaxed text-gray-800 dark:text-gray-100">
                {shippingSummary.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Sin dirección registrada.
              </p>
            )}
            {shippingSummary.reference && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Referencia: {shippingSummary.reference}
              </p>
            )}
            {shippingSummary.contactPhone && (
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-50">
                Contacto: {shippingSummary.contactPhone}{' '}
                {shippingSummary.isWhatsapp ? '(WhatsApp)' : ''}
              </p>
            )}
          </div>
        )}
        {showQr && (
          <div className="mt-4 flex flex-col items-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">
              {thankYouHeadline}
            </p>
            {isDelivered && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-600">
                Pedido pagado y entregado
              </p>
            )}
            <Image
              src={qrRequestUrl}
              alt="Código QR del ticket"
              width={176}
              height={176}
              className="h-44 w-44 rounded-2xl border border-gray-200 bg-white p-2"
              unoptimized
              crossOrigin="anonymous"
              priority
              loading="eager"
            />
            <p className="text-center text-xs text-gray-500">
              Escanea este código para facilitar la entrega.
            </p>
            <p className="text-center text-[11px] text-gray-500">
              Este documento no es un comprobante fiscal.
            </p>
          </div>
        )}
      </div>
    );
  }
);

VirtualTicket.displayName = 'VirtualTicket';

export default VirtualTicket;
