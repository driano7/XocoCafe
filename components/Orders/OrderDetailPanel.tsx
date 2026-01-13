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

import { type ReactNode } from 'react';
import type { OrderRecord } from '@/hooks/useOrders';
import type { TicketDetailsPayload } from '@/hooks/useTicketDetails';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  cripto: 'Cripto',
  tarjeta: 'Tarjeta',
  stripe: 'Tarjeta',
  cashapp: 'Cash App',
  lightning: 'Lightning',
};

const PAYMENT_REFERENCE_TYPE_LABELS: Record<string, string> = {
  evm_address: 'Wallet 0x',
  ens_name: 'ENS',
  lightning_invoice: 'Lightning',
  transaction_id: 'Transferencia',
  text: 'Referencia',
  card_last4: 'Tarjeta',
};

const COMMENT_METADATA_KEYS = [
  'notes',
  'note',
  'comentarios',
  'comentario',
  'comments',
  'instructions',
  'instruction',
  'instrucciones',
  'mensaje',
  'message',
  'observaciones',
  'observacion',
];

const CUSTOMER_NOTES_METADATA_KEYS = [
  'customerNote',
  'customerNotes',
  'customerMessage',
  'mensajeCliente',
  'frontNote',
  'appNote',
];

const STAFF_NOTES_METADATA_KEYS = ['posNote', 'staffNote', 'notaPos', 'barraNote', 'kitchenNote'];

const formatCurrency = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

interface OrderDetailPanelProps {
  order: OrderRecord & { status: string };
  ticketDetails?: TicketDetailsPayload | null;
  decryptedCustomer?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  };
  decryptedHandlerName?: string | null;
  isLoading?: boolean;
  className?: string;
}

const toTrimmedString = (value: unknown) =>
  typeof value === 'string' ? value.trim() || null : null;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const extractNotesFromMetadata = (metadata: unknown, keys: string[]): string | null => {
  if (!metadata) {
    return null;
  }
  if (typeof metadata === 'string') {
    return metadata.trim() || null;
  }
  if (Array.isArray(metadata)) {
    for (const entry of metadata) {
      const candidate = extractNotesFromMetadata(entry, keys);
      if (candidate) {
        return candidate;
      }
    }
    return null;
  }
  if (isPlainObject(metadata)) {
    for (const key of keys) {
      const candidate = toTrimmedString(metadata[key]);
      if (candidate) {
        return candidate;
      }
    }
  }
  return null;
};

const extractGeneralNotes = (payload?: {
  metadata?: unknown;
  notes?: unknown;
  message?: unknown;
}) => {
  if (!payload) {
    return null;
  }
  const directFields = [payload.notes, payload.message];
  for (const field of directFields) {
    const text = toTrimmedString(field);
    if (text) {
      return text;
    }
  }
  return extractNotesFromMetadata(payload.metadata, COMMENT_METADATA_KEYS);
};

const extractCustomerNotes = (metadata?: unknown) =>
  extractNotesFromMetadata(metadata, CUSTOMER_NOTES_METADATA_KEYS);

const extractStaffNotes = (metadata?: unknown) =>
  extractNotesFromMetadata(metadata, STAFF_NOTES_METADATA_KEYS);

const resolveMethodLabel = (value?: string | null) => {
  if (!value) {
    return 'Pendiente';
  }
  const normalized = value.trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[normalized] ?? value;
};

const maskPaymentReference = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 8) {
    const last4 = digits.slice(-4);
    return `•••• ${last4}`;
  }
  if (trimmed.length > 6) {
    return `${trimmed.slice(0, 3)}…${trimmed.slice(-2)}`;
  }
  return trimmed;
};

const shortenReference = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length <= 10) {
    return trimmed;
  }
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
};

