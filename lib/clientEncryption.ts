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

const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

function assertBrowserCrypto(): Crypto {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('La API de cifrado del navegador no está disponible.');
  }
  return window.crypto;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

const AES_KEY_SIZE = 32;

function deriveKeyMaterialFromId(userId: string): Uint8Array {
  const sanitizedId = userId.trim();
  if (!/^\d{7}$/.test(sanitizedId)) {
    throw new Error('El ID de usuario debe contener exactamente 7 dígitos.');
  }

  const encodedId = ENCODER.encode(sanitizedId);
  const keyMaterial = new Uint8Array(AES_KEY_SIZE);

  for (let i = 0; i < AES_KEY_SIZE; i += 1) {
    keyMaterial[i] = encodedId[i % encodedId.length];
  }

  return keyMaterial;
}

async function importKeyFromUserId(userId: string): Promise<CryptoKey> {
  const cryptoApi = assertBrowserCrypto();
  const keyMaterial = deriveKeyMaterialFromId(userId);

  return cryptoApi.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  createdAt: string;
}

export async function encryptWithUserId(
  userId: string,
  data: Record<string, unknown>
): Promise<EncryptedPayload> {
  const cryptoApi = assertBrowserCrypto();
  const key = await importKeyFromUserId(userId);
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const encoded = ENCODER.encode(JSON.stringify(data));

  const encrypted = await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer),
    createdAt: new Date().toISOString(),
  };
}

export async function decryptWithUserId<T = Record<string, unknown>>(
  userId: string,
  payload: EncryptedPayload
): Promise<T> {
  const key = await importKeyFromUserId(userId);
  const cryptoApi = assertBrowserCrypto();
  const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
  const decryptedBuffer = await cryptoApi.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    base64ToArrayBuffer(payload.ciphertext)
  );

  return JSON.parse(DECODER.decode(decryptedBuffer)) as T;
}

export function generateLocalUserId(): string {
  const cryptoApi = assertBrowserCrypto();
  const random = cryptoApi.getRandomValues(new Uint32Array(1))[0];
  const base = 1000000 + (random % 9000000);
  return base.toString().padStart(7, '0').slice(0, 7);
}
