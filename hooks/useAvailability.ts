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

export type AvailabilityStatus = 'available' | 'low_stock' | 'unavailable';

export interface AvailabilityItem {
  id: string;
  productId: string;
  productType: 'beverage' | 'food' | 'package';
  label: string;
  category?: string | null;
  subcategory?: string | null;
  availabilityStatus: AvailabilityStatus;
  reason?: string | null;
  lastModified?: string;
  modifiedBy?: string;
}

export interface AvailabilityData {
  beverage: {
    type: 'beverage';
    title: string;
    icon: string;
    items: AvailabilityItem[];
    stats: {
      total: number;
      available: number;
      unavailable: number;
    };
  };
  food: {
    type: 'food';
    title: string;
    icon: string;
    items: AvailabilityItem[];
    stats: {
      total: number;
      available: number;
      unavailable: number;
    };
  };
  package: {
    type: 'package';
    title: string;
    icon: string;
    items: AvailabilityItem[];
    stats: {
      total: number;
      available: number;
      unavailable: number;
    };
  };
}

export interface UseAvailabilityOptions {
  enabled?: boolean;
  pollingIntervalMs?: number;
  onAvailabilityChange?: (
    productId: string,
    previousStatus: AvailabilityStatus,
    nextStatus: AvailabilityStatus
  ) => void;
  onProductUnavailable?: (productId: string, productLabel: string) => void;
  onProductLowStock?: (productId: string, productLabel: string) => void;
}

export interface UseAvailabilityResult {
  availabilityData: AvailabilityData | null;
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  getProductAvailability: (productId: string) => AvailabilityItem | null;
  getUnavailableProducts: () => AvailabilityItem[];
  getLowStockProducts: () => AvailabilityItem[];
}

const DEFAULT_POLLING_INTERVAL_MS = 60_000; // 1 minuto
let localPollingTimer: number | null = null;

export function useAvailability({
  enabled = true,
  pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS,
  onAvailabilityChange,
  onProductUnavailable,
  onProductLowStock,
}: UseAvailabilityOptions = {}): UseAvailabilityResult {
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const statusMapRef = useRef(new Map<string, AvailabilityStatus>());
  const hasSnapshotRef = useRef(false);

  const applyDiffAndNotify = useCallback(
    (incoming: AvailabilityData) => {
      const seenIds = new Set<string>();
      const shouldNotify = hasSnapshotRef.current;

      // Combinar todos los items de todas las categorías
      const allItems: AvailabilityItem[] = [
        ...incoming.beverage.items,
        ...incoming.food.items,
        ...incoming.package.items,
      ];

      allItems.forEach((item) => {
        const previous = statusMapRef.current.get(item.productId);
        seenIds.add(item.productId);

        if (previous === undefined) {
          statusMapRef.current.set(item.productId, item.availabilityStatus);
          if (shouldNotify) {
            if (item.availabilityStatus === 'unavailable') {
              onProductUnavailable?.(item.productId, item.label);
            } else if (item.availabilityStatus === 'low_stock') {
              onProductLowStock?.(item.productId, item.label);
            }
          }
          return;
        }

        if (previous !== item.availabilityStatus) {
          statusMapRef.current.set(item.productId, item.availabilityStatus);
          if (shouldNotify) {
            onAvailabilityChange?.(item.productId, previous, item.availabilityStatus);

            if (item.availabilityStatus === 'unavailable') {
              onProductUnavailable?.(item.productId, item.label);
            } else if (item.availabilityStatus === 'low_stock') {
              onProductLowStock?.(item.productId, item.label);
            }
          }
        }
      });

      // Detectar productos que fueron eliminados
      statusMapRef.current.forEach((_, id) => {
        if (!seenIds.has(id)) {
          statusMapRef.current.delete(id);
        }
      });

      if (!hasSnapshotRef.current) {
        hasSnapshotRef.current = true;
      }
    },
    [onAvailabilityChange, onProductUnavailable, onProductLowStock]
  );

  const loadAvailability = useCallback(async () => {
    if (!enabled) {
      setAvailabilityData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/availability', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'No pudimos cargar la disponibilidad de productos');
      }

      const incomingData = payload.data as AvailabilityData;
      setAvailabilityData(incomingData);
      applyDiffAndNotify(incomingData);
    } catch (caughtError) {
      console.error('[useAvailability] loadAvailability failed:', caughtError);
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'No pudimos cargar la disponibilidad de productos';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, applyDiffAndNotify]);

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
      void loadAvailability();
    }, pollingIntervalMs);
    setIsPolling(true);
  }, [enabled, loadAvailability, pollingIntervalMs]);

  const getProductAvailability = useCallback(
    (productId: string): AvailabilityItem | null => {
      if (!availabilityData) return null;

      const allItems: AvailabilityItem[] = [
        ...availabilityData.beverage.items,
        ...availabilityData.food.items,
        ...availabilityData.package.items,
      ];

      return allItems.find((item) => item.productId === productId) || null;
    },
    [availabilityData]
  );

  const getUnavailableProducts = useCallback((): AvailabilityItem[] => {
    if (!availabilityData) return [];

    const allItems: AvailabilityItem[] = [
      ...availabilityData.beverage.items,
      ...availabilityData.food.items,
      ...availabilityData.package.items,
    ];

    return allItems.filter((item) => item.availabilityStatus === 'unavailable');
  }, [availabilityData]);

  const getLowStockProducts = useCallback((): AvailabilityItem[] => {
    if (!availabilityData) return [];

    const allItems: AvailabilityItem[] = [
      ...availabilityData.beverage.items,
      ...availabilityData.food.items,
      ...availabilityData.package.items,
    ];

    return allItems.filter((item) => item.availabilityStatus === 'low_stock');
  }, [availabilityData]);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      statusMapRef.current.clear();
      hasSnapshotRef.current = false;
      return;
    }

    void loadAvailability();
    startPolling();

    return () => {
      stopPolling();
    };
  }, [enabled, loadAvailability, startPolling, stopPolling]);

  return {
    availabilityData,
    isLoading,
    isPolling,
    error,
    refresh: loadAvailability,
    startPolling,
    stopPolling,
    getProductAvailability,
    getUnavailableProducts,
    getLowStockProducts,
  };
}
