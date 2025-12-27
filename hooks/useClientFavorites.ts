'use client';

import { useCallback, useEffect, useState } from 'react';

export interface FavoriteEntry {
  label: string | null;
  value: string | null;
  menuId: string | null;
}

export interface ClientFavoritesPayload {
  clientId: string;
  favorites: {
    beverageCold: FavoriteEntry;
    beverageHot: FavoriteEntry;
    primaryBeverage: FavoriteEntry;
    food: FavoriteEntry;
  };
  loyalty: {
    weeklyCoffeeCount: number;
    remainingForReward: number;
    stampsGoal: number;
    ordersCount?: number | null;
    interactionsCount?: number | null;
  };
}

interface ClientFavoritesHookResult {
  data: ClientFavoritesPayload | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useClientFavorites(
  clientId: string | null,
  token: string | null | undefined
): ClientFavoritesHookResult {
  const [data, setData] = useState<ClientFavoritesPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(
    async (signal?: AbortSignal) => {
      if (!clientId || !token) {
        setData(null);
        setIsLoading(false);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/favorites`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
          signal,
        });
        const payload = (await response.json()) as {
          success?: boolean;
          data?: ClientFavoritesPayload;
          message?: string;
        };
        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(payload?.message ?? 'No pudimos cargar preferencias del cliente');
        }
        setData(payload.data);
      } catch (caughtError) {
        if ((caughtError as Error)?.name === 'AbortError') {
          return;
        }
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'No pudimos cargar preferencias del cliente';
        setError(message);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [clientId, token]
  );

  useEffect(() => {
    if (!clientId || !token) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    void loadFavorites(controller.signal);
    return () => {
      controller.abort();
    };
  }, [clientId, token, loadFavorites]);

  return {
    data,
    isLoading,
    error,
    refresh: async () => {
      await loadFavorites();
    },
  };
}
