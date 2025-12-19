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
 * --------------------------------------------------------------------
 */

import { createDecipheriv, pbkdf2Sync } from 'node:crypto';

const HEX_REGEX = /^[0-9a-f]+$/i;

type PlainValue = string | null;
type EncryptedShape = {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
  encoding?: BufferEncoding;
};

type RawEncryptedValue = PlainValue | EncryptedShape | Record<string, unknown> | null;

type NormalizedEncryptedPayload = EncryptedShape | { plaintext: string };

const decodeBinary = (value?: string | null, encoding: BufferEncoding = 'base64') => {
  if (!value) {
    return null;
  }
  try {
    return Buffer.from(value, encoding);
  } catch {
    return null;
  }
};

const normalizePayload = (input: RawEncryptedValue): NormalizedEncryptedPayload | null => {
  if (!input) {
    return null;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }
    if (!trimmed.startsWith('{')) {
      return { plaintext: trimmed };
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return normalizePayload(parsed as Record<string, unknown>);
      }
    } catch {
      return { plaintext: trimmed };
    }
  }

  if (typeof input === 'object' && !Array.isArray(input)) {
    const payload = input as Record<string, unknown>;
    if (typeof payload.plaintext === 'string') {
      const trimmed = payload.plaintext.trim();
      if (trimmed) {
        return { plaintext: trimmed };
      }
    }

    const encrypted = typeof payload.encrypted === 'string' ? payload.encrypted.trim() : '';
    const iv = typeof payload.iv === 'string' ? payload.iv.trim() : '';
    const tag = typeof payload.tag === 'string' ? payload.tag.trim() : '';
    const salt = typeof payload.salt === 'string' ? payload.salt.trim() : '';

    if (encrypted && iv && tag && salt) {
      const encoding =
        typeof payload.encoding === 'string' && payload.encoding.trim()
          ? (payload.encoding.trim() as BufferEncoding)
          : undefined;
      const looksHex = HEX_REGEX.test(encrypted);
      return {
        encrypted,
        iv,
        tag,
        salt,
        encoding: encoding ?? (looksHex ? 'hex' : 'base64'),
      };
    }
  }

  return null;
};

const decryptWithEmailKey = (payload: NormalizedEncryptedPayload, email?: string | null) => {
  if ('plaintext' in payload) {
    return payload.plaintext;
  }

  const sanitizedEmail = typeof email === 'string' ? email.trim() : '';
  if (!sanitizedEmail) {
    return null;
  }

  const saltBuffer = decodeBinary(payload.salt, 'hex');
  const ivBuffer = decodeBinary(payload.iv, 'hex');
  const tagBuffer = decodeBinary(payload.tag, 'hex');
  const encryptedBuffer = decodeBinary(payload.encrypted, payload.encoding);

  if (!saltBuffer || !ivBuffer || !tagBuffer || !encryptedBuffer) {
    return null;
  }

  try {
    const key = pbkdf2Sync(sanitizedEmail, saltBuffer, 100000, 32, 'sha256');
    const decipher = createDecipheriv('aes-256-gcm', key, ivBuffer);
    decipher.setAuthTag(tagBuffer);
    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    return decrypted.toString('utf8').trim();
  } catch {
    return null;
  }
};

export const decryptCustomerField = (input: RawEncryptedValue, email?: string | null) => {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed && !trimmed.startsWith('{')) {
      return trimmed;
    }
  }

  const normalized = normalizePayload(input);
  if (!normalized) {
    return null;
  }

  return decryptWithEmailKey(normalized, email);
};

export type RawUserRecord = {
  id?: string | null;
  email?: string | null;
  clientId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  firstNameEncrypted?: RawEncryptedValue;
  firstNameIv?: string | null;
  firstNameTag?: string | null;
  firstNameSalt?: string | null;
  lastNameEncrypted?: RawEncryptedValue;
  lastNameIv?: string | null;
  lastNameTag?: string | null;
  lastNameSalt?: string | null;
  phoneEncrypted?: RawEncryptedValue;
  phoneIv?: string | null;
  phoneTag?: string | null;
  phoneSalt?: string | null;
  [key: string]: unknown;
} | null;

const buildFieldPayload = (user: RawUserRecord, field: string): RawEncryptedValue => {
  if (!user) {
    return null;
  }

  const plainValue = user[field];
  if (typeof plainValue === 'string' && plainValue.trim()) {
    return plainValue;
  }

  const encryptedValue = user?.[`${field}Encrypted`];
  if (typeof encryptedValue === 'string') {
    const trimmed = encryptedValue.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          return parsed as RawEncryptedValue;
        }
      } catch {
        return trimmed;
      }
    }
    if (
      !user?.[`${field}Iv`] &&
      !user?.[`${field}Tag`] &&
      !user?.[`${field}Salt`] &&
      !HEX_REGEX.test(trimmed)
    ) {
      return trimmed;
    }
  }

  const enriched: Record<string, unknown> = {};
  let hasEncryptedShape = false;

  const assignValue = (suffix: string, targetKey: string) => {
    const key = `${field}${suffix}`;
    const value = user?.[key];
    if (typeof value === 'string' && value.trim()) {
      enriched[targetKey] = value.trim();
      hasEncryptedShape = true;
    }
  };

  assignValue('Encrypted', 'encrypted');
  assignValue('Iv', 'iv');
  assignValue('Tag', 'tag');
  assignValue('Salt', 'salt');

  if (hasEncryptedShape) {
    return enriched;
  }

  return null;
};

export const withDecryptedUserNames = <T extends RawUserRecord>(user: T) => {
  if (!user) {
    return null;
  }

  const firstName = decryptCustomerField(buildFieldPayload(user, 'firstName'), user.email) ?? null;
  const lastName = decryptCustomerField(buildFieldPayload(user, 'lastName'), user.email) ?? null;
  const phone = decryptCustomerField(buildFieldPayload(user, 'phone'), user.email) ?? null;

  return {
    ...user,
    firstName,
    lastName,
    phone,
  };
};
