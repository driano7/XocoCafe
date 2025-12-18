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

import { useCallback, useEffect, useRef, useState } from 'react';

export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'past';

export interface OrderRecord {
  id: string;
  orderNumber?: string | null;
  status?: OrderStatus | null;
  ticketId?: string | null;
  userEmail?: string | null;
  customerName?: string | null;
  posCustomerId?: string | null;
  total?: number | null;
  tipAmount?: number | null;
  tipPercent?: number | null;
  deliveryTipAmount?: number | null;
  deliveryTipPercent?: number | null;
  prepStatus?: OrderStatus | null;
  prepHandlerName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  type?: string | null;
  items?: unknown;
  qrPayload?: unknown;
  shipping?: {
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      reference?: string;
    };
    contactPhone?: string;
    isWhatsapp?: boolean;
    addressId?: string | null;
    deliveryTip?: {
      amount?: number | null;
      percent?: number | null;
    } | null;
  } | null;
}

const DEFAULT_POLLING_INTERVAL_MS = 30_000;
let localPollingTimer: number | null = null;

export interface UseOrdersOptions<TOrder extends OrderRecord = OrderRecord> {
  token: string | null | undefined;
  enabled?: boolean;
  pollingIntervalMs?: number;
  onNewOrder?: (order: TOrder) => void;
  onOrderStatusChange?: (
    order: TOrder,
    previousStatus: OrderStatus,
    nextStatus: OrderStatus
  ) => void;
  onOrderRemoved?: (orderId: string) => void;
}

export interface UseOrdersResult<TOrder extends OrderRecord = OrderRecord> {
  orders: TOrder[];
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

const normalizeStatus = (order?: OrderRecord | null): OrderStatus => {
  if (!order) {
    return 'pending';
  }
  return order.prepStatus ?? order.status ?? 'pending';
};

export function useOrders<TOrder extends OrderRecord = OrderRecord>({
  token,
  enabled = true,
  pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS,
  onNewOrder,
  onOrderStatusChange,
  onOrderRemoved,
}: UseOrdersOptions<TOrder>): UseOrdersResult<TOrder> {
  const [orders, setOrders] = useState<TOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const statusMapRef = useRef(new Map<string, OrderStatus>());
  const hasSnapshotRef = useRef(false);

  const applyDiffAndNotify = useCallback(
    (incoming: TOrder[]) => {
      const seenIds = new Set<string>();
      const shouldNotify = hasSnapshotRef.current;

      incoming.forEach((order) => {
        const normalized = normalizeStatus(order);
        const previous = statusMapRef.current.get(order.id);
        seenIds.add(order.id);

        if (previous === undefined) {
          statusMapRef.current.set(order.id, normalized);
          if (shouldNotify) {
            onNewOrder?.(order);
          }
          return;
        }

        if (previous !== normalized) {
          statusMapRef.current.set(order.id, normalized);
          if (shouldNotify) {
            onOrderStatusChange?.(order, previous, normalized);
          }
        }
      });

      statusMapRef.current.forEach((_, id) => {
        if (!seenIds.has(id)) {
          statusMapRef.current.delete(id);
          if (shouldNotify) {
            onOrderRemoved?.(id);
          }
        }
      });
      if (!hasSnapshotRef.current) {
        hasSnapshotRef.current = true;
      }
    },
    [onNewOrder, onOrderStatusChange, onOrderRemoved]
  );

  const loadOrders = useCallback(async () => {
    if (!enabled || !token) {
      setOrders([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/orders/history', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message ?? 'No pudimos cargar tus pedidos');
      }

      const incomingOrders = (payload.data ?? []) as TOrder[];
      setOrders(incomingOrders);
      applyDiffAndNotify(incomingOrders);
    } catch (caughtError) {
      console.error('[useOrders] loadOrders failed:', caughtError);
      const message =
        caughtError instanceof Error ? caughtError.message : 'No pudimos cargar tus pedidos';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, token, applyDiffAndNotify]);

  const stopPolling = useCallback(() => {
    if (localPollingTimer !== null) {
      window.clearInterval(localPollingTimer);
      localPollingTimer = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    if (localPollingTimer !== null || !enabled) {
      return;
    }

    localPollingTimer = window.setInterval(() => {
      void loadOrders();
    }, pollingIntervalMs);
    setIsPolling(true);
  }, [enabled, loadOrders, pollingIntervalMs]);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }

    void loadOrders();
    startPolling();

    return () => {
      stopPolling();
    };
  }, [enabled, loadOrders, startPolling, stopPolling]);

  return {
    orders,
    isLoading,
    isPolling,
    error,
    refresh: loadOrders,
    startPolling,
    stopPolling,
  };
}
