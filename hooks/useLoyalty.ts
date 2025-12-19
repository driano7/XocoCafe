'use client';

import { useCallback, useEffect, useState } from 'react';

export interface LoyaltyCustomer {
  userId: string;
  orders: number;
  reservations: number;
  totalInteractions: number;
  totalSpent: number;
  lastActivity?: string | null;
  clientId?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  firstNameEncrypted?: string | null;
  lastNameEncrypted?: string | null;
  favoriteBeverage?: string | null;
  favoriteFood?: string | null;
  loyaltyCoffees?: number | null;
}

export interface LoyaltyStats {
  topCustomer: LoyaltyCustomer | null;
  customers: LoyaltyCustomer[];
}

interface LoyaltyHookResult {
  stats: LoyaltyStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const normalizeStats = (payload: unknown): LoyaltyStats | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const data = payload as { topCustomer?: unknown; customers?: unknown };
  const customers = Array.isArray(data.customers)
    ? data.customers.filter((entry): entry is LoyaltyCustomer =>
        Boolean(entry && typeof entry === 'object')
      )
    : [];
  const topCustomer =
    data.topCustomer && typeof data.topCustomer === 'object'
      ? (data.topCustomer as LoyaltyCustomer)
      : null;
  return { topCustomer, customers };
};

export function useLoyalty(): LoyaltyHookResult {
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/loyalty', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('No pudimos cargar las métricas de lealtad');
      }
      const payload = (await response.json()) as {
        success?: boolean;
        data?: unknown;
        error?: string;
      };
      if (!payload?.success || !payload.data) {
        throw new Error(payload?.error ?? 'Respuesta inválida del servidor');
      }
      const normalized = normalizeStats(payload.data);
      if (!normalized) {
        throw new Error('No pudimos normalizar las métricas de lealtad');
      }
      setStats(normalized);
    } catch (caughtError) {
      console.error('[useLoyalty] loadStats failed:', caughtError);
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'No pudimos cargar las métricas de lealtad';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: loadStats,
  };
}
