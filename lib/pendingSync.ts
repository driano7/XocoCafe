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

import { sqlite } from '@/lib/sqlite';

const TABLE_NAME = 'pending_sync_ops';

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opType TEXT NOT NULL,
  tableName TEXT NOT NULL,
  payload TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retryCount INTEGER NOT NULL DEFAULT 0
)`;

let tableReady: Promise<void> | null = null;

async function ensureTableReady() {
  if (!tableReady) {
    tableReady = sqlite.run(INIT_SQL).then(() => undefined);
  }
  await tableReady;
}

export type PendingOperation = {
  id: number;
  opType: 'insert';
  tableName: string;
  payload: string;
  createdAt: string;
  retryCount: number;
};

export async function enqueuePendingOperation(
  tableName: string,
  opType: PendingOperation['opType'],
  payload: unknown
) {
  await ensureTableReady();
  const jsonPayload = JSON.stringify(payload);
  await sqlite.run(`INSERT INTO ${TABLE_NAME} (tableName, opType, payload) VALUES (?, ?, ?)`, [
    tableName,
    opType,
    jsonPayload,
  ]);
}

export async function getPendingOperations(limit = 20): Promise<PendingOperation[]> {
  await ensureTableReady();
  const rows = await sqlite.all<PendingOperation>(
    `SELECT * FROM ${TABLE_NAME} ORDER BY id ASC LIMIT ?`,
    [limit]
  );
  return rows;
}

export async function deletePendingOperation(id: number) {
  await ensureTableReady();
  await sqlite.run(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
}

export async function incrementRetryCount(id: number) {
  await ensureTableReady();
  await sqlite.run(`UPDATE ${TABLE_NAME} SET retryCount = retryCount + 1 WHERE id = ?`, [id]);
}
