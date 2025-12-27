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

import { useEffect, useMemo, useState } from 'react';
import SearchableDropdown from '@/components/SearchableDropdown';
import { beverageOptions, foodOptions, getMenuItemById } from '@/lib/menuData';
import { useClientFavorites, type ClientFavoritesPayload } from '@/hooks/useClientFavorites';
import { useAuth } from './Auth/AuthProvider';

interface FavoritesSelectProps {
  onUpdate?: () => void;
  initialBeverageId?: string | null;
  initialFoodId?: string | null;
  initialFavorites?: ClientFavoritesPayload | null;
  initialFavoritesLoading?: boolean;
}

interface FavoriteState {
  favoriteBeverageId: string;
  favoriteFoodId: string;
}

function normalizeLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function humanizeId(id: string) {
  return id
    .replace(/^(beverage|food|package)-/, '')
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function resolveMenuLabel(menuItem: ReturnType<typeof getMenuItemById>): string {
  if (!menuItem) return 'Sin seleccionar';
  const label = menuItem.label?.trim();
  if (label && !/^\$/.test(label)) {
    return label;
  }
  return humanizeId(menuItem.id);
}

function resolveMenuId(value: string | null | undefined, category: 'beverage' | 'food'): string {
  if (!value) return '';
  const candidate = value.trim();
  if (!candidate) return '';

  const options = category === 'beverage' ? beverageOptions : foodOptions;
  const directMatch = options.find((option) => option.id === candidate);
  if (directMatch) return directMatch.id;

  const normalizedCandidate = normalizeLabel(candidate);
  const matchByLabel = options.find(
    (option) => normalizeLabel(option.label) === normalizedCandidate
  );
  if (matchByLabel) {
    return matchByLabel.id;
  }

  const condensedCandidate = normalizedCandidate.replace(/[^a-z0-9]/g, '');
  const looseMatch = options.find((option) => {
    const normalizedOption = normalizeLabel(option.label);
    if (
      normalizedOption.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedOption)
    ) {
      return true;
    }
    const condensedOption = normalizedOption.replace(/[^a-z0-9]/g, '');
    return (
      condensedOption.includes(condensedCandidate) || condensedCandidate.includes(condensedOption)
    );
  });
  return looseMatch?.id ?? '';
}

