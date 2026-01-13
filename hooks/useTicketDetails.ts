'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface TicketRecord {
  id: string;
  ticketCode?: string | null;
  orderId?: string | null;
  userId?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paymentReferenceType?: string | null;
  handledByStaffId?: string | null;
  handledByStaffName?: string | null;
  tipAmount?: number | null;
  tipPercent?: number | null;
  currency?: string | null;
  createdAt?: string | null;
}

export interface TicketOrderSnapshot {
  id: string;
  status?: string | null;
  total?: number | null;
  currency?: string | null;
  createdAt?: string | null;
  userId?: string | null;
  metadata?: unknown;
  notes?: string | null;
  message?: string | null;
  instructions?: string | null;
  queuedPaymentMethod?: string | null;
  queuedPaymentReference?: string | null;
  queuedPaymentReferenceType?: string | null;
  queuedByStaffId?: string | null;
  queuedByStaffName?: string | null;
  montoRecibido?: number | null;
  cambioEntregado?: number | null;
}

export interface TicketCustomerSnapshot {
  id?: string | null;
  clientId?: string | null;
  email?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

export interface TicketItemSnapshot {
  id: string;
  productId?: string | null;
  quantity: number;
  price?: number | null;
  product?: {
    name?: string | null;
    category?: string | null;
    subcategory?: string | null;
  } | null;
  sizeId?: string | null;
  sizeLabel?: string | null;
  packageId?: string | null;
  packageName?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TicketDetailsPayload {
  ticket: TicketRecord;
  order: TicketOrderSnapshot;
  customer: TicketCustomerSnapshot | null;
  items: TicketItemSnapshot[];
}

interface HookResult {
  data: TicketDetailsPayload | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTicketDetails(identifier: string | null): HookResult {
  const [data, setData] = useState<TicketDetailsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    setRefreshCounter((value) => value + 1);
    setError(null);
  }, []);

  useEffect(() => {
    if (!identifier) {
      setData(null);
      setIsLoading(false);
      setError(null);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    const fetchDetails = async () => {
      try {
        const response = await fetch(`/api/orders/ticket/${encodeURIComponent(identifier)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('No pudimos cargar el ticket asignado');
        }
        const payload = (await response.json()) as {
          success?: boolean;
          data?: TicketDetailsPayload;
          error?: string;
        };
        if (!payload.success || !payload.data) {
          throw new Error(payload.error ?? 'No pudimos cargar el ticket asignado');
        }
        setData(payload.data);
      } catch (caughtError) {
        if ((caughtError as Error)?.name === 'AbortError') {
          return;
        }
        console.error('[useTicketDetails] fetch failed:', caughtError);
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'No pudimos cargar el ticket asignado';
        setError(message);
        setData(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchDetails();

    return () => {
      controller.abort();
    };
  }, [identifier, refreshCounter]);

  return { data, isLoading, error, refresh };
}
