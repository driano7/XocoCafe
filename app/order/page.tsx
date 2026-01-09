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

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CheckoutForm from '@/components/Order/CheckoutForm';
import { useAuth } from '@/components/Auth/AuthProvider';
import { useCartStore } from '@/hooks/useCartStore';
import SearchableDropdown from '@/components/SearchableDropdown';
import {
  beverageOptions,
  foodOptions,
  getMenuItemById,
  packageOptions,
  type MenuItem,
} from '@/lib/menuData';
import LoyaltyProgressCard from '@/components/LoyaltyProgressCard';
import { useClientFavorites } from '@/hooks/useClientFavorites';
import type { AddressInput } from '@/lib/validations/auth';
import CoffeeBackground from '@/components/CoffeeBackground';

interface DbProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  isActive: boolean;
  metadata?: {
    availableSizes?: string[];
    items?: string[];
    mediumPrice?: number;
    largePrice?: number;
  };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value);

export default function OrderPage() {
  const { user, token, isLoading, updateUser } = useAuth();
  const router = useRouter();
  const { items, addItem, increment, decrement, removeItem, subtotal, itemCount, clearCart } =
    useCartStore();
  const [selectedBeverageId, setSelectedBeverageId] = useState('');
  const [selectedBeverageSize, setSelectedBeverageSize] = useState<string | null>(null);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products');
        const result = await response.json();
        if (result.success) {
          setDbProducts(result.data);
        }
      } catch (error) {
        console.error('Error fetching DB products:', error);
      } finally {
        setDbLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const dynamicBeverages = useMemo(() => {
    const fromDb = dbProducts
      .filter((p) => p.category === 'beverage' && p.isActive)
      .map((p) => ({
        id: p.id,
        label: p.name,
        category: 'beverage' as const,
        price: p.price,
        metadata: {
          availableSizes: p.metadata?.availableSizes ?? ['único'],
          items: p.metadata?.items ?? [],
        },
      }));
    return fromDb.length > 0 ? fromDb : beverageOptions;
  }, [dbProducts]);

  const dynamicFoods = useMemo(() => {
    const fromDb = dbProducts
      .filter((p) => p.category === 'food' && p.isActive)
      .map((p) => ({
        id: p.id,
        label: p.name,
        category: 'food' as const,
        price: p.price,
        metadata: {
          items: p.metadata?.items ?? [],
          availableSizes: p.metadata?.availableSizes ?? ['único'],
        },
      }));
    return fromDb.length > 0 ? fromDb : foodOptions;
  }, [dbProducts]);

  const dynamicPackages = useMemo(() => {
    const fromDb = dbProducts
      .filter((p) => (p.category === 'package' || p.category === 'other') && p.isActive)
      .map((p) => ({
        id: p.id,
        label: p.name,
        category: 'package' as const,
        price: p.price,
        metadata: { items: p.metadata?.items ?? [] },
      }));
    return fromDb.length > 0 ? fromDb : packageOptions;
  }, [dbProducts]);

  const getMenuItem = (id: string): MenuItem | undefined => {
    const fromDb = dbProducts.find((p) => p.id === id);
    if (fromDb) {
      return {
        id: fromDb.id,
        label: fromDb.name,
        category: fromDb.category as MenuItem['category'],
        price: fromDb.price,
        metadata: {
          items: fromDb.metadata?.items ?? [],
          availableSizes: fromDb.metadata?.availableSizes ?? ['único'],
          mediumPrice: null,
          largePrice: null,
        },
      };
    }
    return getMenuItemById(id);
  };

  const { data: clientFavorites, isLoading: isOrderFavoritesLoading } = useClientFavorites(
    user?.clientId ?? null,
    token
  );

  const loyaltyWeeklyCoffees =
    clientFavorites?.loyalty?.weeklyCoffeeCount ?? user?.weeklyCoffeeCount ?? 0;
  const loyaltyGoal = clientFavorites?.loyalty?.stampsGoal ?? 7;
  const loyaltyOrdersCount = clientFavorites?.loyalty?.ordersCount ?? null;
  const loyaltyInteractions = clientFavorites?.loyalty?.interactionsCount ?? null;
  const loyaltyCardName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.clientId ||
    undefined;

  const selectedBeverage = selectedBeverageId ? getMenuItem(selectedBeverageId) : null;
  const beverageSizeList = selectedBeverage?.metadata?.availableSizes;
  const selectedBeverageSizes = selectedBeverage
    ? Array.isArray(beverageSizeList) && beverageSizeList.length > 0
      ? beverageSizeList
      : ['único']
    : [];
  const beverageRequiresSizeSelection = selectedBeverageSizes.length > 1;

  const resolveMenuItemPrice = (menuId: string): number => {
    const menuItem = getMenuItem(menuId);
    if (!menuItem) return 55;
    return menuItem.price ?? menuItem.metadata?.mediumPrice ?? menuItem.metadata?.largePrice ?? 55;
  };

  const handleAddressesUpdate = useCallback(
    (addresses: AddressInput[]) => {
      if (!user) return;
      updateUser({ ...user, addresses });
    },
    [updateUser, user]
  );

  const determineRewardLineId = useCallback(
    (currentItems: typeof items) => {
      if (!user?.weeklyCoffeeCount || user.weeklyCoffeeCount < 6) {
        return null;
      }
      const beverages = currentItems
        .filter((item) => item.category === 'beverage')
        .sort((a, b) => a.lineId.localeCompare(b.lineId));
      if (beverages.length < 1) {
        return null;
      }
      return beverages[beverages.length - 1].lineId;
    },
    [user?.weeklyCoffeeCount]
  );

  const [rewardLineId, setRewardLineId] = useState<string | null>(null);

  useEffect(() => {
    setRewardLineId(determineRewardLineId(items));
  }, [determineRewardLineId, items]);

  const handleQuickAdd = (menuId: string, options?: { size?: string | null }) => {
    const menuItem = getMenuItem(menuId);
    if (!menuItem) return;
    const inferredPrice = resolveMenuItemPrice(menuId);
    addItem({
      productId: menuId,
      name: menuItem.label,
      price: inferredPrice,
      category: menuItem.category as MenuItem['category'],
      size: options?.size ?? null,
      packageItems: menuItem.metadata?.items ?? null,
    });
  };

  const resetBeverageSelection = () => {
    setSelectedBeverageId('');
    setSelectedBeverageSize(null);
  };

  const handleBeverageSelection = (menuId: string) => {
    setSelectedBeverageId(menuId);
    if (!menuId) {
      setSelectedBeverageSize(null);
      return;
    }
    const menuItem = getMenuItem(menuId);
    if (!menuItem) return;
    const sizeOptions =
      Array.isArray(menuItem.metadata?.availableSizes) && menuItem.metadata?.availableSizes.length
        ? menuItem.metadata.availableSizes
        : ['único'];
    if (sizeOptions.length <= 1) {
      handleQuickAdd(menuId, { size: sizeOptions[0] ?? null });
      resetBeverageSelection();
    } else {
      setSelectedBeverageSize(null);
    }
  };

  const handleBeverageSizeSelection = (size: string) => {
    if (!selectedBeverageId || !size) return;
    setSelectedBeverageSize(size);
    handleQuickAdd(selectedBeverageId, { size });
    resetBeverageSelection();
  };

  const handleFoodSelection = (menuId: string) => {
    setSelectedFoodId(menuId);
    if (!menuId) return;
    handleQuickAdd(menuId);
    setSelectedFoodId('');
  };

  const handlePackageSelection = (menuId: string) => {
    setSelectedPackageId(menuId);
    if (!menuId) return;
    handleQuickAdd(menuId);
    setSelectedPackageId('');
  };

  const clearQuickSelections = () => {
    setSelectedBeverageId('');
    setSelectedBeverageSize(null);
    setSelectedFoodId('');
    setSelectedPackageId('');
  };

  useEffect(() => {
    clearQuickSelections();
  }, [user?.id]);

  useEffect(() => {
    if (!selectedBeverageId) {
      setSelectedBeverageSize(null);
    }
  }, [selectedBeverageId]);

  useEffect(() => {
    router.prefetch('/dashboard/pedidos');
  }, [router]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-gray-700 dark:text-gray-200">
        Cargando tus datos...
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-gray-700 dark:text-gray-200">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Inicia sesión</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Necesitas una cuenta activa para crear o programar pedidos online. Inicia sesión o crea tu
          cuenta para continuar.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.35em] text-white shadow hover:bg-primary-700"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  const quickAddSection = (
    <div className="rounded-2xl border border-primary-100 bg-primary-50/40 p-5 shadow-sm dark:border-primary-800/40 dark:bg-primary-900/20">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-100">
          Agrega rápido desde el menú
        </h2>
        <p className="text-sm text-primary-700 dark:text-primary-200">
          Usa los mismos dropdowns de tus favoritos para elegir bebidas y alimentos.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative">
          <SearchableDropdown
            id="quick-beverage"
            label="Bebida"
            options={dynamicBeverages}
            value={selectedBeverageId}
            onChange={handleBeverageSelection}
            helperText={
              selectedBeverageId
                ? beverageRequiresSizeSelection
                  ? 'Elige el tamaño para agregarla al carrito.'
                  : `Precio estimado: ${formatCurrency(resolveMenuItemPrice(selectedBeverageId))}`
                : dbLoading
                ? 'Cargando bebidas premium...'
                : 'Selecciona una bebida y la agregamos al instante'
            }
          />
          {dbLoading && (
            <div className="pointer-events-none absolute right-10 top-[38px] flex h-5 w-5 items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          )}
          {selectedBeverageId && beverageRequiresSizeSelection && (
            <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-300">
              <label
                className="block text-xs font-medium text-gray-600 dark:text-gray-300"
                htmlFor="quick-beverage-size"
              >
                Tamaño
              </label>
              <select
                id="quick-beverage-size"
                value={selectedBeverageSize ?? ''}
                onChange={(event) => handleBeverageSizeSelection(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="" disabled>
                  Selecciona un tamaño…
                </option>
                {selectedBeverageSizes.map((size: string) => (
                  <option key={size} value={size}>
                    {size[0].toUpperCase() + size.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="relative">
          <SearchableDropdown
            id="quick-food"
            label="Alimento"
            options={dynamicFoods}
            value={selectedFoodId}
            onChange={handleFoodSelection}
            helperText={
              selectedFoodId
                ? `Precio estimado: ${formatCurrency(resolveMenuItemPrice(selectedFoodId))}`
                : dbLoading
                ? 'Cargando alimentos frescos...'
                : 'Selecciona un alimento y lo agregamos al momento'
            }
          />
          {dbLoading && (
            <div className="pointer-events-none absolute right-10 top-[38px] flex h-5 w-5 items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          )}
        </div>

        <div className="relative">
          <SearchableDropdown
            id="quick-package"
            label="Paquetes y Combos"
            options={dynamicPackages}
            value={selectedPackageId}
            onChange={handlePackageSelection}
            helperText={
              selectedPackageId
                ? `Precio estimado: ${formatCurrency(resolveMenuItemPrice(selectedPackageId))}`
                : dbLoading
                ? 'Cargando paquetes especiales...'
                : 'Selecciona un paquete y lo agregamos al carrito'
            }
          />
          {dbLoading && (
            <div className="pointer-events-none absolute right-10 top-[38px] flex h-5 w-5 items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <CoffeeBackground className="py-10">
      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-0">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            Pide Online y Recoge o Recibe en Casa
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Selecciona tus bebidas y alimentos favoritos. Puedes recogerlos en nuestro café o pedir
            envío.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
          <section className="space-y-6">
            {user && (
              <div className="hidden" aria-hidden>
                <LoyaltyProgressCard
                  coffees={loyaltyWeeklyCoffees}
                  goal={loyaltyGoal}
                  orders={loyaltyOrdersCount ?? undefined}
                  totalInteractions={loyaltyInteractions ?? undefined}
                  customerName={loyaltyCardName}
                  isLoading={isOrderFavoritesLoading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Recuerda: los pedidos registrados como “Público general” no acumulan sellos de
                  lealtad. Identifícate con tu ID para seguir sumando cafés.
                </p>
              </div>
            )}
            {quickAddSection}
          </section>

          <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tu pedido</h2>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearCart()}
                  className="text-sm text-red-600 hover:underline"
                >
                  Vaciar
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-gray-500">Aún no tienes productos en tu carrito.</p>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.lineId}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {item.name}{' '}
                        {rewardLineId === item.lineId && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-800">
                            Cortesía
                          </span>
                        )}
                      </p>
                      {item.size && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Tamaño: {item.size}
                        </p>
                      )}
                      {item.category === 'package' && item.packageItems?.length ? (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Incluye: {item.packageItems.join(', ')}
                        </p>
                      ) : null}
                      <p className="text-xs text-gray-500">
                        {rewardLineId === item.lineId ? 'Gratis' : formatCurrency(item.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => decrement(item.lineId)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="min-w-[24px] text-center text-sm font-medium text-gray-700 dark:text-gray-100">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => increment(item.lineId)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {rewardLineId === item.lineId
                        ? 'Gratis'
                        : formatCurrency(item.price * item.quantity)}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.lineId)}
                      className="text-sm text-red-500 hover:text-red-600"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
                  <span>Artículos ({itemCount})</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              </div>
            )}

            <CheckoutForm token={token} user={user} onAddressesUpdate={handleAddressesUpdate} />
          </aside>
        </div>
      </div>
    </CoffeeBackground>
  );
}
