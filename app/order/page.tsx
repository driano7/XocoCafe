'use client';

import { useEffect, useState } from 'react';
import CheckoutForm from '@/components/Order/CheckoutForm';
import { useAuth } from '@/components/Auth/AuthProvider';
import { useCartStore } from '@/hooks/useCartStore';
import SearchableDropdown from '@/components/SearchableDropdown';
import { beverageOptions, foodOptions, getMenuItemById } from '@/lib/menuData';

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
  const [selectedBeverageId, setSelectedBeverageId] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState('');

  const resolveMenuItemPrice = (menuId: string): number => {
    const menuItem = getMenuItemById(menuId);
    if (!menuItem) return 55;
    return menuItem.price ?? menuItem.metadata?.mediumPrice ?? menuItem.metadata?.largePrice ?? 55;
  };

  const handleQuickAdd = (menuId: string) => {
    const menuItem = getMenuItemById(menuId);
    if (!menuItem) return;
    const inferredPrice = resolveMenuItemPrice(menuId);
    addItem({
      productId: menuId,
      name: menuItem.label,
      price: inferredPrice,
    });
  };

  const clearQuickSelections = () => {
    setSelectedBeverageId('');
    setSelectedFoodId('');
  };

  useEffect(() => {
    clearQuickSelections();
  }, [user?.id]);

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
          <button
            type="button"
            onClick={() => {
              if (selectedBeverageId) {
                handleQuickAdd(selectedBeverageId);
                setSelectedBeverageId('');
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
                  key={item.productId}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-700"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.price)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => decrement(item.productId)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="min-w-[24px] text-center text-sm font-medium text-gray-700 dark:text-gray-100">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => increment(item.productId)}
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
                    onClick={() => removeItem(item.productId)}
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
