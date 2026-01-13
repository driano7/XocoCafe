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

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
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

export const PAYMENT_REFERENCE_TYPE_LABELS: Record<string, string> = {
  evm_address: 'Wallet 0x',
  ens_name: 'ENS',
  lightning_invoice: 'Lightning',
  transaction_id: 'Transferencia',
  text: 'Referencia',
  card_last4: 'Tarjeta',
};

const normalizeKey = (value?: string | null) => value?.trim().toLowerCase() ?? '';

export const resolveMethodLabel = (value?: string | null, fallback = 'Pendiente') => {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }
  const mapped = PAYMENT_METHOD_LABELS[normalizeKey(normalized)];
  return mapped ?? normalized;
};

export const resolveReferenceTypeLabel = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const mapped = PAYMENT_REFERENCE_TYPE_LABELS[normalizeKey(value)];
  return mapped ?? null;
};

export const maskPaymentReference = (value?: string | null) => {
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

export const shortenReference = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length <= 10) {
    return trimmed;
  }
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
};

export const formatPaymentTraceSummary = (
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
  const normalizedType = normalizeKey(type);
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

export const isCashPaymentMethod = (value?: string | null) => {
  if (!value) {
    return false;
  }
  const normalized = normalizeKey(value);
  return normalized === 'efectivo' || normalized === 'cash';
};
