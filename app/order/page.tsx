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
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CheckoutForm from '@/components/Order/CheckoutForm';
import { useAuth } from '@/components/Auth/AuthProvider';
import { useCartStore } from '@/hooks/useCartStore';
import { useLoyaltyReminder } from '@/hooks/useLoyaltyReminder';
import LoyaltyProgramPanel from '@/components/LoyaltyProgramPanel';
import SearchableDropdown from '@/components/SearchableDropdown';
import { beverageOptions, foodOptions, getMenuItemById, packageOptions } from '@/lib/menuData';
import type { AddressInput } from '@/lib/validations/auth';

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
  const loyaltyReminder = useLoyaltyReminder({
    userId: user?.id,
    enrolled: user?.loyaltyEnrolled ?? false,
    token,
  });
  const [loyaltyReminderAlert, setLoyaltyReminderAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const loyaltyStamps = Math.max(0, Math.min(7, user?.weeklyCoffeeCount ?? 0));
  const normalizeMetric = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;
  const monthlyMetrics = (user?.monthlyMetrics ?? null) as Record<string, unknown> | null;
  const userRecord = (user ?? null) as Record<string, unknown> | null;
  const loyaltyOrdersCount =
    normalizeMetric(monthlyMetrics?.['orders']) ??
    normalizeMetric(monthlyMetrics?.['totalOrders']) ??
    normalizeMetric(userRecord?.['ordersCount']);
  const loyaltyInteractionsCount =
    normalizeMetric(monthlyMetrics?.['interactions']) ??
    normalizeMetric(monthlyMetrics?.['totalInteractions']) ??
    normalizeMetric(userRecord?.['interactionsCount']);
  const [selectedBeverageId, setSelectedBeverageId] = useState('');
  const [selectedBeverageSize, setSelectedBeverageSize] = useState<string | null>(null);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const selectedBeverage = selectedBeverageId ? getMenuItemById(selectedBeverageId) : null;
  const beverageSizeList = selectedBeverage?.metadata?.availableSizes;
  const selectedBeverageSizes = selectedBeverage
    ? Array.isArray(beverageSizeList) && beverageSizeList.length > 0
      ? beverageSizeList
      : ['único']
    : [];
  const beverageRequiresSizeSelection = selectedBeverageSizes.length > 1;

  const resolveMenuItemPrice = (menuId: string): number => {
    const menuItem = getMenuItemById(menuId);
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

  const handleActivateLoyaltyReminder = async () => {
    const result = await loyaltyReminder.activate();
    setLoyaltyReminderAlert({
      type: result.success ? 'success' : 'error',
      message:
        result.message ??
        (result.success
          ? 'Activamos tu programa de lealtad. Ya puedes acumular sellos.'
          : 'No pudimos activar tu programa de lealtad. Intenta más tarde.'),
    });
  };

  const handleQuickAdd = (menuId: string, options?: { size?: string | null }) => {
    const menuItem = getMenuItemById(menuId);
    if (!menuItem) return;
    const inferredPrice = resolveMenuItemPrice(menuId);
    addItem({
      productId: menuId,
      name: menuItem.label,
      price: inferredPrice,
      category: menuItem.category,
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
    const menuItem = getMenuItemById(menuId);
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
    if (!loyaltyReminderAlert) {
      return undefined;
    }
    const timeout = setTimeout(() => setLoyaltyReminderAlert(null), 4000);
    return () => clearTimeout(timeout);
  }, [loyaltyReminderAlert]);

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
        <div>
          <SearchableDropdown
            id="quick-beverage"
            label="Bebida"
            options={beverageOptions}
            value={selectedBeverageId}
            onChange={handleBeverageSelection}
            helperText={
              selectedBeverageId
                ? beverageRequiresSizeSelection
                  ? 'Elige el tamaño para agregarla al carrito.'
                  : `Precio estimado: ${formatCurrency(resolveMenuItemPrice(selectedBeverageId))}`
                : 'Selecciona una bebida y la agregamos al instante'
            }
          />
          {selectedBeverageId && beverageRequiresSizeSelection && (
            <div className="mt-2">
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
                {selectedBeverageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size[0].toUpperCase() + size.slice(1)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                La bebida se agrega automáticamente al elegir el tamaño.
              </p>
            </div>
          )}
        </div>

        <div>
          <SearchableDropdown
            id="quick-food"
            label="Alimento"
            options={foodOptions}
            value={selectedFoodId}
            onChange={handleFoodSelection}
            helperText={
              selectedFoodId
                ? `Precio estimado: ${formatCurrency(resolveMenuItemPrice(selectedFoodId))}`
                : 'Selecciona un alimento y lo agregamos al momento'
            }
          />
        </div>

        <div>
          <SearchableDropdown
            id="quick-package"
            label="Paquete"
            options={packageOptions}
            value={selectedPackageId}
            onChange={handlePackageSelection}
            helperText={
              selectedPackageId
                ? `Incluye: ${
                    (getMenuItemById(selectedPackageId)?.metadata?.items ?? []).join(', ') || '—'
                  }`
                : 'Selecciona un combo y lo agregamos automáticamente'
            }
          />
        </div>
      </div>
    </div>
  );

  return (
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
          {quickAddSection}
          <LoyaltyProgramPanel
            as="div"
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900"
            stamps={loyaltyStamps}
            customerName={
              [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
              user?.email ||
              undefined
            }
            ordersCount={loyaltyOrdersCount ?? undefined}
            interactionsCount={loyaltyInteractionsCount ?? undefined}
            reminderAlert={loyaltyReminderAlert}
            showReminderCard={loyaltyReminder.showReminder}
            onActivateReminder={handleActivateLoyaltyReminder}
            isActivatingReminder={loyaltyReminder.isActivating}
          />
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
                      {item.name}
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
                    <p className="text-xs text-gray-500">{formatCurrency(item.price)}</p>
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
                    {formatCurrency(item.price * item.quantity)}
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
  );
}
