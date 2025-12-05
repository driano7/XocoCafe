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

export interface PasswordResetRecord {
  id: string;
  userId: string;
  email: string;
  code: string;
  expiresAt: string;
  verifiedAt?: string | null;
  consumedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

const memoryResetStore = new Map<string, PasswordResetRecord>();
let passwordResetTableAvailable = true;

export function isResetTableAvailable() {
  return passwordResetTableAvailable;
}

export function markResetTableUnavailable() {
  passwordResetTableAvailable = false;
}

export function upsertResetRecord(record: PasswordResetRecord) {
  memoryResetStore.set(record.id, record);
}

export function invalidateResetRecordsForUser(userId: string, timestamp: string) {
  for (const record of memoryResetStore.values()) {
    if (record.userId === userId && !record.consumedAt) {
      record.consumedAt = timestamp;
      memoryResetStore.set(record.id, record);
    }
  }
}

export function getResetRecord(id: string) {
  return memoryResetStore.get(id);
}

export function setRecordVerified(id: string, timestamp: string) {
  const record = memoryResetStore.get(id);
  if (!record) return;
  record.verifiedAt = timestamp;
  memoryResetStore.set(id, record);
}

export function consumeResetRecord(id: string, timestamp: string) {
  const record = memoryResetStore.get(id);
  if (!record) return;
  record.consumedAt = timestamp;
  memoryResetStore.set(id, record);
}