const formatPaymentTraceSummary = (
  reference?: string | null,
  type?: string | null,
  methodLabel?: string | null
) => {
  if (!reference) {
    return null;
  }
  const trimmed = reference.trim();
  if (!trimmed) {
    return null;
  }
  const normalizedType = type?.toLowerCase() ?? '';
  if (normalizedType === 'evm_address') {
    return `Wallet ${shortenReference(trimmed)}`;
  }
  if (normalizedType === 'ens_name') {
    return `ENS ${shortenReference(trimmed)}`;
  }
  if (normalizedType === 'lightning_invoice') {
    return `Hash ${shortenReference(trimmed)}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    const normalizedMethod = methodLabel
      ?.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (normalizedMethod?.includes('debito')) {
      return `Débito terminación ${last4}`;
    }
    if (normalizedMethod?.includes('credito')) {
      return `Crédito terminación ${last4}`;
    }
    if (normalizedMethod?.includes('transfer')) {
      return `Transferencia referencia ${last4}`;
    }
    return `Terminación ${last4}`;
  }
  if (trimmed.length > 6) {
    return `Referencia ${shortenReference(trimmed)}`;
  }
  return trimmed;
};

const DetailRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-start justify-between text-sm text-gray-600 dark:text-gray-200">
    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
      {label}
    </span>
    <span className="text-right text-gray-900 dark:text-gray-100">{value}</span>
  </div>
);

const OrderNotesCard = ({ note, label }: { note: string; label: string }) => (
  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-100">
    <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-1 whitespace-pre-line">{note}</p>
  </div>
);

export function OrderDetailPanel({
  order,
  ticketDetails,
  decryptedHandlerName,
  className,
}: OrderDetailPanelProps) {
  const ticket = ticketDetails?.ticket;
  const orderSnapshot = ticketDetails?.order;
  const metadata = orderSnapshot?.metadata;
  const enhancedOrder = order as OrderRecord & {
    queuedByStaffName?: string | null;
    queuedPaymentMethod?: string | null;
    queuedPaymentReference?: string | null;
    queuedPaymentReferenceType?: string | null;
    user?: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
  };
  const shippingPayload = enhancedOrder.shipping ?? null;
  const normalizedShippingObject =
    shippingPayload && isPlainObject(shippingPayload)
      ? (shippingPayload as Record<string, unknown>)
      : null;
  const nestedShippingAddress =
    normalizedShippingObject &&
    isPlainObject((normalizedShippingObject as { address?: unknown }).address)
      ? ((normalizedShippingObject as { address?: Record<string, unknown> }).address as Record<
          string,
          unknown
        >)
      : null;
  const resolveShippingField = (key: string) => {
    const nestedValue =
      nestedShippingAddress && key in nestedShippingAddress
        ? toTrimmedString(nestedShippingAddress[key])
        : null;
    if (nestedValue) {
      return nestedValue;
    }
    return normalizedShippingObject && key in normalizedShippingObject
      ? toTrimmedString(
          (normalizedShippingObject as Record<string, unknown>)[
            key as keyof typeof normalizedShippingObject
          ]
        )
      : null;
  };
  const shippingAddressLines: string[] = [];
  const shippingStreet = resolveShippingField('street');
  const shippingCity = resolveShippingField('city');
  const shippingState = resolveShippingField('state');
  const shippingCountry = resolveShippingField('country');
  const shippingPostalCode = resolveShippingField('postalCode');
  const shippingReference = resolveShippingField('reference');
  if (shippingStreet) {
    shippingAddressLines.push(shippingStreet);
  }
  const locationLine = [shippingCity, shippingState, shippingCountry].filter(Boolean).join(', ');
  if (locationLine) {
    shippingAddressLines.push(locationLine);
  }
  if (shippingPostalCode) {
    shippingAddressLines.push(`CP ${shippingPostalCode}`);
  }
  const shippingLabel =
    resolveShippingField('label') ??
    resolveShippingField('nickname') ??
    toTrimmedString((normalizedShippingObject as { addressLabel?: string | null })?.addressLabel) ??
    toTrimmedString((normalizedShippingObject as { label?: string | null })?.label) ??
    null;
  const shippingContact = toTrimmedString(shippingPayload?.contactPhone);

  const orderQueuedByStaffName = toTrimmedString(enhancedOrder.queuedByStaffName);
  const rawPaymentMethod =
    toTrimmedString(enhancedOrder.queuedPaymentMethod) ??
    toTrimmedString(orderSnapshot?.queuedPaymentMethod) ??
    toTrimmedString(ticket?.paymentMethod) ??
    null;
  const paymentMethod = resolveMethodLabel(rawPaymentMethod);
  const paymentReference =
    toTrimmedString(enhancedOrder.queuedPaymentReference) ??
    toTrimmedString(orderSnapshot?.queuedPaymentReference) ??
    toTrimmedString(ticket?.paymentReference) ??
    null;
  const paymentReferenceTypeRaw =
    toTrimmedString(enhancedOrder.queuedPaymentReferenceType) ??
    toTrimmedString(orderSnapshot?.queuedPaymentReferenceType) ??
    toTrimmedString(ticket?.paymentReferenceType) ??
    null;
  const paymentReferenceTypeLabel =
    PAYMENT_REFERENCE_TYPE_LABELS[
      (paymentReferenceTypeRaw ?? '') as keyof typeof PAYMENT_REFERENCE_TYPE_LABELS
    ] ?? null;
  const maskedReference = maskPaymentReference(paymentReference);
  const paymentTraceSummary = formatPaymentTraceSummary(
    paymentReference,
    paymentReferenceTypeRaw,
    paymentMethod
  );
  const assignedStaff = decryptedHandlerName
    ? decryptedHandlerName
    : orderQueuedByStaffName ??
      orderSnapshot?.queuedByStaffName ??
      ticket?.handledByStaffName ??
      order.prepHandlerName ??
      null;
  const handlerStatusBadge =
    order.status === 'in_progress'
      ? 'En preparación'
      : order.status === 'completed'
      ? 'Entregado'
      : null;

  const customerNotes = extractCustomerNotes(metadata);
  const staffNotes = extractStaffNotes(metadata);
  const generalNotes = extractGeneralNotes(orderSnapshot);
  const fallbackNotes = !customerNotes && !staffNotes ? generalNotes : null;
  const rawDeliveryTipAmount =
    typeof enhancedOrder.deliveryTipAmount === 'number'
      ? enhancedOrder.deliveryTipAmount
      : typeof shippingPayload?.deliveryTip?.amount === 'number'
      ? shippingPayload?.deliveryTip?.amount ?? null
      : null;
  const fallbackTipAmount =
    typeof enhancedOrder.tipAmount === 'number' ? enhancedOrder.tipAmount : null;
  const deliveryTipAmount = rawDeliveryTipAmount ?? fallbackTipAmount;
  const formattedDeliveryTip = formatCurrency(deliveryTipAmount);
  const deliveryTipPercent =
    typeof shippingPayload?.deliveryTip?.percent === 'number'
      ? shippingPayload?.deliveryTip?.percent
      : typeof enhancedOrder.deliveryTipPercent === 'number'
      ? enhancedOrder.deliveryTipPercent
      : typeof enhancedOrder.tipPercent === 'number'
      ? enhancedOrder.tipPercent
      : null;
  const deliveryPercentLabel =
    typeof deliveryTipPercent === 'number' ? `${deliveryTipPercent}%` : null;
  const showShippingCard =
    shippingAddressLines.length > 0 || shippingContact || formattedDeliveryTip !== null;

  return (
    <section
      className={`space-y-3 rounded-[28px] border border-gray-200 bg-white/90 p-4 text-[13px] shadow-lg dark:border-white/10 dark:bg-gray-900/70 dark:text-gray-100 sm:space-y-4 sm:p-5 sm:text-sm ${
        className ?? ''
      }`}
    >
      <header>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Detalle del pedido</h3>
      </header>
      <div className="grid gap-2.5 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-white/10 dark:bg-white/5 sm:gap-3 sm:p-4">
        <DetailRow
          label="Atendió"
          value={
            assignedStaff ? (
              <span className="font-semibold text-gray-900 dark:text-white">
                {assignedStaff}
                {handlerStatusBadge && (
                  <span className="ml-2 rounded-full bg-gray-200 px-2 py-[2px] text-[10px] uppercase tracking-[0.2em] text-gray-700 dark:bg-white/10 dark:text-white">
                    {handlerStatusBadge}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-300">Pendiente</span>
            )
          }
        />
        <DetailRow
          label="Método de pago"
          value={
            <span className="font-semibold text-gray-900 dark:text-white">{paymentMethod}</span>
          }
        />
        <DetailRow
          label="Resumen"
          value={
            paymentTraceSummary ? (
              <span className="text-right text-gray-900 dark:text-gray-100">
                {paymentTraceSummary}
              </span>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">Sin datos</span>
            )
          }
        />
        <DetailRow
          label="Referencia"
          value={
            paymentReference ? (
              <span
                className="font-semibold text-gray-900 dark:text-white"
                title={paymentReference}
              >
                {maskedReference ?? paymentReference}
                {paymentReferenceTypeLabel && (
                  <span className="ml-2 rounded-full bg-gray-200 px-2 py-[2px] text-[10px] uppercase tracking-[0.2em] text-gray-700 dark:bg-white/10 dark:text-white">
                    {paymentReferenceTypeLabel}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">Pendiente</span>
            )
          }
        />
      </div>
      {showShippingCard && (
        <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-3 text-sm text-primary-900 shadow-inner dark:border-primary-800/60 dark:bg-primary-950/30 dark:text-primary-50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary-700 dark:text-primary-200">
            Entrega a domicilio
          </p>
          {shippingLabel && (
            <p className="mt-0.5 text-base font-semibold text-primary-900 dark:text-primary-50">
              {shippingLabel}
            </p>
          )}
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary-600 dark:text-primary-100">
            Dirección de envío
          </p>
          {shippingAddressLines.length > 0 ? (
            <div className="mt-1 space-y-0.5 text-primary-900 dark:text-primary-50">
              {shippingAddressLines.map((line, index) => (
                <p key={`${line}-${index}`} className="text-sm">
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-primary-800/80 dark:text-primary-100/80">
              Sin dirección registrada.
            </p>
          )}
          {shippingReference && (
            <p className="mt-2 text-sm text-primary-900 dark:text-primary-50">
              Referencias: {shippingReference}
            </p>
          )}
          {shippingContact && (
            <p className="mt-2 text-sm text-primary-900 dark:text-primary-50">
              <span className="font-semibold">Contacto:</span> {shippingContact}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-primary-900 dark:text-primary-50">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-primary-700 dark:text-primary-200">
              Propina para baristas
            </span>
            <span className="text-base font-semibold">
              {formattedDeliveryTip ?? 'Sin propina registrada'}
              {deliveryPercentLabel && formattedDeliveryTip && (
                <span className="ml-2 text-xs font-semibold text-primary-700/80 dark:text-primary-200/80">
                  {deliveryPercentLabel}
                </span>
              )}
            </span>
          </div>
        </div>
      )}
      {customerNotes && <OrderNotesCard note={customerNotes} label="Comentario del cliente" />}
      {staffNotes && <OrderNotesCard note={staffNotes} label="Notas internas" />}
      {fallbackNotes && <OrderNotesCard note={fallbackNotes} label="Comentarios adicionales" />}
    </section>
  );
}
