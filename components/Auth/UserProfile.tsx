'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { useAuth } from './AuthProvider';
import ClientActionsFlipCard from '@/components/ClientActionsFlipCard';
import ShareExperienceForm from '@/components/Feedback/ShareExperienceForm';
import {
  updateProfileSchema,
  updateConsentSchema,
  changePasswordSchema,
  type UpdateProfileInput,
  type UpdateConsentInput,
  type ChangePasswordInput,
} from '@/lib/validations/auth';

export default function UserProfile() {
  const { user, token, updateUser } = useAuth();
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

  if (!user) return null;

  const isGoogleOnly = user.authProvider === 'google';

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-0">
      {message && (
        <div
          className={`mb-6 rounded-md p-4 ${
            message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        {/* 1. Perfil */}
        <div className="order-1 lg:order-1 lg:col-start-1 lg:row-start-1 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
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

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Cuenta creada
                </p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(user.createdAt ?? Date.now()).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-2 rounded-3xl bg-primary-50 px-4 py-3 text-sm text-primary-900 shadow-sm dark:bg-primary-900/30 dark:text-primary-100">
            <span>¿Necesitas ayuda? Mándanos un</span>
            <a
              href={siteMetadata.whats}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary-500 shadow dark:bg-[#0f1728]"
              aria-label="WhatsApp"
            >
              <FaWhatsapp />
            </a>
            <span>y con todo gusto te ayudamos.</span>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-700">
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              Seguridad de la cuenta
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Actualiza tu contraseña para mantener tu cuenta protegida.
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
                    <p className="mt-1 text-sm text-red-600">
                      {passwordErrors.currentPassword.message}
                    </p>
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
                    <p className="mt-1 text-sm text-red-600">
                      {passwordErrors.newPassword.message}
                    </p>
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
                    <p className="mt-1 text-sm text-red-600">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Debe contener al menos 8 caracteres, incluir mayúsculas, minúsculas, un número y
                  un caracter especial.
                </p>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isChangingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 2. Mis favoritos */}
        <div className="order-2 lg:order-2 lg:col-start-1 lg:row-start-2 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <FavoritesSelect />
        </div>

        {/* 3. Mi QR de cliente, 4. Tarjeta de lealtad, 5. Consumo */}
        <div className="order-3 flex flex-col gap-6 lg:order-2 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24">
          {loyaltyReminderAlert && (
            <div
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                loyaltyReminderAlert.type === 'success'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100'
              }`}
            >
              {loyaltyReminderAlert.message}
            </div>
          )}
          {loyaltyReminder.showReminder && (
            <LoyaltyReminderCard
              onActivate={handleActivateLoyaltyReminder}
              isLoading={loyaltyReminder.isActivating}
              className="w-full"
            />
          )}
          <ClientActionsFlipCard />
          <UserQrCard />
          <LoyaltyFlipCard className="w-full" />
          <ConsumptionChart />
        </div>

        {/* 6. Déjanos tus comentarios */}
        <div className="order-4 lg:order-3 lg:col-start-1 lg:row-start-3 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            Déjanos tus comentarios
          </h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Tu opinión nos ayuda a mejorar. Comparte sugerencias o cualquier detalle sobre tu
            experiencia en Xoco Café.
          </p>
          <ShareExperienceForm />
        </div>

        {/* 7. Preferencias de marketing */}
        <div className="order-5 lg:order-4 lg:col-start-1 lg:row-start-4 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
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
        </div>

        {/* 8. Gestión de datos (GDPR) */}
        <div className="order-6 lg:order-5 lg:col-start-1 lg:row-start-5 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
            Gestión de Datos (GDPR)
          </h3>

          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Exportar mis datos
              </h4>
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

            <div className="border-t pt-4">
              <h4 className="mb-2 text-sm font-medium text-red-700 dark:text-red-400">
                Eliminar mi cuenta
              </h4>
              <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                Esta acción eliminará permanentemente tu cuenta y todos tus datos. No se puede
                deshacer.
              </p>
              <button
                onClick={deleteAccount}
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Eliminar Cuenta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
