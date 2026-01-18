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
  if ('payload' in row && typeof row.payload === 'string') {
    let iv: string | undefined;
    let tag: string | undefined;
    let salt: string | undefined;

    // Check snake_case (standard)
    if (
      'payload_iv' in row &&
      typeof row.payload_iv === 'string' &&
      'payload_tag' in row &&
      typeof row.payload_tag === 'string' &&
      'payload_salt' in row &&
      typeof row.payload_salt === 'string'
    ) {
      iv = row.payload_iv;
      tag = row.payload_tag;
      salt = row.payload_salt;
    }
    // Check camelCase (fallback)
    else if (
      // @ts-ignore - Handle runtime properties not in interface
      'payloadIv' in row &&
      typeof row.payloadIv === 'string' &&
      // @ts-ignore
      'payloadTag' in row &&
      typeof row.payloadTag === 'string' &&
      // @ts-ignore
      'payloadSalt' in row &&
      typeof row.payloadSalt === 'string'
    ) {
      // @ts-ignore
      iv = row.payloadIv;
      // @ts-ignore
      tag = row.payloadTag;
      // @ts-ignore
      salt = row.payloadSalt;
    }

    if (iv && tag && salt) {
      const decrypted = decryptWithEmail(email, row.payload, iv, tag, salt);

      if (decrypted.success && decrypted.decryptedData) {
        try {
          const parsed = JSON.parse(decrypted.decryptedData) as AddressInput;
          const normalized = {
            ...parsed,
            id: row.id,
            // Prioritize row.createdAt (camel) if present, else check for created_at (snake)
            createdAt:
              row.createdAt ||
              (row as unknown as Record<string, string>).created_at ||
              (row as unknown as Record<string, string>).createdAt,
            updatedAt:
              row.updatedAt ||
              (row as unknown as Record<string, string>).updated_at ||
              (row as unknown as Record<string, string>).updatedAt,
            contactPhone: parsed.contactPhone ?? '',
            isWhatsapp: parsed.isWhatsapp ?? false,
          };
          return normalized;
        } catch (error) {
          console.error('Error parseando dirección cifrada:', error);
        }
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
