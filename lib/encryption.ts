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

import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';

interface EncryptionResult {
  encryptedData: string;
  iv: string;
  tag: string;
  salt: string;
}

interface DecryptionResult {
  decryptedData: string;
  success: boolean;
}

/**
 * Genera una clave derivada del email usando PBKDF2
 */
function deriveKeyFromEmail(email: string, salt?: Buffer): Buffer {
  const actualSalt = salt ?? randomBytes(16);
  return pbkdf2Sync(email, actualSalt, 100000, 32, 'sha256');
}

/**
 * Cifra datos usando AES-GCM con clave derivada del email
 */
export function encryptWithEmail(email: string, data: string): EncryptionResult {
  try {
    // Generar IV aleatorio
    const iv = randomBytes(12); // 96 bits para GCM

    // Generar salt aleatorio
    const salt = randomBytes(16);

    // Derivar clave del email
    const key = deriveKeyFromEmail(email, salt);

    // Crear cipher
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    // Cifrar datos
    const encryptedBuffer = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);

    // Obtener tag de autenticación
    const tag = cipher.getAuthTag();

    return {
      encryptedData: encryptedBuffer.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      salt: salt.toString('hex'),
    };
  } catch (error) {
    throw new Error(
      `Error al cifrar datos: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Descifra datos usando AES-GCM con clave derivada del email
 */
export function decryptWithEmail(
  email: string,
  encryptedData: string,
  iv: string,
  tag: string,
  salt: string
): DecryptionResult {
  try {
    // Convertir strings hex a buffers
    const ivBuffer = Buffer.from(iv, 'hex');
    const tagBuffer = Buffer.from(tag, 'hex');
    const saltBuffer = Buffer.from(salt, 'hex');

    // Derivar clave del email
    const key = deriveKeyFromEmail(email, saltBuffer);

    // Crear decipher
    const decipher = createDecipheriv('aes-256-gcm', key, ivBuffer);
    decipher.setAuthTag(tagBuffer);

    // Descifrar datos
    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedData, 'hex'),
      decipher.final(),
    ]);

    return {
      decryptedData: decryptedBuffer.toString('utf8'),
      success: true,
    };
  } catch (error) {
    return {
      decryptedData: '',
      success: false,
    };
  }
}

/**
 * Cifra datos sensibles del usuario (nombre, teléfono, dirección)
 */
export function encryptUserData(email: string, userData: Record<string, any>): Record<string, any> {
  const encryptedData: Record<string, any> = {};

  // Campos que necesitan cifrado
  const sensitiveFields = ['firstName', 'lastName', 'phone'];

  for (const [key, value] of Object.entries(userData)) {
    if (sensitiveFields.includes(key)) {
      if (value === undefined) {
        continue;
      }
      if (typeof value === 'string' && value.length > 0) {
        const encrypted = encryptWithEmail(email, value);
        encryptedData[`${key}Encrypted`] = encrypted.encryptedData;
        encryptedData[`${key}Iv`] = encrypted.iv;
        encryptedData[`${key}Tag`] = encrypted.tag;
        encryptedData[`${key}Salt`] = encrypted.salt;
      } else {
        encryptedData[`${key}Encrypted`] = null;
        encryptedData[`${key}Iv`] = null;
        encryptedData[`${key}Tag`] = null;
        encryptedData[`${key}Salt`] = null;
      }
    } else {
      encryptedData[key] = value;
    }
  }

  return encryptedData;
}

/**
 * Descifra datos sensibles del usuario
 */
export function decryptUserData(
  email: string,
  encryptedUserData: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = { ...encryptedUserData };

  const sensitiveFields = ['firstName', 'lastName', 'phone', 'street', 'city', 'state'];

  for (const field of sensitiveFields) {
    const encryptedValue = encryptedUserData[`${field}Encrypted`];
    const ivValue = encryptedUserData[`${field}Iv`];
    const tagValue = encryptedUserData[`${field}Tag`];
    const saltValue = encryptedUserData[`${field}Salt`];

    if (encryptedValue && ivValue && tagValue && saltValue) {
      const decrypted = decryptWithEmail(email, encryptedValue, ivValue, tagValue, saltValue);
      result[field] = decrypted.success ? decrypted.decryptedData : null;
    } else if (field in encryptedUserData) {
      result[field] = encryptedUserData[field];
    } else {
      // Mantener consistencia: eliminar claves inexistentes para evitar valores stale.
      delete result[field];
    }
  }

  return result;
}

/**
 * Genera un hash seguro para verificar integridad
 */
export function generateDataHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Verifica la integridad de los datos cifrados
 */
export function verifyDataIntegrity(originalData: string, receivedHash: string): boolean {
  const calculatedHash = generateDataHash(originalData);
  return calculatedHash === receivedHash;
}

/**
 * Normaliza claves generadas por encryptUserData a columnas camelCase del esquema
 */
export function mapEncryptedDataToColumnNames(
  encryptedData: Record<string, any>
): Record<string, any> {
  const mappedData: Record<string, any> = {};
  const suffixMap: Record<string, string> = {
    encrypted: 'Encrypted',
    iv: 'Iv',
    tag: 'Tag',
    salt: 'Salt',
  };

  for (const [key, value] of Object.entries(encryptedData)) {
    const match = key.match(/^(.*)_(encrypted|iv|tag|salt)$/);
    if (match) {
      const [, field, suffix] = match;
      mappedData[`${field}${suffixMap[suffix]}`] = value;
    } else {
      mappedData[key] = value;
    }
  }

  return mappedData;
}
