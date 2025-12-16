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

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FaWhatsapp } from 'react-icons/fa';
import siteMetadata from 'content/siteMetadata';
import LoyaltyFlipCard from '@/components/LoyaltyFlipCard';
import UserQrCard from '@/components/Auth/UserQrCard';
import FavoritesSelect from '@/components/FavoritesSelect';
import ConsumptionChart from '@/components/ConsumptionChart';
import LoyaltyReminderCard from '@/components/LoyaltyReminderCard';
import { useLoyaltyReminder } from '@/hooks/useLoyaltyReminder';
import SessionTimeoutNotice from '@/components/SessionTimeoutNotice';
import AddressManager from '@/components/Auth/AddressManager';
import { useAuth } from './AuthProvider';
import ShareExperienceForm from '@/components/Feedback/ShareExperienceForm';
import {
  updateProfileSchema,
  updateConsentSchema,
  changePasswordSchema,
  type UpdateProfileInput,
  type UpdateConsentInput,
  type ChangePasswordInput,
} from '@/lib/validations/auth';
import { resolveFavoriteLabel } from '@/lib/menuFavorites';

export default function UserProfile() {
  const { user, token, updateUser, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordAlert, setPasswordAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const loyaltyReminder = useLoyaltyReminder({
    userId: user?.id,
    enrolled: user?.loyaltyEnrolled ?? false,
    token,
  });
  const [loyaltyReminderAlert, setLoyaltyReminderAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      city: user?.city || '',
      country: user?.country || '',
      walletAddress: user?.walletAddress || '',
    },
  });

  const { register: registerConsent, reset: resetConsent } = useForm<UpdateConsentInput>({
    resolver: zodResolver(updateConsentSchema),
    defaultValues: {
      marketingEmail: user?.marketingEmail || false,
      marketingSms: user?.marketingSms || false,
      marketingPush: user?.marketingPush || false,
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const prefillProfileForm = useCallback(
    (targetUser: typeof user | null | undefined) => {
      if (!targetUser) return;
      resetProfile({
        firstName: targetUser.firstName || '',
        lastName: targetUser.lastName || '',
        phone: targetUser.phone || '',
        city: targetUser.city || '',
        country: targetUser.country || '',
        walletAddress: targetUser.walletAddress || '',
      });
    },
    [resetProfile]
  );

  const prefillConsentForm = useCallback(
    (targetUser: typeof user | null | undefined) => {
      if (!targetUser) return;
      resetConsent({
        marketingEmail: targetUser.marketingEmail || false,
        marketingSms: targetUser.marketingSms || false,
        marketingPush: targetUser.marketingPush || false,
      });
    },
    [resetConsent]
  );

  useEffect(() => {
    if (user) {
      prefillProfileForm(user);
      prefillConsentForm(user);
    }
  }, [user, prefillProfileForm, prefillConsentForm]);

  useEffect(() => {
    if (!loyaltyReminderAlert) {
      return undefined;
    }
    const timeout = setTimeout(() => setLoyaltyReminderAlert(null), 4000);
    return () => clearTimeout(timeout);
  }, [loyaltyReminderAlert]);

  const handleActivateLoyaltyReminder = useCallback(async () => {
    const result = await loyaltyReminder.activate();
    setLoyaltyReminderAlert({
      type: result.success ? 'success' : 'error',
      message:
        result.message ??
        (result.success
          ? 'Activamos tu programa de lealtad. Ya puedes acumular sellos.'
          : 'No pudimos activar tu programa de lealtad. Intenta más tarde.'),
    });
  }, [loyaltyReminder]);

  const onUpdateProfile = async (data: UpdateProfileInput) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        updateUser(result.user);
        prefillProfileForm(result.user);
        setIsEditing(false);
        setMessage('Perfil actualizado exitosamente');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage('Error actualizando perfil');
    }
  };

  const onChangePassword = async (data: ChangePasswordInput) => {
    if (!token) {
      setPasswordAlert({
        type: 'error',
        message: 'No se pudo validar tu sesión. Inicia sesión nuevamente.',
      });
      return;
    }

    setIsChangingPassword(true);
    setPasswordAlert(null);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        setPasswordAlert({
          type: 'success',
          message: result.message || 'Contraseña actualizada correctamente.',
        });
        resetPassword({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setIsPasswordModalOpen(false);
      } else {
        setPasswordAlert({
          type: 'error',
          message: result.message || 'No pudimos actualizar tu contraseña. Intenta de nuevo.',
        });
      }
    } catch (error) {
      setPasswordAlert({
        type: 'error',
        message: 'Error actualizando tu contraseña. Intenta más tarde.',
      });
    } finally {
      setIsChangingPassword(false);
      setTimeout(() => setPasswordAlert(null), 6000);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/auth/export-data', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        const rows: string[][] = [];
        const addRow = (key: string, value: unknown) => {
          const normalized =
            value === null || value === undefined
              ? ''
              : typeof value === 'object'
              ? JSON.stringify(value)
              : String(value);
          rows.push([key, normalized]);
        };

        const { data } = result;
        const { addresses, orders, loyaltyPoints, ...userData } = data;

        Object.entries(userData ?? {}).forEach(([key, value]) => addRow(`usuario.${key}`, value));
        addRow('direcciones', addresses ?? []);
        addRow('ordenes', orders ?? []);
        addRow('lealtad', loyaltyPoints ?? []);

        const csvContent = rows
          .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n');

        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `datos-usuario-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setMessage('Datos exportados exitosamente');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage('Error exportando datos');
    }
  };

  const deleteAccount = async () => {
    if (
      !confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')
    ) {
      return;
    }

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        // El logout se manejará automáticamente
        window.location.href = '/';
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage('Error eliminando cuenta');
    }
  };

  const handleClosePasswordModal = useCallback(() => {
    resetPassword({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setIsPasswordModalOpen(false);
  }, [resetPassword]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-gray-700 dark:text-gray-200">
        Cargando tu perfil...
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <SessionTimeoutNotice context="profile" />
        <a
          href="/login"
          className="mt-6 inline-flex min-w-[280px] items-center justify-center rounded-full bg-primary-600 px-10 py-5 text-2xl font-black uppercase tracking-[0.35em] text-white shadow-2xl transition hover:bg-primary-700"
        >
          Iniciar sesión
        </a>
      </div>
    );
  }

  const isGoogleOnly = user.authProvider === 'google';
  const sectionCardClass =
    'flex w-full flex-col gap-4 rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur-lg dark:border-white/5 dark:bg-gray-900/70';
  const favoriteBeverageLabel =
    resolveFavoriteLabel(user.favoriteColdDrink ?? user.favoriteHotDrink) ?? 'No registrado';
  const favoriteFoodLabel = resolveFavoriteLabel(user.favoriteFood) ?? 'No registrado';
  const loyaltyStamps = Math.max(0, Math.min(7, user.weeklyCoffeeCount ?? 0));

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-0">
        {message && (
          <div
            className={`mb-6 rounded-md p-4 ${
              message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}
          >
            {message}
          </div>
        )}

        <section className={sectionCardClass}>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Perfil</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mantén tu información personal y de contacto al día.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isEditing) {
                  prefillProfileForm(user);
                }
                setIsEditing(!isEditing);
              }}
              className="self-start rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 sm:self-auto"
            >
              {isEditing ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-firstName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Nombre
                  </label>
                  <input
                    {...registerProfile('firstName')}
                    id="profile-firstName"
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  {profileErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="profile-lastName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Apellido
                  </label>
                  <input
                    {...registerProfile('lastName')}
                    id="profile-lastName"
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  {profileErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-phone"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Teléfono
                </label>
                <input
                  {...registerProfile('phone')}
                  type="tel"
                  id="profile-phone"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                {profileErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">{profileErrors.phone.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-city"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Ciudad
                  </label>
                  <input
                    {...registerProfile('city')}
                    id="profile-city"
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  {profileErrors.city && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.city.message}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="profile-country"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    País
                  </label>
                  <input
                    {...registerProfile('country')}
                    id="profile-country"
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  {profileErrors.country && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.country.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-wallet"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Wallet EVM
                </label>
                <input
                  {...registerProfile('walletAddress')}
                  id="profile-wallet"
                  type="text"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="0x..."
                />
                {profileErrors.walletAddress && (
                  <p className="mt-1 text-sm text-red-600">{profileErrors.walletAddress.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    prefillProfileForm(user);
                    setIsEditing(false);
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ID Cliente</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{user.clientId}</p>
                </div>
              </div>

              {(user.firstName || user.lastName || user.phone) && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nombre</p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                    </p>
                  </div>
                  {user.phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Teléfono
                      </p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{user.phone}</p>
                    </div>
                  )}
                </div>
              )}

              {(user.city || user.country) && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ubicación</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {user.city && user.country
                      ? `${user.city}, ${user.country}`
                      : user.city || user.country || '—'}
                  </p>
                </div>
              )}

              {user.walletAddress && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Wallet EVM</p>
                  <p className="mt-1 text-sm break-all text-gray-900 dark:text-white">
                    {user.walletAddress}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-2 rounded-3xl bg-primary-600 px-4 py-3 text-sm text-white shadow-lg dark:bg-primary-900/30 dark:text-primary-100">
            <span>¿Necesitas ayuda? Mándanos un</span>
            <a
              href={siteMetadata.whats}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white shadow transition-colors hover:bg-white/30 dark:bg-[#0f1728]"
              aria-label="WhatsApp"
            >
              <FaWhatsapp />
            </a>
            <span>y con todo gusto te ayudamos.</span>
          </div>
        </section>

        <UserQrCard className={sectionCardClass} />

        <section className={sectionCardClass}>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Programa de lealtad
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Consulta tu progreso y activa recordatorios para no perder sellos.
            </p>
          </div>
          <div className="mt-4 w-full rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-100">
            <p className="font-semibold text-gray-900 dark:text-white">
              Sellos acumulados:{' '}
              <span className="font-normal text-gray-600 dark:text-gray-300">
                {loyaltyStamps} / 7
              </span>
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {loyaltyStamps >= 7
                ? 'Ya puedes canjear tu bebida gratis mostrando tu QR.'
                : `Te faltan ${Math.max(0, 7 - loyaltyStamps)} sellos para tu bebida gratis.`}
            </p>
          </div>

          {loyaltyReminderAlert && (
            <div
              className={`mt-4 rounded-full px-4 py-2 text-sm font-semibold ${
                loyaltyReminderAlert.type === 'success'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100'
              }`}
            >
              {loyaltyReminderAlert.message}
            </div>
          )}

          {loyaltyReminder.showReminder && (
            <div className="mt-4">
              <LoyaltyReminderCard
                onActivate={handleActivateLoyaltyReminder}
                isLoading={loyaltyReminder.isActivating}
                className="w-full"
              />
            </div>
          )}
          <LoyaltyFlipCard className="mt-6 w-full" />
        </section>

        <section className={sectionCardClass}>
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Mis favoritos</h3>
          <div className="mb-4 w-full rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-100">
            <p className="font-semibold text-gray-900 dark:text-white">
              Tu bebida favorita:{' '}
              <span className="font-normal text-gray-600 dark:text-gray-300">
                {favoriteBeverageLabel}
              </span>
            </p>
            <p className="font-semibold text-gray-900 dark:text-white">
              Tu alimento favorito:{' '}
              <span className="font-normal text-gray-600 dark:text-gray-300">
                {favoriteFoodLabel}
              </span>
            </p>
          </div>
          <FavoritesSelect />
        </section>

        <section className={sectionCardClass}>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Consumo de favoritos
          </h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Visualiza tu consumo histórico y mantente al tanto de tus hábitos en Xoco Café.
          </p>
          <ConsumptionChart />
          <div className="mt-8 border-t border-white/20 pt-6">
            <h4 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
              Mis comentarios
            </h4>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Tu opinión nos ayuda a mejorar. Comparte sugerencias o cualquier detalle de tu
              experiencia.
            </p>
            <ShareExperienceForm />
          </div>
        </section>

        <section className={sectionCardClass}>
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            Mis direcciones
          </h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Administra tus domicilios guardados y asígnales un nombre para pedir más rápido.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Puedes guardar hasta 3 direcciones activas.
            </p>
            <button
              type="button"
              onClick={() => setIsAddressModalOpen(true)}
              className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Administrar direcciones
            </button>
          </div>
        </section>

        <section className={sectionCardClass}>
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            Seguridad de la cuenta
          </h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Mantén tu contraseña al día para proteger tus pedidos y recompensas.
          </p>
          {passwordAlert && (
            <div
              className={`mb-4 rounded-md px-4 py-3 text-sm ${
                passwordAlert.type === 'success'
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200'
              }`}
            >
              {passwordAlert.message}
            </div>
          )}
          {isGoogleOnly ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              Esta cuenta se administra con Google. Usa &ldquo;Continuar con Google&rdquo; para
              gestionar tu acceso.
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Usa una contraseña segura con mayúsculas, minúsculas y caracteres especiales.
              </p>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Actualizar contraseña
              </button>
            </div>
          )}
        </section>

        <section className={sectionCardClass}>
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
            Preferencias de Marketing
          </h3>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                {...registerConsent('marketingEmail')}
                type="checkbox"
                id="marketingEmail"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled
              />
              <label
                htmlFor="marketingEmail"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Recibir ofertas por email
              </label>
            </div>

            <div className="flex items-center">
              <input
                {...registerConsent('marketingSms')}
                type="checkbox"
                id="marketingSms"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled
              />
              <label
                htmlFor="marketingSms"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Recibir ofertas por SMS
              </label>
            </div>

            <div className="flex items-center">
              <input
                {...registerConsent('marketingPush')}
                type="checkbox"
                id="marketingPush"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled
              />
              <label
                htmlFor="marketingPush"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Recibir notificaciones push
              </label>
            </div>
          </div>
        </section>

        <section className={sectionCardClass}>
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
            Gestión de Datos (GDPR)
          </h3>

          <div>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Descarga una copia de todos tus datos personales en formato CSV.
            </p>
            <button
              onClick={exportData}
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Exportar Datos
            </button>
          </div>
        </section>

        <section
          className={`${sectionCardClass} border-red-200/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-900/40`}
        >
          <h3 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
            Eliminar cuenta
          </h3>
          <p className="mb-4 text-sm text-red-900/80 dark:text-red-100/80">
            Esta acción eliminará permanentemente tu cuenta y todos tus datos. No se puede deshacer.
          </p>
          <button
            onClick={deleteAccount}
            className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Eliminar Cuenta
          </button>
        </section>
      </div>

      <ProfileModal
        open={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title="Mis direcciones"
      >
        <AddressManager showIntro={false} />
      </ProfileModal>

      <ProfileModal
        open={isPasswordModalOpen && !isGoogleOnly}
        onClose={handleClosePasswordModal}
        title="Actualizar contraseña"
      >
        <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-4">
          <div>
            <label
              htmlFor="current-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Contraseña actual
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              {...registerPassword('currentPassword')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Nueva contraseña
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...registerPassword('newPassword')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {passwordErrors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Confirmar nueva contraseña
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              {...registerPassword('confirmPassword')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {passwordErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Debe contener al menos 8 caracteres, incluir mayúsculas, minúsculas, un número y un
            caracter especial.
          </p>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isChangingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </ProfileModal>
    </>
  );
}

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

function ProfileModal({ open, onClose, title, children }: ProfileModalProps) {
  if (!open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
      role="button"
      aria-label="Cerrar modal"
      tabIndex={0}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-white/30 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-gray-900/80"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
