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

import { decryptWithEmail, encryptWithEmail } from '@/lib/encryption';
import type { AddressInput } from '@/lib/validations/auth';

export interface AddressPayload extends AddressInput {
  id?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AddressRow {
  id: string;
  userId: string;
  label?: string | null;
  nickname?: string | null;
  type?: string | null;
  isDefault?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  payload?: string | null;
  payload_iv?: string | null;
  payload_tag?: string | null;
  payload_salt?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  reference?: string | null;
  additionalInfo?: string | null;
}

export function encryptAddressPayload(email: string, data: AddressInput) {
  const payload = JSON.stringify({
    ...data,
    label: data.label?.trim(),
    nickname: data.nickname?.trim(),
    reference: data.reference?.trim(),
    additionalInfo: data.additionalInfo?.trim(),
    contactPhone: data.contactPhone?.trim(),
  });
  return encryptWithEmail(email, payload);
}

export function decryptAddressRow(email: string, row: AddressRow): AddressPayload {
  if (
    'payload' in row &&
    'payload_iv' in row &&
    'payload_tag' in row &&
    'payload_salt' in row &&
    typeof row.payload === 'string' &&
    typeof row.payload_iv === 'string' &&
    typeof row.payload_tag === 'string' &&
    typeof row.payload_salt === 'string'
  ) {
    const decrypted = decryptWithEmail(
      email,
      row.payload,
      row.payload_iv,
      row.payload_tag,
      row.payload_salt
    );

    if (decrypted.success && decrypted.decryptedData) {
      try {
        const parsed = JSON.parse(decrypted.decryptedData) as AddressInput;
        const normalized = {
          ...parsed,
          id: row.id,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          contactPhone: parsed.contactPhone ?? '',
          isWhatsapp: parsed.isWhatsapp ?? false,
        };
        return normalized;
      } catch (error) {
        console.error('Error parseando dirección cifrada:', error);
      }
    }
  }

  // Compatibilidad con registros legados sin cifrar
  return {
    id: row.id,
    label: row.label ?? row.nickname ?? 'Dirección',
    nickname: row.nickname ?? row.label ?? undefined,
    type: (row.type as AddressInput['type']) ?? 'shipping',
    street: row.street ?? '',
    city: row.city ?? '',
    state: row.state ?? undefined,
    postalCode: row.postalCode ?? '',
    country: row.country ?? '',
    reference: row.reference ?? undefined,
    additionalInfo: row.additionalInfo ?? undefined,
    isDefault: row.isDefault ?? undefined,
    contactPhone: '',
    isWhatsapp: false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
