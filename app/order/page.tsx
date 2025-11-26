'use client';

import { useEffect, useState } from 'react';
import CheckoutForm from '@/components/Order/CheckoutForm';
import { useAuth } from '@/components/Auth/AuthProvider';
import { useCartStore } from '@/hooks/useCartStore';
import LoyaltyReminderCard from '@/components/LoyaltyReminderCard';
import { useLoyaltyReminder } from '@/hooks/useLoyaltyReminder';
import SearchableDropdown from '@/components/SearchableDropdown';
import { beverageOptions, foodOptions, getMenuItemById, packageOptions } from '@/lib/menuData';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value);

export default function OrderPage() {
  const { user, token } = useAuth();
  const { items, addItem, increment, decrement, removeItem, subtotal, itemCount, clearCart } =
    useCartStore();
  const loyaltyReminder = useLoyaltyReminder({
    userId: user?.id,
    enrolled: user?.loyaltyEnrolled ?? false,
    token,
  });
  const [loyaltyNotice, setLoyaltyNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [selectedBeverageId, setSelectedBeverageId] = useState('');
  const [selectedBeverageSize, setSelectedBeverageSize] = useState<string | null>(null);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');

  const resolveMenuItemPrice = (menuId: string): number => {
    const menuItem = getMenuItemById(menuId);
    if (!menuItem) return 55;
    return menuItem.price ?? menuItem.metadata?.mediumPrice ?? menuItem.metadata?.largePrice ?? 55;
  };

  const resolveDefaultSize = (menuId: string) => {
    const menuItem = getMenuItemById(menuId);
    if (!menuItem) return null;
    return menuItem.metadata?.defaultSize ?? menuItem.metadata?.availableSizes?.[0] ?? null;
  };

  const handleActivateLoyaltyReminder = async () => {
    const result = await loyaltyReminder.activate();
    setLoyaltyNotice({
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
      return;
    }
    setSelectedBeverageSize(resolveDefaultSize(selectedBeverageId));
  }, [selectedBeverageId]);

  useEffect(() => {
    if (!loyaltyNotice) {
      return undefined;
    }
    const timeout = setTimeout(() => setLoyaltyNotice(null), 4000);
    return () => clearTimeout(timeout);
  }, [loyaltyNotice]);

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
            onChange={setSelectedBeverageId}
            helperText={
              selectedBeverageId
                ? `Precio estimado: ${formatCurrency(resolveMenuItemPrice(selectedBeverageId))}`
                : 'Selecciona tu bebida preferida'
            }
          />
          {selectedBeverageId && (
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
                onChange={(event) => setSelectedBeverageSize(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {(getMenuItemById(selectedBeverageId)?.metadata?.availableSizes ?? ['único']).map(
                  (size) => (
                    <option key={size} value={size}>
                      {size[0].toUpperCase() + size.slice(1)}
                    </option>
                  )
                )}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (selectedBeverageId) {
                handleQuickAdd(selectedBeverageId, { size: selectedBeverageSize });
                setSelectedBeverageId('');
                setSelectedBeverageSize(null);
              }
            }}
            disabled={!selectedBeverageId}
            className="mt-2 w-full rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Agregar bebida
          </button>
        </div>

        <div>
          <SearchableDropdown
            id="quick-food"
            label="Alimento"
            options={foodOptions}
            value={selectedFoodId}
            onChange={setSelectedFoodId}
            helperText={
              selectedFoodId
                ? `Precio estimado: ${formatCurrency(resolveMenuItemPrice(selectedFoodId))}`
                : 'Selecciona un alimento'
            }
          />
          <button
            type="button"
            onClick={() => {
              if (selectedFoodId) {
                handleQuickAdd(selectedFoodId);
                setSelectedFoodId('');
              }
            }}
            disabled={!selectedFoodId}
            className="mt-2 w-full rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Agregar alimento
          </button>
        </div>

        <div>
          <SearchableDropdown
            id="quick-package"
            label="Paquete"
            options={packageOptions}
            value={selectedPackageId}
            onChange={setSelectedPackageId}
            helperText={
              selectedPackageId
                ? `Incluye: ${
                    (getMenuItemById(selectedPackageId)?.metadata?.items ?? []).join(', ') || '—'
                  }`
                : 'Agrega combos populares'
            }
          />
          <button
            type="button"
            onClick={() => {
              if (selectedPackageId) {
                handleQuickAdd(selectedPackageId);
                setSelectedPackageId('');
              }
            }}
            disabled={!selectedPackageId}
            className="mt-2 w-full rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Agregar paquete
          </button>
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

      {loyaltyNotice && (
        <div
          className={`mb-4 rounded-full px-4 py-2 text-sm font-semibold ${
            loyaltyNotice.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100'
          }`}
        >
          {loyaltyNotice.message}
        </div>
      )}

      {loyaltyReminder.showReminder && (
        <LoyaltyReminderCard
          onActivate={handleActivateLoyaltyReminder}
          isLoading={loyaltyReminder.isActivating}
          className="mb-8"
        />
      )}

      <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
        <section className="space-y-6">{quickAddSection}</section>

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

          <CheckoutForm token={token} user={user} />
        </aside>
      </div>
    </div>
  );
}
