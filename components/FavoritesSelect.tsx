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
import { useAuth } from './Auth/AuthProvider';

interface FavoritesSelectProps {
  onUpdate?: () => void;
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
  return matchByLabel?.id ?? '';
}

export default function FavoritesSelect({ onUpdate }: FavoritesSelectProps) {
  const { user, token, updateUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteState>({
    favoriteBeverageId: resolveMenuId(user?.favoriteColdDrink, 'beverage'),
    favoriteFoodId: resolveMenuId(user?.favoriteFood, 'food'),
  });

  useEffect(() => {
    setFavorites({
      favoriteBeverageId: resolveMenuId(user?.favoriteColdDrink, 'beverage'),
      favoriteFoodId: resolveMenuId(user?.favoriteFood, 'food'),
    });
  }, [user?.favoriteColdDrink, user?.favoriteFood]);

  const favoriteSummary = useMemo(() => {
    const beverage = getMenuItemById(favorites.favoriteBeverageId);
    const food = getMenuItemById(favorites.favoriteFoodId);
    return {
      beverageLabel: beverage?.label ?? 'Sin seleccionar',
      foodLabel: food?.label ?? 'Sin seleccionar',
    };
  }, [favorites.favoriteBeverageId, favorites.favoriteFoodId]);

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
    <div className="space-y-4">
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
    </div>
  );
}
