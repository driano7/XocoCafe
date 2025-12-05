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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_SAVED_ADDRESSES } from '@/lib/address-constants';
import type { AddressInput } from '@/lib/validations/auth';
import { useAuth } from './AuthProvider';

const EMPTY_FORM: AddressInput = {
  label: '',
  nickname: '',
  type: 'shipping',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'México',
  reference: '',
  additionalInfo: '',
  isDefault: false,
  contactPhone: '',
  isWhatsapp: false,
};

const formatAddressLine = (address: AddressInput) => {
  const parts = [
    address.street,
    address.city,
    address.state,
    address.country,
    address.postalCode ? `CP ${address.postalCode}` : null,
  ].filter(Boolean);
  return parts.join(', ');
};

interface AddressManagerProps {
  showIntro?: boolean;
}

export default function AddressManager({ showIntro = true }: AddressManagerProps) {
  const { token, user, updateUser } = useAuth();
  const [addresses, setAddresses] = useState<AddressInput[]>(user?.addresses ?? []);
  const [form, setForm] = useState<AddressInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [useSavedPhone, setUseSavedPhone] = useState<boolean>(Boolean(user?.phone));
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const userRef = useRef(user);

  const syncAddresses = useCallback(
    (next: AddressInput[]) => {
      setAddresses(next);
      const currentUser = userRef.current;
      if (currentUser) {
        updateUser({ ...currentUser, addresses: next });
      }
    },
    [updateUser]
  );

  useEffect(() => {
    setAddresses(user?.addresses ?? []);
  }, [user?.addresses]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (useSavedPhone && user?.phone) {
      setForm((prev) => ({
        ...prev,
        contactPhone: user.phone ?? '',
      }));
    }
  }, [useSavedPhone, user?.phone]);

  const showCreationForm = useMemo(
    () => editingId !== null || addresses.length < MAX_SAVED_ADDRESSES,
    [addresses.length, editingId]
  );

  const loadAddresses = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const response = await fetch('/api/addresses', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        syncAddresses(result.data ?? []);
      } else {
        setAlert({
          type: 'error',
          message: result.message ?? 'No pudimos cargar tus direcciones.',
        });
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Error al sincronizar tus direcciones. Intenta nuevamente.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [syncAddresses, token]);

  useEffect(() => {
    hasFetchedRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!token || hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;
    void loadAddresses();
  }, [loadAddresses, token]);

  useEffect(() => {
    if (!alert) {
      return undefined;
    }
    const timeout = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(timeout);
  }, [alert]);

  const resetForm = useCallback(() => {
    setForm(() => ({
      ...EMPTY_FORM,
      contactPhone: user?.phone ?? '',
      isWhatsapp: false,
    }));
    setUseSavedPhone(Boolean(user?.phone));
    setEditingId(null);
  }, [user?.phone]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const handleEdit = (address: AddressInput) => {
    setEditingId(address.id ?? null);
    setForm({
      ...address,
      label: address.label ?? '',
      nickname: address.nickname ?? '',
      state: address.state ?? '',
      reference: address.reference ?? '',
      additionalInfo: address.additionalInfo ?? '',
      country: address.country ?? 'México',
      isDefault: address.isDefault ?? false,
      contactPhone: address.contactPhone ?? user?.phone ?? '',
      isWhatsapp: address.isWhatsapp ?? false,
    });
    setUseSavedPhone(Boolean(user?.phone) && address.contactPhone === user?.phone);
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id || !token) return;
    if (!confirm('¿Eliminar esta dirección guardada?')) {
      return;
    }
    try {
      setDeletingId(id);
      const response = await fetch(`/api/addresses?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        const filtered = addresses.filter((address) => address.id !== id);
        syncAddresses(filtered);
        setAlert({ type: 'success', message: 'Dirección eliminada.' });
        if (editingId === id) {
          resetForm();
        }
      } else {
        setAlert({
          type: 'error',
          message: result.message ?? 'No pudimos eliminar la dirección.',
        });
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Error eliminando la dirección. Intenta más tarde.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    if (!form.label || !form.street || !form.city || !form.postalCode || !form.country) {
      setAlert({
        type: 'error',
        message: 'Completa los campos obligatorios para guardar la dirección.',
      });
      return;
    }
    if ((form.contactPhone ?? '').trim().length < 10) {
      setAlert({
        type: 'error',
        message: 'Agrega un teléfono de contacto de al menos 10 dígitos.',
      });
      return;
    }
    if (!editingId && addresses.length >= MAX_SAVED_ADDRESSES) {
      setAlert({
        type: 'error',
        message: `Solo puedes almacenar ${MAX_SAVED_ADDRESSES} direcciones.`,
      });
      return;
    }

    try {
      setIsSaving(true);
      const payload: AddressInput = {
        ...form,
        label: form.label.trim(),
        nickname: form.nickname?.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state?.trim(),
        country: form.country?.trim() || 'México',
        postalCode: form.postalCode.trim(),
        reference: form.reference?.trim(),
        additionalInfo: form.additionalInfo?.trim(),
        isDefault: form.isDefault ?? false,
        id: editingId ?? undefined,
        contactPhone: form.contactPhone.trim(),
        isWhatsapp: form.isWhatsapp ?? false,
      };
      const response = await fetch('/api/addresses', {
        method: editingId ? 'PUT' : 'POST',
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
      const updated = editingId
        ? addresses.map((addr) => (addr.id === editingId ? result.data : addr))
        : [...addresses, result.data];
      syncAddresses(updated);
      setAlert({
        type: 'success',
        message: editingId ? 'Dirección actualizada.' : 'Dirección guardada.',
      });
      resetForm();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'No pudimos guardar la dirección.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      {showIntro && (
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Direcciones</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestiona hasta {MAX_SAVED_ADDRESSES} domicilios y asígnales un nombre para
            identificarlos al programar pedidos.
          </p>
        </div>
      )}

      {alert && (
        <div
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            alert.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100'
          }`}
        >
          {alert.message}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Mis domicilios guardados</span>
          <span>
            {addresses.length}/{MAX_SAVED_ADDRESSES}
          </span>
        </div>
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
            Cargando direcciones...
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
            <p className="font-semibold text-gray-700 dark:text-gray-200">Tu lista está vacía.</p>
            <p className="text-sm">
              Guarda tu primer domicilio para tenerlo disponible al crear pedidos.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {addresses.map((address) => (
              <li
                key={address.id ?? address.label}
                className="rounded-2xl border border-gray-200 p-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {address.label}
                    </p>
                    <p className="text-xs uppercase tracking-[0.3em] text-primary-600 dark:text-primary-200">
                      {address.type === 'billing' ? 'Facturación' : 'Envío'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(address)}
                      className="rounded-full border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-200"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(address.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-200"
                      disabled={deletingId === address.id}
                    >
                      {deletingId === address.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  {formatAddressLine(address)}
                </p>
                {address.reference && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Referencias: {address.reference}
                  </p>
                )}
                {address.contactPhone && (
                  <p className="text-xs text-gray-500 dark:text-gray-300">
                    Teléfono: {address.contactPhone} {address.isWhatsapp ? '(WhatsApp)' : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-4 text-sm dark:border-primary-800/40 dark:bg-primary-900/30">
        {showCreationForm ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-primary-900 dark:text-primary-100">
                {editingId ? 'Editar dirección' : 'Nueva dirección'}
              </p>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-200"
                >
                  Cancelar edición
                </button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
                Nombre / alias
                <input
                  type="text"
                  value={form.label}
                  onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                  placeholder="Casa, Oficina, etc."
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
                Tipo
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      type: event.target.value as AddressInput['type'],
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                >
                  <option value="shipping">Envío</option>
                  <option value="billing">Facturación</option>
                </select>
              </label>
            </div>
            <label className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
              Calle y número
              <input
                type="text"
                value={form.street}
                onChange={(event) => setForm((prev) => ({ ...prev, street: event.target.value }))}
                className="mt-1 w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                placeholder="Ej. Monterrey 215"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
                Ciudad
                <input
                  type="text"
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
                Estado
                <input
                  type="text"
                  value={form.state ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                />
              </label>
            </div>
            <div className="space-y-2 rounded-xl border border-primary-200 bg-white/80 p-3 text-sm shadow-sm dark:border-primary-700/60 dark:bg-primary-950">
              {user?.phone && (
                <label className="flex items-center gap-2 text-primary-800 dark:text-primary-100">
                  <input
                    type="checkbox"
                    checked={useSavedPhone}
                    onChange={(event) => setUseSavedPhone(event.target.checked)}
                    className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                  />
                  Usar mi teléfono guardado ({user.phone})
                </label>
              )}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
                  Teléfono de contacto
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, contactPhone: event.target.value }))
                    }
                    disabled={useSavedPhone && Boolean(user?.phone)}
                    placeholder="10 dígitos"
                    className="mt-1 w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-primary-800 dark:text-primary-100">
                <input
                  type="checkbox"
                  checked={form.isWhatsapp ?? false}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isWhatsapp: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                />
                Este número es de WhatsApp
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
                País
                <input
                  type="text"
                  value={form.country}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, country: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
                Código postal
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, postalCode: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
                Referencias
                <input
                  type="text"
                  value={form.reference ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, reference: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                  placeholder="Color de fachada, nivel, etc."
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
                Indicaciones internas
                <input
                  type="text"
                  value={form.additionalInfo ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, additionalInfo: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-700 dark:bg-primary-900 dark:text-white"
                  placeholder="Ej. sube por elevador, marca al llegar, etc."
                />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-900 dark:text-primary-200">
                <input
                  type="checkbox"
                  checked={form.isDefault ?? false}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isDefault: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                />
                Usar como dirección principal
              </label>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar dirección'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-primary-900 dark:text-primary-200">
            Alcanzaste el límite de {MAX_SAVED_ADDRESSES} direcciones. Elimina alguna para agregar
            una nueva.
          </p>
        )}
      </div>
    </section>
  );
}
