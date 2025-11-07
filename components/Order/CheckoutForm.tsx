'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useCartStore } from '@/hooks/useCartStore';
import type { AuthUser } from '@/lib/validations/auth';

interface CheckoutFormProps {
  token: string | null;
  user: AuthUser | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value);

export default function CheckoutForm({ token, user }: CheckoutFormProps) {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();
  const [needsShipping, setNeedsShipping] = useState(false);
  const [useSavedPhone, setUseSavedPhone] = useState(Boolean(user?.phone));
  const [contactPhone, setContactPhone] = useState(user?.phone ?? '');
  const [saveNewPhone, setSaveNewPhone] = useState(false);
  const [isWhatsapp, setIsWhatsapp] = useState(true);
  const [orderNotes, setOrderNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingForm, setShippingForm] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    reference: '',
  });

  useEffect(() => {
    if (useSavedPhone) {
      setContactPhone(user?.phone ?? '');
      setSaveNewPhone(false);
    } else if (!user?.phone) {
      setUseSavedPhone(false);
    }
  }, [useSavedPhone, user?.phone]);

  useEffect(() => {
    if (user?.phone && contactPhone.trim().length === 0) {
      setContactPhone(user.phone);
    }
  }, [user?.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!needsShipping) {
      setShippingForm({
        street: '',
        city: '',
        state: '',
        postalCode: '',
        reference: '',
      });
    }
  }, [needsShipping]);

  const idPrefix = useId();
  const fieldIds = {
    needsShipping: `${idPrefix}-needs-shipping`,
    shippingStreet: `${idPrefix}-shipping-street`,
    shippingCity: `${idPrefix}-shipping-city`,
    shippingState: `${idPrefix}-shipping-state`,
    shippingPostalCode: `${idPrefix}-shipping-postal-code`,
    shippingReference: `${idPrefix}-shipping-reference`,
    useSavedPhone: `${idPrefix}-use-saved-phone`,
    contactPhone: `${idPrefix}-contact-phone`,
    saveNewPhone: `${idPrefix}-save-new-phone`,
    isWhatsapp: `${idPrefix}-is-whatsapp`,
    orderNotes: `${idPrefix}-order-notes`,
  };

  const canSubmit = useMemo(() => {
    if (!items.length || !token) return false;
    if (!needsShipping) return true;
    return (
      contactPhone.trim().length >= 10 &&
      shippingForm.street.trim().length > 3 &&
      shippingForm.city.trim().length > 2 &&
      shippingForm.postalCode.trim().length >= 4
    );
  }, [items.length, needsShipping, contactPhone, shippingForm, token]);

  const shippingDetails = needsShipping &&
    contactPhone.trim().length >= 10 && {
      address: shippingForm,
      contactPhone,
      saveContactPhone: saveNewPhone && !useSavedPhone,
      isWhatsapp,
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError('Inicia sesión para completar tu pedido.');
      return;
    }

    if (!items.length) {
      setFormError('Tu carrito está vacío.');
      return;
    }

    if (
      needsShipping &&
      (contactPhone.trim().length < 10 ||
        shippingForm.street.trim().length < 4 ||
        shippingForm.city.trim().length < 2)
    ) {
      setFormError('Completa una dirección válida y un teléfono de contacto.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/orders/web', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          totalAmount: subtotal,
          notes: orderNotes,
          needsShipping,
          shipping: shippingDetails ?? null,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'No pudimos confirmar tu pedido');
      }

      clearCart();
      router.push('/dashboard/pedidos');
    } catch (error: any) {
      console.error(error);
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          <input
            id={fieldIds.needsShipping}
            type="checkbox"
            checked={needsShipping}
            onChange={(event) => setNeedsShipping(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor={fieldIds.needsShipping}>¿Necesitas envío?</label>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Si prefieres recoger en barra, deja esta opción desactivada.
        </p>
      </div>

      {needsShipping && (
        <div className="space-y-4 rounded-lg border border-primary-100 bg-primary-50 p-4 dark:border-primary-700/40 dark:bg-primary-900/20">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            Las entregas solo están disponibles dentro de un radio máximo de 3 km desde nuestra
            sucursal. Si tu dirección se encuentra fuera de esta zona, te contactaremos para ofrecer
            opciones alternativas.
          </p>
          <div className="space-y-1">
            <p className="text-sm font-medium text-primary-900 dark:text-primary-100">
              Dirección de entrega
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label
                  htmlFor={fieldIds.shippingStreet}
                  className="block text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200"
                >
                  Calle y número
                </label>
                <input
                  id={fieldIds.shippingStreet}
                  type="text"
                  value={shippingForm.street}
                  onChange={(event) =>
                    setShippingForm((prev) => ({ ...prev, street: event.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                  placeholder="Ej. Monterrey 215"
                />
              </div>
              <div>
                <label
                  htmlFor={fieldIds.shippingCity}
                  className="block text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200"
                >
                  Ciudad
                </label>
                <input
                  id={fieldIds.shippingCity}
                  type="text"
                  value={shippingForm.city}
                  onChange={(event) =>
                    setShippingForm((prev) => ({ ...prev, city: event.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor={fieldIds.shippingState}
                  className="block text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200"
                >
                  Estado
                </label>
                <input
                  id={fieldIds.shippingState}
                  type="text"
                  value={shippingForm.state}
                  onChange={(event) =>
                    setShippingForm((prev) => ({ ...prev, state: event.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor={fieldIds.shippingPostalCode}
                  className="block text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200"
                >
                  Código Postal
                </label>
                <input
                  id={fieldIds.shippingPostalCode}
                  type="text"
                  value={shippingForm.postalCode}
                  onChange={(event) =>
                    setShippingForm((prev) => ({ ...prev, postalCode: event.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor={fieldIds.shippingReference}
                  className="block text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200"
                >
                  Referencias para el repartidor
                </label>
                <input
                  id={fieldIds.shippingReference}
                  type="text"
                  value={shippingForm.reference}
                  onChange={(event) =>
                    setShippingForm((prev) => ({ ...prev, reference: event.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                  placeholder="Color de la fachada, nivel, etc."
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {user?.phone && (
              <div className="flex items-center gap-2 text-sm font-medium text-primary-900 dark:text-primary-100">
                <input
                  id={fieldIds.useSavedPhone}
                  type="checkbox"
                  checked={useSavedPhone}
                  onChange={(event) => setUseSavedPhone(event.target.checked)}
                  className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor={fieldIds.useSavedPhone}>
                  Usar mi teléfono guardado ({user.phone})
                </label>
              </div>
            )}

            <div>
              <label
                htmlFor={fieldIds.contactPhone}
                className="block text-sm font-medium text-primary-900 dark:text-primary-100"
              >
                Teléfono de contacto
              </label>
              <input
                id={fieldIds.contactPhone}
                type="tel"
                value={contactPhone}
                onChange={(event) => {
                  setContactPhone(event.target.value);
                  if (event.target.value !== (user?.phone ?? '')) {
                    setSaveNewPhone(true);
                  }
                }}
                disabled={useSavedPhone && Boolean(user?.phone)}
                placeholder="10 dígitos"
                className={clsx(
                  'mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
                  useSavedPhone && user?.phone
                    ? 'border-gray-200 bg-gray-50 text-gray-600'
                    : 'border-primary-200 bg-white dark:border-primary-700 dark:bg-primary-900 dark:text-white'
                )}
              />
            </div>

            {!useSavedPhone &&
              contactPhone.trim().length >= 10 &&
              contactPhone !== (user?.phone ?? '') && (
                <div className="flex items-center gap-2 text-sm text-primary-900 dark:text-primary-100">
                  <input
                    id={fieldIds.saveNewPhone}
                    type="checkbox"
                    checked={saveNewPhone}
                    onChange={(event) => setSaveNewPhone(event.target.checked)}
                    className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor={fieldIds.saveNewPhone}>Guardar este teléfono en mi perfil</label>
                </div>
              )}

            <div className="flex items-center gap-2 text-sm text-primary-900 dark:text-primary-100">
              <input
                id={fieldIds.isWhatsapp}
                type="checkbox"
                checked={isWhatsapp}
                onChange={(event) => setIsWhatsapp(event.target.checked)}
                className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor={fieldIds.isWhatsapp}>Este número es de WhatsApp</label>
            </div>
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor={fieldIds.orderNotes}
          className="block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          Notas para tu pedido (opcional)
        </label>
        <textarea
          id={fieldIds.orderNotes}
          value={orderNotes}
          onChange={(event) => setOrderNotes(event.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="Ej. extra shot, leche vegetal, indicaciones para el repartidor..."
        />
      </div>

      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700 dark:text-gray-200">Subtotal</span>
          <span className="font-semibold text-primary-700 dark:text-primary-300">
            {formatCurrency(subtotal)}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Los costos de envío se calculan al confirmar tu pedido.
        </p>
      </div>

      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/30 dark:text-red-100">
          {formError}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        className="w-full rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Confirmando pedido...' : 'Confirmar Pedido'}
      </button>
    </form>
  );
}