export default function FavoritesSelect({
  onUpdate,
  initialBeverageId,
  initialFoodId,
  initialFavorites,
  initialFavoritesLoading = false,
}: FavoritesSelectProps) {
  const { user, token, updateUser } = useAuth();
  const shouldHydrateFromHook = !initialFavorites;
  const targetClientId = shouldHydrateFromHook ? user?.clientId ?? null : null;
  const {
    data: fetchedFavorites,
    isLoading: fetchedFavoritesLoading,
    error: fetchedFavoritesError,
    refresh: refreshFetchedFavorites,
  } = useClientFavorites(targetClientId, token);
  const resolvedFavorites = initialFavorites ?? fetchedFavorites ?? null;
  const isFavoritesLoading =
    Boolean(initialFavoritesLoading) || (shouldHydrateFromHook && fetchedFavoritesLoading);
  const favoritesError = shouldHydrateFromHook ? fetchedFavoritesError : null;
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const remoteBeverageId = useMemo(() => {
    if (!resolvedFavorites) return initialBeverageId ?? null;
    const primary = resolvedFavorites.favorites.primaryBeverage;
    const cold = resolvedFavorites.favorites.beverageCold;
    const hot = resolvedFavorites.favorites.beverageHot;
    return (
      primary.menuId ??
      primary.value ??
      cold.menuId ??
      cold.value ??
      hot.menuId ??
      hot.value ??
      initialBeverageId ??
      null
    );
  }, [initialBeverageId, resolvedFavorites]);
  const remoteFoodId = useMemo(() => {
    if (!resolvedFavorites) return initialFoodId ?? null;
    const food = resolvedFavorites.favorites.food;
    return food.menuId ?? food.value ?? initialFoodId ?? null;
  }, [initialFoodId, resolvedFavorites]);
  const normalizedBeverageId = useMemo(
    () =>
      resolveMenuId(
        remoteBeverageId ?? user?.favoriteColdDrink ?? user?.favoriteHotDrink,
        'beverage'
      ),
    [remoteBeverageId, user?.favoriteColdDrink, user?.favoriteHotDrink]
  );
  const normalizedFoodId = useMemo(
    () => resolveMenuId(remoteFoodId ?? user?.favoriteFood, 'food'),
    [remoteFoodId, user?.favoriteFood]
  );
  const [favorites, setFavorites] = useState<FavoriteState>({
    favoriteBeverageId: normalizedBeverageId,
    favoriteFoodId: normalizedFoodId,
  });

  useEffect(() => {
    setFavorites((previous) => {
      if (
        previous.favoriteBeverageId === normalizedBeverageId &&
        previous.favoriteFoodId === normalizedFoodId
      ) {
        return previous;
      }
      return {
        favoriteBeverageId: normalizedBeverageId,
        favoriteFoodId: normalizedFoodId,
      };
    });
  }, [normalizedBeverageId, normalizedFoodId]);

  const favoriteSummary = useMemo(() => {
    const beverage = getMenuItemById(favorites.favoriteBeverageId);
    const food = getMenuItemById(favorites.favoriteFoodId);
    return {
      beverageLabel: resolveMenuLabel(beverage),
      foodLabel: resolveMenuLabel(food),
    };
  }, [favorites.favoriteBeverageId, favorites.favoriteFoodId]);
  const loyaltyInfo = resolvedFavorites?.loyalty ?? null;
  const loyaltyStatus = useMemo(() => {
    if (!loyaltyInfo) {
      return null;
    }
    if (loyaltyInfo.remainingForReward <= 0) {
      return 'Tu siguiente café se descuenta automáticamente al completar un pedido elegible.';
    }
    if (loyaltyInfo.remainingForReward === 1) {
      return 'Te falta 1 café para activar la cortesía de la semana.';
    }
    return `Te faltan ${loyaltyInfo.remainingForReward} cafés para la cortesía.`;
  }, [loyaltyInfo]);

  const handleUpdate = async () => {
    if (!token) return;
    setIsUpdating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/user/favorites', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          favoriteBeverageId: favorites.favoriteBeverageId || null,
          favoriteFoodId: favorites.favoriteFoodId || null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        updateUser(result.user);
        if (shouldHydrateFromHook) {
          await refreshFetchedFavorites().catch(() => null);
        }
        onUpdate?.();
        setMessage('Favoritos actualizados exitosamente');
      } else {
        setMessage(result.message || 'No se pudo actualizar los favoritos');
      }
    } catch (error) {
      console.error('Error actualizando favoritos:', error);
      setMessage('Error actualizando favoritos');
    } finally {
      setIsUpdating(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Mis Favoritos</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Personaliza tus bebidas y alimentos favoritos de nuestro menú.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SearchableDropdown
          id="favorite-beverage"
          label="Bebida favorita"
          options={beverageOptions}
          value={favorites.favoriteBeverageId}
          onChange={(value) =>
            setFavorites((prev) => ({
              ...prev,
              favoriteBeverageId: value,
            }))
          }
          helperText={`Seleccionado: ${favoriteSummary.beverageLabel}`}
        />

        <SearchableDropdown
          id="favorite-food"
          label="Alimento favorito"
          options={foodOptions}
          value={favorites.favoriteFoodId}
          onChange={(value) =>
            setFavorites((prev) => ({
              ...prev,
              favoriteFoodId: value,
            }))
          }
          helperText={`Seleccionado: ${favoriteSummary.foodLabel}`}
        />
      </div>

      {isFavoritesLoading && (
        <p className="text-xs text-gray-500 dark:text-gray-400" role="status">
          Sincronizando tus preferencias guardadas…
        </p>
      )}
      {favoritesError && <p className="text-xs text-red-600 dark:text-red-400">{favoritesError}</p>}

      <button
        onClick={handleUpdate}
        disabled={isUpdating}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUpdating ? 'Actualizando...' : 'Guardar favoritos'}
      </button>

      {message && (
        <p className="text-sm text-blue-600 dark:text-blue-400" role="status">
          {message}
        </p>
      )}

      {loyaltyInfo && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900 dark:border-blue-400/30 dark:bg-blue-900/10 dark:text-blue-100">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-700/70 dark:text-blue-200">
            Programa de lealtad
          </p>
          <p className="mt-1 font-semibold text-lg">
            {loyaltyInfo.weeklyCoffeeCount}/{loyaltyInfo.stampsGoal} cafés registrados esta semana
          </p>
          {loyaltyStatus && <p className="mt-1 text-sm">{loyaltyStatus}</p>}
        </div>
      )}
    </div>
  );
}
