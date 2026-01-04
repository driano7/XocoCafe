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

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useCartStore } from '@/hooks/useCartStore';
import type { AddressInput, AuthUser } from '@/lib/validations/auth';
import { MAX_SAVED_ADDRESSES } from '@/lib/address-constants';
import { enqueuePendingSnackbar } from '@/lib/pendingSnackbar';

interface CheckoutFormProps {
  token: string | null;
  user: AuthUser | null;
  onAddressesUpdate?: (addresses: AddressInput[]) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(value);

const TIP_PRESETS = [5, 10, 15, 20];
const MAX_DELIVERY_RADIUS_KM = 2;

const parsePositiveNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

type SavedAddress = AddressInput & { id: string };

export default function CheckoutForm({ token, user, onAddressesUpdate }: CheckoutFormProps) {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();
  const [needsShipping, setNeedsShipping] = useState(false);
  const [useSavedPhone, setUseSavedPhone] = useState(Boolean(user?.phone));
  const [contactPhone, setContactPhone] = useState(user?.phone ?? '');
  const [saveNewPhone, setSaveNewPhone] = useState(false);
  const [isWhatsapp, setIsWhatsapp] = useState(true);
  const [orderNotes, setOrderNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => {
    if (!Array.isArray(user?.addresses)) {
      return [];
    }
    return (user?.addresses ?? []).filter((address): address is SavedAddress =>
      Boolean(address?.id)
    ) as SavedAddress[];
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressesLoaded, setAddressesLoaded] = useState(Boolean(user?.addresses?.length));
  const [isAddressListLoading, setIsAddressListLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressToast, setAddressToast] = useState<string | null>(null);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [wantsToSaveAddress, setWantsToSaveAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tipSelection, setTipSelection] = useState<'preset' | 'custom' | null>(null);
  const [selectedTipPercent, setSelectedTipPercent] = useState<number | null>(null);
  const [customTipPercent, setCustomTipPercent] = useState('');
  const [customTipAmount, setCustomTipAmount] = useState('');
  const [useCustomTipAmount, setUseCustomTipAmount] = useState(false);
  const [deliveryTipPercent, setDeliveryTipPercent] = useState<number | null>(null);
  const [shippingForm, setShippingForm] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: user?.country ?? 'México',
    reference: '',
  });
  const [customerName, setCustomerName] = useState(() => {
    const fullName = [user?.firstName, user?.lastName]
      .filter((value) => Boolean(value && value.trim().length > 0))
      .join(' ')
      .trim();
    return fullName || '';
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
        country: user?.country ?? 'México',
        reference: '',
      });
      setDeliveryTipPercent(null);
    }
  }, [needsShipping, user?.country]);

  useEffect(() => {
    if (Array.isArray(user?.addresses)) {
      const normalized = (user?.addresses ?? []).filter((address): address is SavedAddress =>
        Boolean(address.id)
      ) as SavedAddress[];
      setSavedAddresses(normalized);
      if (normalized.length > 0) {
        setAddressesLoaded(true);
      }
    }
  }, [user?.addresses]);

  const loadSavedAddresses = useCallback(async () => {
    if (!token) return;
    try {
      setIsAddressListLoading(true);
      setAddressError(null);
      const response = await fetch('/api/addresses', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        const entries: SavedAddress[] = (result.data ?? []).filter((address: AddressInput) =>
          Boolean(address.id)
        );
        setSavedAddresses(entries);
        onAddressesUpdate?.(entries);
        setAddressesLoaded(true);
      } else {
        setAddressError(result.message ?? 'No pudimos cargar tus direcciones guardadas.');
      }
    } catch (error) {
      setAddressError('Error al cargar tus direcciones guardadas.');
    } finally {
      setIsAddressListLoading(false);
    }
  }, [onAddressesUpdate, token]);

  useEffect(() => {
    if (needsShipping && token && !addressesLoaded) {
      void loadSavedAddresses();
    }
  }, [addressesLoaded, loadSavedAddresses, needsShipping, token]);

  useEffect(() => {
    if (items.length === 0) {
      setTipSelection(null);
      setSelectedTipPercent(null);
      setCustomTipPercent('');
      setCustomTipAmount('');
      setUseCustomTipAmount(false);
    }
  }, [items.length]);

  const addressLimitReached = savedAddresses.length >= MAX_SAVED_ADDRESSES;

  useEffect(() => {
    if (!needsShipping) {
      setSelectedAddressId(null);
      setWantsToSaveAddress(false);
    }
  }, [needsShipping]);

  useEffect(() => {
    if (addressLimitReached && needsShipping) {
      setAddressToast(`Solo puedes guardar ${MAX_SAVED_ADDRESSES} direcciones.`);
    }
  }, [addressLimitReached, needsShipping]);
  useEffect(() => {
    if (user) {
      const fullName = [user.firstName, user.lastName]
        .filter((value) => Boolean(value && value.trim().length > 0))
        .join(' ')
        .trim();
      if (fullName) {
        setCustomerName(fullName);
      }
    }
  }, [user?.firstName, user?.lastName]);

  useEffect(() => {
    if (!addressToast) {
      return undefined;
    }
    const timeout = setTimeout(() => setAddressToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [addressToast]);

  const idPrefix = useId();
  const fieldIds = {
    needsShipping: `${idPrefix}-needs-shipping`,
    shippingStreet: `${idPrefix}-shipping-street`,
    shippingCity: `${idPrefix}-shipping-city`,
    shippingState: `${idPrefix}-shipping-state`,
    shippingPostalCode: `${idPrefix}-shipping-postal-code`,
    shippingCountry: `${idPrefix}-shipping-country`,
    shippingReference: `${idPrefix}-shipping-reference`,
    useSavedPhone: `${idPrefix}-use-saved-phone`,
    contactPhone: `${idPrefix}-contact-phone`,
    saveNewPhone: `${idPrefix}-save-new-phone`,
    isWhatsapp: `${idPrefix}-is-whatsapp`,
    orderNotes: `${idPrefix}-order-notes`,
  };
  const selectedAddress = useMemo(
    () => savedAddresses.find((address) => address.id === selectedAddressId) ?? null,
    [savedAddresses, selectedAddressId]
  );

  useEffect(() => {
    if (selectedAddress) {
      setShippingForm({
        street: selectedAddress.street ?? '',
        city: selectedAddress.city ?? '',
        state: selectedAddress.state ?? '',
        postalCode: selectedAddress.postalCode ?? '',
        country: selectedAddress.country ?? user?.country ?? 'México',
        reference: selectedAddress.reference ?? '',
      });
    }
  }, [selectedAddress, user?.country]);

  useEffect(() => {
    if (!selectedAddress) {
      return;
    }
    if (selectedAddress.contactPhone) {
      setContactPhone(selectedAddress.contactPhone);
      setUseSavedPhone(selectedAddress.contactPhone === (user?.phone ?? ''));
    }
    if (typeof selectedAddress.isWhatsapp === 'boolean') {
      setIsWhatsapp(Boolean(selectedAddress.isWhatsapp));
    }
  }, [selectedAddress, user?.phone]);

  const canSubmit = useMemo(() => {
    if (!token) return false;
    if (!items.length) return false;
    if (customerName.trim().length < 2) return false;
    if (!needsShipping) return true;
    return (
      contactPhone.trim().length >= 10 &&
      shippingForm.street.trim().length > 3 &&
      shippingForm.city.trim().length > 2 &&
      shippingForm.postalCode.trim().length >= 4 &&
      shippingForm.country.trim().length >= 2
    );
  }, [contactPhone, customerName, items.length, needsShipping, shippingForm, token]);

  const { tipAmount, appliedPercent } = useMemo(() => {
    if (subtotal <= 0) {
      return { tipAmount: 0, appliedPercent: null as number | null };
    }
    let amount = 0;
    let percent: number | null = null;

    if (tipSelection === 'preset' && typeof selectedTipPercent === 'number') {
      percent = selectedTipPercent;
      amount = subtotal * (percent / 100);
    } else if (tipSelection === 'custom') {
      if (useCustomTipAmount) {
        const parsedAmount = parsePositiveNumber(customTipAmount);
        if (parsedAmount !== null) {
          amount = parsedAmount;
          percent = subtotal > 0 ? (parsedAmount / subtotal) * 100 : null;
        }
      } else {
        const parsedPercent = parsePositiveNumber(customTipPercent);
        if (parsedPercent !== null) {
          percent = parsedPercent;
          amount = subtotal * (parsedPercent / 100);
        }
      }
    }

    return {
      tipAmount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
      appliedPercent: percent,
    };
  }, [
    subtotal,
    tipSelection,
    selectedTipPercent,
    customTipPercent,
    customTipAmount,
    useCustomTipAmount,
  ]);

  const deliveryTipAmount = useMemo(() => {
    if (!needsShipping || typeof deliveryTipPercent !== 'number' || deliveryTipPercent <= 0) {
      return 0;
    }
    return subtotal * (deliveryTipPercent / 100);
  }, [deliveryTipPercent, needsShipping, subtotal]);

  const shippingDetails =
    needsShipping && contactPhone.trim().length >= 10
      ? {
          address: shippingForm,
          addressId: selectedAddressId,
          contactPhone,
          saveContactPhone: saveNewPhone && !useSavedPhone,
          isWhatsapp,
          deliveryTip:
            deliveryTipAmount > 0
              ? {
                  amount: Math.round(deliveryTipAmount * 100) / 100,
                  percent: deliveryTipPercent,
                }
              : null,
        }
      : null;

  const totalWithTip = subtotal + tipAmount + deliveryTipAmount;

  const handleSaveShippingAddress = async () => {
    if (!wantsToSaveAddress) {
      return;
    }
    if (!token) {
      setAddressError('Inicia sesión para guardar direcciones.');
      return;
    }
    if (addressLimitReached) {
      setAddressToast(`Solo puedes guardar ${MAX_SAVED_ADDRESSES} direcciones.`);
      return;
    }
    if (
      shippingForm.street.trim().length < 4 ||
      shippingForm.city.trim().length < 2 ||
      shippingForm.postalCode.trim().length < 4
    ) {
      setAddressError('Completa la dirección antes de guardarla.');
      return;
    }
    if (newAddressLabel.trim().length < 3) {
      setAddressError('Agrega un nombre para identificar la dirección.');
      return;
    }
    if (contactPhone.trim().length < 10) {
      setAddressError('Agrega un teléfono válido antes de guardar la dirección.');
      return;
    }
    try {
      setIsSavingAddress(true);
      const payload: AddressInput = {
        label: newAddressLabel.trim(),
        nickname: newAddressLabel.trim(),
        type: 'shipping',
        street: shippingForm.street.trim(),
        city: shippingForm.city.trim(),
        state: shippingForm.state.trim() || undefined,
        postalCode: shippingForm.postalCode.trim(),
        country: shippingForm.country.trim() || 'México',
        reference: shippingForm.reference.trim() || undefined,
        contactPhone: contactPhone.trim(),
        isWhatsapp,
      };
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message ?? 'No pudimos guardar la dirección.');
      }
      const next = [...savedAddresses, result.data];
      setSavedAddresses(next);
      onAddressesUpdate?.(next);
      setSelectedAddressId(result.data.id ?? null);
      setNewAddressLabel('');
      setAddressToast('Dirección guardada en tu perfil.');
    } catch (error: any) {
      setAddressError(error.message ?? 'No pudimos guardar la dirección.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!items.length) {
      setFormError('Tu carrito está vacío.');
      return;
    }

    if (customerName.trim().length < 2) {
      setFormError('Indícanos tu nombre para identificar el pedido.');
      return;
    }

    if (
      needsShipping &&
      (contactPhone.trim().length < 10 ||
        shippingForm.street.trim().length < 4 ||
        shippingForm.city.trim().length < 2 ||
        shippingForm.postalCode.trim().length < 4 ||
        shippingForm.country.trim().length < 2)
    ) {
      setFormError('Completa una dirección válida y un teléfono de contacto.');
      return;
    }

    if (!token) {
      setFormError('Inicia sesión para confirmar tu pedido.');
      return;
    }

    try {
      setIsSubmitting(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/orders/web', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName: customerName.trim(),
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            category: item.category ?? null,
            size: item.size ?? null,
            packageItems: item.packageItems ?? null,
          })),
          totalAmount: totalWithTip,
          totals: {
            subtotal,
            tip: tipAmount,
            deliveryTip: deliveryTipAmount,
            total: totalWithTip,
          },
          tipAmount,
          tipPercent: appliedPercent,
          deliveryTip:
            deliveryTipAmount > 0
              ? {
                  amount: Math.round(deliveryTipAmount * 100) / 100,
                  percent: deliveryTipPercent,
                }
              : null,
          notes: orderNotes,
          needsShipping,
          shipping: shippingDetails ?? null,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'No pudimos confirmar tu pedido');
      }

      const ticketCode =
        payload?.data?.orderNumber ?? payload?.data?.ticketCode ?? payload?.data?.id ?? '---';
      enqueuePendingSnackbar({
        message: `Pedido ${ticketCode} creado correctamente.`,
        tone: 'ticket',
      });
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
      <div className="space-y-3 rounded-lg border border-primary-100 bg-white p-4 text-sm dark:border-primary-700 dark:bg-primary-900/10">
        <div>
          <label
            htmlFor={`${idPrefix}-customer-name`}
            className="block text-xs font-semibold uppercase tracking-wide text-primary-900 dark:text-primary-100"
          >
            Nombre para el pedido
          </label>
          <input
            id={`${idPrefix}-customer-name`}
            type="text"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Ingresa tu nombre"
            className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            Este nombre aparece en el ticket y en la barra.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-primary-900 dark:text-primary-100">Propina (opcional)</p>
          <span className="text-xs text-gray-500 dark:text-gray-300">
            Propina aplicada:{' '}
            {tipAmount > 0 ? (
              <>
                <span className="font-semibold text-primary-700 dark:text-primary-200">
                  {formatCurrency(tipAmount)}
                </span>
                {typeof appliedPercent === 'number' && ` (${appliedPercent.toFixed(1)}%)`}
              </>
            ) : (
              <span className="font-semibold text-gray-500 dark:text-gray-300">Sin propina</span>
            )}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2 text-xs">
          {TIP_PRESETS.map((percent) => {
            const isActive = tipSelection === 'preset' && selectedTipPercent === percent;
            return (
              <button
                type="button"
                key={percent}
                onClick={() => {
                  if (isActive) {
                    setTipSelection(null);
                    setSelectedTipPercent(null);
                  } else {
                    setTipSelection('preset');
                    setSelectedTipPercent(percent);
                  }
                  setCustomTipPercent('');
                  setCustomTipAmount('');
                  setUseCustomTipAmount(false);
                }}
                className={clsx(
                  'rounded-2xl border px-2 py-1 font-semibold transition',
                  isActive
                    ? 'border-primary-500 bg-primary-100 text-primary-700'
                    : 'border-primary-100 text-primary-700 hover:border-primary-200 dark:border-primary-700 dark:text-primary-100'
                )}
              >
                {percent}%
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              if (tipSelection === 'custom') {
                setTipSelection(null);
                setUseCustomTipAmount(false);
                setCustomTipPercent('');
                setCustomTipAmount('');
              } else {
                setTipSelection('custom');
                setSelectedTipPercent(null);
              }
            }}
            className={clsx(
              'rounded-2xl border px-2 py-1 font-semibold transition',
              tipSelection === 'custom'
                ? 'border-primary-500 bg-primary-100 text-primary-700'
                : 'border-primary-100 text-primary-700 hover:border-primary-200 dark:border-primary-700 dark:text-primary-100'
            )}
          >
            Otro
          </button>
        </div>
        {tipSelection === 'custom' && (
          <div className="space-y-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-primary-900 dark:text-primary-100">
              <input
                type="checkbox"
                checked={useCustomTipAmount}
                onChange={(event) => {
                  setUseCustomTipAmount(event.target.checked);
                  setCustomTipPercent('');
                  setCustomTipAmount('');
                }}
                className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
              />
              Capturar propina como monto fijo
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs uppercase tracking-wide text-primary-800 dark:text-primary-100">
                Porcentaje
                <input
                  type="number"
                  value={customTipPercent}
                  onChange={(event) => setCustomTipPercent(event.target.value)}
                  min="0"
                  step="0.5"
                  disabled={useCustomTipAmount}
                  className="w-full rounded-md border border-primary-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                  placeholder="0%"
                />
              </label>
              <label className="space-y-1 text-xs uppercase tracking-wide text-primary-800 dark:text-primary-100">
                Monto MXN
                <input
                  type="number"
                  value={customTipAmount}
                  onChange={(event) => setCustomTipAmount(event.target.value)}
                  min="0"
                  step="0.5"
                  disabled={!useCustomTipAmount}
                  className="w-full rounded-md border border-primary-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                  placeholder="$0.00"
                />
              </label>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-300">
          Gracias por reconocer al equipo. Tu propina se suma al fondo del mes y se distribuye entre
          baristas y gerentes.
        </p>
      </div>

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
        <div className="space-y-5 rounded-lg border border-primary-100 bg-primary-50 p-4 dark:border-primary-700/40 dark:bg-primary-900/20">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            Las entregas solo están disponibles dentro de un radio máximo de{' '}
            {MAX_DELIVERY_RADIUS_KM} km desde nuestra sucursal. Si tu dirección se encuentra fuera
            de esta zona, te contactaremos para ofrecer opciones alternativas.
          </p>
          {addressToast && (
            <div className="rounded-full bg-primary-600/10 px-4 py-2 text-xs font-semibold text-primary-800 dark:bg-primary-900/40 dark:text-primary-100">
              {addressToast}
            </div>
          )}
          {addressError && (
            <div className="rounded-full bg-red-100 px-4 py-2 text-xs font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-100">
              {addressError}
            </div>
          )}
          <div className="space-y-3 rounded-2xl border border-primary-200 bg-white/70 p-4 text-sm shadow-sm dark:border-primary-700 dark:bg-gray-900">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-primary-700 dark:text-primary-200">
              <span>Mis direcciones</span>
              <span>
                {savedAddresses.length}/{MAX_SAVED_ADDRESSES}
              </span>
            </div>
            {isAddressListLoading ? (
              <p className="text-xs text-primary-700 dark:text-primary-200">Sincronizando...</p>
            ) : savedAddresses.length > 0 ? (
              <div className="space-y-2">
                {savedAddresses.map((address) => (
                  <label
                    key={address.id ?? address.label}
                    className={clsx(
                      'flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition dark:bg-gray-950',
                      selectedAddressId === address.id
                        ? 'border-primary-500 bg-white shadow dark:border-primary-500'
                        : 'border-primary-100 bg-white/60 hover:border-primary-200 dark:border-primary-700'
                    )}
                  >
                    <input
                      type="radio"
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id ?? null)}
                      className="mt-1 h-4 w-4 rounded-full border-primary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                        {address.label}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {address.street}, {address.city},{' '}
                        {address.state ? `${address.state}, ` : ''}
                        {address.country} · CP {address.postalCode}
                      </p>
                      {address.reference && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Referencias: {address.reference}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-primary-100 px-4 py-3 text-xs text-gray-600 dark:border-primary-800 dark:text-gray-300">
                Aún no guardas direcciones. Marca la opción de guardar para registrar la dirección
                actual y reutilizarla en próximos pedidos.
              </p>
            )}
          </div>
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
                  htmlFor={fieldIds.shippingCountry}
                  className="block text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200"
                >
                  País
                </label>
                <input
                  id={fieldIds.shippingCountry}
                  type="text"
                  value={shippingForm.country}
                  onChange={(event) =>
                    setShippingForm((prev) => ({ ...prev, country: event.target.value }))
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

          <div className="rounded-2xl border border-primary-200/80 bg-white/80 p-3 dark:border-primary-800/60 dark:bg-primary-950/20">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-primary-900 dark:text-primary-100">
              <span>Propina de entrega</span>
              <span className="tracking-normal text-[11px] text-gray-500 dark:text-gray-300">
                {formatCurrency(deliveryTipAmount)}
              </span>
            </div>
            <p className="mt-1 text-xs text-primary-800 dark:text-primary-200">
              Opcional. Reconoce al repartidor usando los mismos porcentajes sugeridos.
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
              {TIP_PRESETS.map((percent) => {
                const isActive = deliveryTipPercent === percent;
                return (
                  <button
                    key={`delivery-tip-${percent}`}
                    type="button"
                    onClick={() => setDeliveryTipPercent(isActive ? null : percent)}
                    className={clsx(
                      'rounded-2xl border px-2 py-1 font-semibold transition',
                      isActive
                        ? 'border-primary-500 bg-primary-100 text-primary-700'
                        : 'border-primary-100 text-primary-700 hover:border-primary-200 dark:border-primary-700 dark:text-primary-100'
                    )}
                  >
                    {percent}%
                  </button>
                );
              })}
            </div>
            {deliveryTipPercent && (
              <button
                type="button"
                onClick={() => setDeliveryTipPercent(null)}
                className="mt-2 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-200"
              >
                Quitar propina de reparto
              </button>
            )}
          </div>

          {!addressLimitReached ? (
            <div className="rounded-2xl border border-dashed border-primary-300 bg-white/70 p-4 text-sm shadow dark:border-primary-700 dark:bg-gray-950">
              <label className="flex items-center gap-2 text-sm font-semibold text-primary-900 dark:text-primary-100">
                <input
                  type="checkbox"
                  checked={wantsToSaveAddress}
                  onChange={(event) => {
                    setWantsToSaveAddress(event.target.checked);
                    if (!event.target.checked) {
                      setNewAddressLabel('');
                    }
                  }}
                  className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                />
                Guardar esta dirección para pedidos futuros
              </label>
              {wantsToSaveAddress && (
                <>
                  <p className="mt-1 text-xs text-primary-700 dark:text-primary-200">
                    Asigna un nombre para reconocerla rápidamente (ej. Casa, Oficina).
                  </p>
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={newAddressLabel}
                      onChange={(event) => setNewAddressLabel(event.target.value)}
                      placeholder="Nombre de la dirección"
                      className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSaveShippingAddress()}
                      disabled={isSavingAddress || newAddressLabel.trim().length < 3}
                      className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingAddress ? 'Guardando...' : 'Guardar dirección'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              Alcanzaste el límite de {MAX_SAVED_ADDRESSES} direcciones. Elimina alguna en tu perfil
              para capturar nuevas.
            </div>
          )}

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
        <div className="mt-2 flex items-center justify-between text-gray-600 dark:text-gray-200">
          <span>Propina</span>
          <span className="font-semibold">{formatCurrency(tipAmount)}</span>
        </div>
        {deliveryTipAmount > 0 && (
          <div className="mt-2 flex items-center justify-between text-gray-600 dark:text-gray-200">
            <span>Propina de entrega</span>
            <span className="font-semibold">{formatCurrency(deliveryTipAmount)}</span>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-base font-semibold text-primary-900 dark:text-primary-100">
          <span>Total estimado</span>
          <span>{formatCurrency(totalWithTip)}</span>
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
