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

import { supabase } from '@/lib/supabase';
import {
  deletePendingOperation,
  enqueuePendingOperation,
  getPendingOperations,
  incrementRetryCount,
  type PendingOperation,
} from '@/lib/pendingSync';

type Payload = Record<string, unknown> | Record<string, unknown>[];

const NETWORK_ERROR_PATTERNS = ['fetch', 'network', 'failed', 'timeout'];

const isNetworkError = (error: unknown) => {
  if (!error) return false;
  const message =
    typeof error === 'string'
      ? error.toLowerCase()
      : typeof (error as { message?: string }).message === 'string'
      ? (error as { message: string }).message.toLowerCase()
      : '';
  return NETWORK_ERROR_PATTERNS.some((token) => message.includes(token));
};

export async function resilientInsert(tableName: string, payload: Payload) {
  await syncPendingOperations();
  try {
    const { error } = await supabase.from(tableName).insert(payload);
    if (error) {
      if (isNetworkError(error)) {
        await enqueuePendingOperation(tableName, 'insert', payload);
        return { queued: true, error: null };
      }
      return { queued: false, error };
    }
    return { queued: false, error: null };
  } catch (error) {
    if (isNetworkError(error)) {
      await enqueuePendingOperation(tableName, 'insert', payload);
      return { queued: true, error: null };
    }
    throw error;
  }
}

async function replayOperation(operation: PendingOperation) {
  const payload = JSON.parse(operation.payload) as Payload;
  const { error } = await supabase.from(operation.tableName).insert(payload);
  return { error };
}

export async function syncPendingOperations(limit = 20) {
  const operations = await getPendingOperations(limit);
  if (!operations.length) return;

  for (const op of operations) {
    try {
      const { error } = await replayOperation(op);
      if (!error) {
        await deletePendingOperation(op.id);
        continue;
      }
      if (isNetworkError(error)) {
        await incrementRetryCount(op.id);
        break;
      }
      console.error('[pending-sync] Op failed permanently', op.tableName, error?.message ?? error);
      await deletePendingOperation(op.id);
    } catch (error) {
      if (isNetworkError(error)) {
        await incrementRetryCount(op.id);
        break;
      }
      console.error('[pending-sync] Unexpected error', error);
      await deletePendingOperation(op.id);
    }
  }
}
