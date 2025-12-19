'use client';

import { useEffect, useState } from 'react';

interface FavoriteEntry {
  label: string | null;
  value: string | null;
  menuId: string | null;
}

interface ClientFavoritesPayload {
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
  };
}

interface ClientFavoritesHookResult {
  data: ClientFavoritesPayload | null;
  isLoading: boolean;
  error: string | null;
}

export function useClientFavorites(
  clientId: string | null,
  token: string | null | undefined
): ClientFavoritesHookResult {
  const [data, setData] = useState<ClientFavoritesPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !token) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadFavorites = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/favorites`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          success?: boolean;
          data?: ClientFavoritesPayload;
          message?: string;
        };
        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(payload?.message ?? 'No pudimos cargar preferencias del cliente');
        }
        if (!cancelled) {
          setData(payload.data);
        }
      } catch (caughtError) {
        if ((caughtError as Error)?.name === 'AbortError') {
          return;
        }
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'No pudimos cargar preferencias del cliente';
        if (!cancelled) {
          setError(message);
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadFavorites();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [clientId, token]);

  return { data, isLoading, error };
}
