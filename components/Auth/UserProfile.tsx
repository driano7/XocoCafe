/* eslint-disable jsx-a11y/label-has-associated-control */
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

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FaWhatsapp } from 'react-icons/fa';
import siteMetadata from 'content/siteMetadata';
import FavoritesSelect from '@/components/FavoritesSelect';
import FavoriteItemsList from '@/components/FavoriteItemsList';
import LoyaltyProgressCard from '@/components/LoyaltyProgressCard';
import ConsumptionChart from '@/components/ConsumptionChart';
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
  type AddressInput,
} from '@/lib/validations/auth';
import { resolveFavoriteLabel } from '@/lib/menuFavorites';
import { useClientFavorites } from '@/hooks/useClientFavorites';
import { detectDeviceInfo, ensurePushPermission } from '@/lib/pushNotifications';
import { useSnackbarNotifications } from '@/hooks/useSnackbarNotifications';
import Snackbar from '@/components/Feedback/Snackbar';
import { useLoyalty } from '@/hooks/useLoyalty';
import { useLanguage } from '@/components/Language/LanguageProvider';
import TranslatedText from '@/components/Language/TranslatedText';

const FREE_COFFEE_NOTICE_KEY = 'xoco_free_coffee_notice';

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  walletAddress?: string | null;
  clientId?: string | null;
  weeklyCoffeeCount?: number;
  marketingEmail?: boolean;
  marketingSms?: boolean;
  marketingPush?: boolean;
  addresses?: AddressInput[];
  favoriteColdDrink?: string | null;
  favoriteHotDrink?: string | null;
  favoriteFood?: string | null;
  authProvider?: string | null;
}

export default function UserProfile({ user }: { user: User }) {
  const { token, updateUser, isLoading } = useAuth();
  const { t } = useLanguage();
  const {
    data: clientFavorites,
    isLoading: isClientFavoritesLoading,
    error: clientFavoritesError,
    refresh: refreshClientFavorites = async () => {},
  } = useClientFavorites(user?.clientId ?? null, token);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordAlert, setPasswordAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);
  const [pushPermissionInfo, setPushPermissionInfo] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState(() => detectDeviceInfo());
  const [loyaltyCoffeeCount, setLoyaltyCoffeeCount] = useState(() => user?.weeklyCoffeeCount ?? 0);
  const loyaltyPanelRef = useRef<HTMLDivElement | null>(null);
  const profileSectionRef = useRef<HTMLDivElement | null>(null);
  const addressesSectionRef = useRef<HTMLDivElement | null>(null);
  const [isExportingLoyaltyPanel, setIsExportingLoyaltyPanel] = useState(false);
  const [loyaltyPanelActionError, setLoyaltyPanelActionError] = useState<string | null>(null);
  const [isWebShareAvailable, setIsWebShareAvailable] = useState(
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  );
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbarNotifications();
  const { stats: loyaltyStats, isLoading: isLoyaltyStatsLoading } = useLoyalty();
  const scrollToAddressesSection = useCallback(() => {
    if (!addressesSectionRef.current || typeof window === 'undefined') {
      return;
    }
    const scroller = document.querySelector('[data-profile-scroll-root]') as HTMLElement | null;
    const target = addressesSectionRef.current;
    const adjustScroll = (container: HTMLElement) => {
      const containerTop = container.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      const offset = Math.max(window.innerHeight * 0.1, 64);
      container.scrollTo({
        top: container.scrollTop + (targetTop - containerTop) - offset,
        behavior: 'smooth',
      });
    };
    if (scroller) {
      adjustScroll(scroller);
    } else {
      const offset = Math.max(window.innerHeight * 0.1, 80);
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleQuickOpen = () => {
      scrollToAddressesSection();
      setIsAddressModalOpen(true);
    };
    window.addEventListener('profile-open-addresses', handleQuickOpen as EventListener);
    return () => {
      window.removeEventListener('profile-open-addresses', handleQuickOpen as EventListener);
    };
  }, [scrollToAddressesSection]);

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

  const {
    register: registerConsent,
    reset: resetConsent,
    watch: watchConsent,
    setValue: setConsentValue,
  } = useForm<UpdateConsentInput>({
    resolver: zodResolver(updateConsentSchema),
    defaultValues: {
      marketingEmail: user?.marketingEmail || false,
      marketingSms: user?.marketingSms || false,
      marketingPush: user?.marketingPush || false,
    },
  });
  const marketingEmailValue = watchConsent('marketingEmail') ?? false;
  const marketingPushValue = watchConsent('marketingPush') ?? false;

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
    setDeviceInfo(detectDeviceInfo());
  }, []);

  useEffect(() => {
    setIsWebShareAvailable(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    );
  }, [deviceInfo]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (loyaltyCoffeeCount >= 6) {
      const hasNotified = window.sessionStorage.getItem(FREE_COFFEE_NOTICE_KEY);
      if (!hasNotified) {
        window.sessionStorage.setItem(FREE_COFFEE_NOTICE_KEY, 'yes');
        showSnackbar(
          t('profile.american_courtesy') ||
            'Tu próximo café americano es cortesía. Mantente al pendiente.',
          'profile',
          {
            deviceNotification: {
              title: 'Tu siguiente café es gratis ☕️',
              body: 'Acumula un sello más para canjearlo en barra.',
            },
          }
        );
        void ensurePushPermission(deviceInfo);
      }
    } else {
      window.sessionStorage.removeItem(FREE_COFFEE_NOTICE_KEY);
    }
  }, [deviceInfo, loyaltyCoffeeCount, showSnackbar, t]);

  useEffect(() => {
    if (typeof clientFavorites?.loyalty?.weeklyCoffeeCount === 'number') {
      setLoyaltyCoffeeCount(clientFavorites.loyalty.weeklyCoffeeCount);
    }
  }, [clientFavorites?.loyalty?.weeklyCoffeeCount]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const controller = new AbortController();
    const loadCoffeeCount = async () => {
      try {
        const response = await fetch('/api/user/coffee-count', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          success?: boolean;
          data?: { weeklyCoffeeCount?: number | null };
        };
        if (payload?.success && typeof payload.data?.weeklyCoffeeCount === 'number') {
          const normalized = Math.max(0, Math.min(7, payload.data.weeklyCoffeeCount));
          setLoyaltyCoffeeCount(normalized);
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          return;
        }
        console.error('Error sincronizando progreso de cafés:', error);
      }
    };

    void loadCoffeeCount();
    return () => {
      controller.abort();
    };
  }, [token]);

  const waitForLoyaltyPanelAssets = useCallback(async () => {
    if (!loyaltyPanelRef.current) {
      return;
    }
    const images = Array.from(loyaltyPanelRef.current.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete && image.naturalWidth > 0) {
              resolve();
              return;
            }
            const handleResolve = () => {
              image.removeEventListener('load', handleResolve);
              image.removeEventListener('error', handleResolve);
              resolve();
            };
            image.addEventListener('load', handleResolve);
            image.addEventListener('error', handleResolve);
          })
      )
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
  }, []);

  const dataUrlToBlob = useCallback((dataUrl: string): Blob => {
    const [metadata, content] = dataUrl.split(',');
    const mimeMatch = metadata.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    if (typeof window === 'undefined' || typeof window.atob !== 'function') {
      throw new Error('Base64 decoder not available');
    }
    const byteString = window.atob(content);
    const length = byteString.length;
    const arrayBuffer = new ArrayBuffer(length);
    const uintArray = new Uint8Array(arrayBuffer);
    for (let index = 0; index < length; index += 1) {
      uintArray[index] = byteString.charCodeAt(index);
    }
    return new Blob([uintArray], { type: mime });
  }, []);

  const captureLoyaltyPanelBlob = useCallback(async () => {
    if (!loyaltyPanelRef.current) {
      return null;
    }
    await waitForLoyaltyPanelAssets();
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(loyaltyPanelRef.current, {
      scale: 2,
      backgroundColor: '#f5f3ef',
      useCORS: true,
    });
    if (typeof canvas.toBlob !== 'function') {
      try {
        const dataUrl = canvas.toDataURL('image/png', 1);
        return dataUrlToBlob(dataUrl);
      } catch (error) {
        console.error('Error convirtiendo el panel en imagen:', error);
        return null;
      }
    }
    return new Promise<Blob | null>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                t('common.loyalty_image_error') ||
                  'No pudimos generar la imagen del programa de lealtad.'
              )
            );
            return;
          }
          resolve(blob);
        },
        'image/png',
        1
      );
    });
  }, [waitForLoyaltyPanelAssets, dataUrlToBlob, t]);

  const downloadLoyaltyPanel = useCallback((blob: Blob, filename: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
  }, []);

  const shouldShareLoyaltyPanel = deviceInfo.isMobile && isWebShareAvailable;

  const handleExportLoyaltyPanel = useCallback(async () => {
    if (!loyaltyPanelRef.current) {
      return;
    }
    setLoyaltyPanelActionError(null);
    setIsExportingLoyaltyPanel(true);
    try {
      const blob = await captureLoyaltyPanelBlob();
      if (!blob) {
        throw new Error('capture_failed');
      }
      const filename = 'xoco-programa-lealtad';
      if (
        shouldShareLoyaltyPanel &&
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
      ) {
        const shareFile = new File([blob], `${filename}.png`, { type: 'image/png' });
        const canShareFiles =
          typeof navigator.canShare !== 'function' || navigator.canShare({ files: [shareFile] });
        try {
          const sharePayload =
            canShareFiles || deviceInfo.isAndroid
              ? {
                  files: [shareFile],
                  title: 'Programa de lealtad Xoco Café',
                  text: 'Comparte tu avance del programa de lealtad y tus favoritos.',
                }
              : {
                  title: 'Programa de lealtad Xoco Café',
                  text: 'Comparte tu avance del programa de lealtad y tus favoritos.',
                };
          if (!canShareFiles && !deviceInfo.isAndroid) {
            throw new Error('share_not_supported');
          }
          await navigator.share({
            ...sharePayload,
          });
          setIsExportingLoyaltyPanel(false);
          return;
        } catch (shareError) {
          if (
            shareError instanceof DOMException &&
            (shareError.name === 'AbortError' || shareError.name === 'NotAllowedError')
          ) {
            throw shareError;
          }
          console.error('Error compartiendo el panel:', shareError);
          throw new Error('share_failed');
        }
      }
      downloadLoyaltyPanel(blob, filename);
    } catch (error) {
      console.error('Error exportando programa de lealtad:', error);
      if (
        error instanceof DOMException &&
        (error.name === 'AbortError' || error.name === 'NotAllowedError')
      ) {
        setLoyaltyPanelActionError('Cancelaste la acción antes de completarla.');
      } else if (error instanceof Error && error.message === 'share_not_supported') {
        setLoyaltyPanelActionError(
          t('common.device_share_error') ||
            'Tu dispositivo no permite compartir este archivo. Intenta descargarlo desde este botón.'
        );
      } else if (error instanceof Error && error.message === 'share_failed') {
        setLoyaltyPanelActionError(
          t('common.share_panel_error') ||
            'No pudimos compartir el panel en este dispositivo. Intenta nuevamente o descárgalo.'
        );
      } else {
        setLoyaltyPanelActionError(
          t('common.loyalty_error') ||
            'No pudimos generar la imagen del programa de lealtad. Intenta de nuevo en unos segundos.'
        );
      }
    } finally {
      setIsExportingLoyaltyPanel(false);
    }
  }, [captureLoyaltyPanelBlob, downloadLoyaltyPanel, shouldShareLoyaltyPanel, deviceInfo, t]);

  const updateConsentPreferences = useCallback(
    async (overrides: Partial<UpdateConsentInput>) => {
      if (!token || !user) {
        setPushPermissionInfo('Inicia sesión para actualizar tus preferencias.');
        return false;
      }
      setIsUpdatingConsent(true);
      setPushPermissionInfo(null);
      try {
        const payload: UpdateConsentInput = {
          marketingEmail: overrides.marketingEmail ?? Boolean(user.marketingEmail),
          marketingSms: overrides.marketingSms ?? Boolean(user.marketingSms),
          marketingPush: overrides.marketingPush ?? Boolean(user.marketingPush),
        };
        const response = await fetch('/api/auth/consent', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (result.success) {
          updateUser(result.user);
          prefillConsentForm(result.user);
          return true;
        }
        setPushPermissionInfo(result.message ?? 'No pudimos actualizar tus preferencias.');
        return false;
      } catch (error) {
        console.error('Error actualizando consentimientos:', error);
        showSnackbar(
          t('common.preferences_error') || 'Ocurrió un error al actualizar tus preferencias.',
          'error'
        );
        return false;
      } finally {
        setIsUpdatingConsent(false);
      }
    },
    [prefillConsentForm, token, updateUser, user, showSnackbar, t]
  );

  const handlePushToggle = useCallback(
    async (checked: boolean) => {
      if (!user) return;
      setConsentValue('marketingPush', checked);
      if (checked) {
        const permissionResult = await ensurePushPermission(deviceInfo);
        setPushPermissionInfo(permissionResult.message);
        if (!permissionResult.granted) {
          setConsentValue('marketingPush', false);
          return;
        }
      } else {
        setPushPermissionInfo('No enviaremos notificaciones push hasta que vuelvas a activarlas.');
      }
      const success = await updateConsentPreferences({ marketingPush: checked });
      if (!success) {
        setConsentValue('marketingPush', !checked);
      } else if (checked) {
        setPushPermissionInfo('Activamos las notificaciones push de tu cuenta.');
      }
    },
    [deviceInfo, setConsentValue, updateConsentPreferences, user]
  );

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
        setMessage('');
        showSnackbar(t('profile.update_success') || 'Perfil actualizado correctamente.', 'profile');
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage(t('profile.update_error') || 'Error actualizando el perfil.');
    }
  };

  const onChangePassword = async (data: ChangePasswordInput) => {
    if (!token) {
      setPasswordAlert({
        type: 'error',
        message:
          t('common.session_validate_error') ||
          'No se pudo validar tu sesión. Inicia sesión nuevamente.',
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
          message:
            result.message ||
            t('profile.password_success') ||
            'Contraseña actualizada correctamente.',
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
          message:
            result.message ||
            t('profile.password_error') ||
            'No pudimos actualizar tu contraseña. Intenta de nuevo.',
        });
      }
    } catch (error) {
      setPasswordAlert({
        type: 'error',
        message:
          t('profile.password_fatal_error') ||
          'Error actualizando tu contraseña. Intenta más tarde.',
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

        setMessage('');
        showSnackbar(
          t('profile.export_success') || 'Descargamos una copia de tus datos personales.',
          'profile'
        );
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage(t('profile.export_error') || 'Error exportando tus datos.');
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
      setMessage(t('profile.delete_error') || 'Error eliminando tu cuenta.');
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

  const qrUrl = useMemo(() => {
    if (!user?.clientId) {
      return null;
    }
    const favoriteBeverage =
      resolveFavoriteLabel(user.favoriteColdDrink ?? user.favoriteHotDrink) ?? 'No registrado';
    const favoriteFood = resolveFavoriteLabel(user.favoriteFood) ?? 'No registrado';
    const qrPayload = {
      'Id cliente': user.clientId,
      'Nombre del cliente': user.firstName ?? 'No registrado',
      Apellido: user.lastName ?? 'No registrado',
      'Bebida favorita': favoriteBeverage,
      'Alimento favorito': favoriteFood,
      Número: user.phone ?? 'No registrado',
      Mail: user.email ?? 'Sin correo',
    };
    const encoded = encodeURIComponent(JSON.stringify(qrPayload, null, 2));
    return `/api/qr?size=220x220&data=${encoded}`;
  }, [
    user?.clientId,
    user?.firstName,
    user?.lastName,
    user?.favoriteColdDrink,
    user?.favoriteHotDrink,
    user?.favoriteFood,
    user?.phone,
    user?.email,
  ]);

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
    clientFavorites?.favorites?.primaryBeverage?.label ??
    clientFavorites?.favorites?.primaryBeverage?.value ??
    clientFavorites?.favorites?.beverageCold?.label ??
    clientFavorites?.favorites?.beverageCold?.value ??
    clientFavorites?.favorites?.beverageHot?.label ??
    clientFavorites?.favorites?.beverageHot?.value ??
    resolveFavoriteLabel(user.favoriteColdDrink ?? user.favoriteHotDrink) ??
    user.favoriteColdDrink ??
    user.favoriteHotDrink ??
    'No registrado';
  const favoriteFoodLabel =
    clientFavorites?.favorites?.food?.label ??
    clientFavorites?.favorites?.food?.value ??
    resolveFavoriteLabel(user.favoriteFood) ??
    user.favoriteFood ??
    'No registrado';
  const favoriteBeverageMenuId =
    clientFavorites?.favorites?.primaryBeverage?.menuId ??
    clientFavorites?.favorites?.beverageCold?.menuId ??
    clientFavorites?.favorites?.beverageHot?.menuId ??
    user.favoriteColdDrink ??
    user.favoriteHotDrink ??
    null;
  const favoriteFoodMenuId = clientFavorites?.favorites?.food?.menuId ?? user.favoriteFood ?? null;
  const loyaltyStampsGoal = clientFavorites?.loyalty?.stampsGoal ?? undefined;
  const normalizedClientId = user.clientId?.trim().toLowerCase() ?? null;
  const normalizedUserId = user.id ?? null;
  const normalizedEmail = user.email?.trim().toLowerCase() ?? null;
  const activeLoyaltyCustomer =
    loyaltyStats?.customers.find((customer) => {
      const customerClientId = customer.clientId?.trim().toLowerCase();
      if (normalizedClientId && customerClientId && customerClientId === normalizedClientId) {
        return true;
      }
      if (normalizedUserId && customer.userId === normalizedUserId) {
        return true;
      }
      const customerEmail = customer.email?.trim().toLowerCase();
      if (normalizedEmail && customerEmail && customerEmail === normalizedEmail) {
        return true;
      }
      return false;
    }) ?? null;
  const loyaltyOrdersCount =
    activeLoyaltyCustomer?.orders ?? clientFavorites?.loyalty?.ordersCount ?? null;
  const loyaltyInteractionsCount =
    activeLoyaltyCustomer?.totalInteractions ?? clientFavorites?.loyalty?.interactionsCount ?? null;
  const loyaltyCustomerName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || undefined;
  const loyaltyCardLoading = isClientFavoritesLoading || isLoyaltyStatsLoading;

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

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

        <motion.section
          ref={profileSectionRef}
          className={sectionCardClass}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                <TranslatedText tid="profile.mi_perfil" fallback="Mi Perfil" />
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                <TranslatedText
                  tid="profile.update_profile_desc"
                  fallback="Mantén tu información personal y de contacto al día."
                />
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
              {isEditing ? (
                <TranslatedText tid="profile.cancel" fallback="Cancelar" />
              ) : (
                <TranslatedText tid="profile.edit" fallback="Editar" />
              )}
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
                    <TranslatedText tid="profile.first_name" fallback="Nombre" />
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
                    <TranslatedText tid="profile.last_name" fallback="Apellido" />
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
                  <TranslatedText tid="profile.phone" fallback="Teléfono" />
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
                    <TranslatedText tid="profile.city" fallback="Ciudad" />
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
                    <TranslatedText tid="profile.country" fallback="País" />
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
                  <TranslatedText tid="profile.wallet" fallback="Wallet EVM" />
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
                  <TranslatedText tid="profile.cancel" fallback="Cancelar" />
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <TranslatedText tid="profile.save" fallback="Guardar" />
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
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    <TranslatedText tid="profile.wallet" fallback="Wallet EVM" />
                  </p>
                  <p className="mt-1 text-sm break-all text-gray-900 dark:text-white">
                    {user.walletAddress}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-2 rounded-3xl bg-primary-600 px-4 py-3 text-sm text-white shadow-lg dark:bg-primary-900/30 dark:text-primary-100">
            <span>
              <TranslatedText tid="profile.help_prompt" fallback="¿Necesitas ayuda? Mándanos un" />
            </span>
            <a
              href={siteMetadata.whats}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white shadow transition-colors hover:bg-white/30 dark:bg-[#0f1728]"
              aria-label="WhatsApp"
            >
              <FaWhatsapp />
            </a>
            <span>
              <TranslatedText
                tid="profile.whatsapp_help_end"
                fallback="y con todo gusto te ayudamos."
              />
            </span>
          </div>
        </motion.section>

        <motion.section
          ref={addressesSectionRef}
          className={sectionCardClass}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
          <div
            ref={loyaltyPanelRef}
            className="space-y-4 rounded-[32px] border border-white/30 bg-white/10 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/40"
          >
            <LoyaltyProgressCard
              coffees={loyaltyCoffeeCount}
              goal={loyaltyStampsGoal}
              orders={loyaltyOrdersCount ?? undefined}
              totalInteractions={loyaltyInteractionsCount ?? undefined}
              customerName={loyaltyCustomerName}
              isLoading={loyaltyCardLoading}
              className="border-white/15"
              qrUrl={qrUrl}
              clientId={user.clientId ?? null}
            />
            <FavoriteItemsList
              beverage={favoriteBeverageLabel === 'No registrado' ? null : favoriteBeverageLabel}
              food={favoriteFoodLabel === 'No registrado' ? null : favoriteFoodLabel}
              isLoading={isClientFavoritesLoading}
              tone="light"
              className="rounded-2xl border border-white/30 bg-white/70 p-4 text-gray-900 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-gray-950/70 dark:text-white"
            />
          </div>

          <div className="mt-4 rounded-3xl border border-white/30 bg-white/10 p-4 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/40">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleExportLoyaltyPanel()}
                className="w-full rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-lg transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-500 dark:hover:bg-primary-400"
                disabled={isExportingLoyaltyPanel}
              >
                {isExportingLoyaltyPanel ? (
                  <TranslatedText tid="profile.generating" fallback="Generando..." />
                ) : shouldShareLoyaltyPanel ? (
                  <TranslatedText
                    tid="profile.loyalty_share"
                    fallback="Compartir programa de lealtad"
                  />
                ) : (
                  <TranslatedText
                    tid="profile.loyalty_download"
                    fallback="Descargar programa de lealtad"
                  />
                )}
              </button>
            </div>
          </div>
          {loyaltyPanelActionError && (
            <p className="text-xs text-red-600 dark:text-red-400">{loyaltyPanelActionError}</p>
          )}
          <div className="rounded-2xl border border-white/30 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-gray-900/60">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              <TranslatedText tid="profile.personalize_favorites" fallback="Personalízalos" />
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <TranslatedText
                tid="profile.favorites_desc"
                fallback="Selecciona tus bebidas y alimentos favoritos del menú."
              />
            </p>
            {clientFavoritesError && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">{clientFavoritesError}</p>
            )}
            <div className="mt-4">
              <FavoritesSelect
                initialBeverageId={favoriteBeverageMenuId}
                initialFoodId={favoriteFoodMenuId}
                initialFavorites={clientFavorites}
                initialFavoritesLoading={isClientFavoritesLoading}
                onUpdate={() => void refreshClientFavorites()}
                onNotify={({ success, message }) => {
                  showSnackbar(message, success ? 'profile' : 'error');
                }}
                variant="default"
              />
            </div>
          </div>
        </motion.section>

        <CollapsibleSection
          titleId="profile.favorites_stats"
          titleFallback="Estadísticas de favoritos"
        >
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            <TranslatedText
              tid="profile.consumption_desc"
              fallback="Visualiza tu consumo histórico y mantente al tanto de tus hábitos en Xoco Café."
            />
          </p>
          <ConsumptionChart />
        </CollapsibleSection>

        <CollapsibleSection titleId="profile.comments_title" titleFallback="Mis comentarios">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            <TranslatedText
              tid="profile.comments_desc"
              fallback="Tu opinión nos ayuda a mejorar. Comparte sugerencias o cualquier detalle de tu experiencia."
            />
          </p>
          <ShareExperienceForm />
        </CollapsibleSection>

        <motion.section
          ref={addressesSectionRef}
          className={sectionCardClass}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              <TranslatedText tid="profile.addresses" fallback="Mis direcciones" />
            </h3>
            <button
              type="button"
              onClick={() => {
                scrollToAddressesSection();
                setIsAddressModalOpen(true);
              }}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              <TranslatedText tid="profile.manage" fallback="Administrar" />
            </button>
          </div>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            <TranslatedText
              tid="profile.addresses_desc"
              fallback="Administra tus domicilios guardados y asígnales un nombre para pedir más rápido."
            />
          </p>

          <div className="space-y-3">
            {user.addresses && user.addresses.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {user.addresses.map((address: AddressInput) => (
                  <div
                    key={address.id || address.label}
                    className="rounded-2xl border border-gray-200 bg-white/50 p-3 text-xs dark:border-gray-700 dark:bg-gray-800/50"
                  >
                    <p className="font-bold text-gray-900 dark:text-white">{address.label}</p>
                    <p className="mt-1 line-clamp-2 text-gray-500 dark:text-gray-400">
                      {address.street}, {address.city}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500 dark:border-gray-700">
                <TranslatedText
                  tid="profile.no_addresses"
                  fallback="No tienes direcciones guardadas."
                />
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <TranslatedText
                  tid="profile.addresses_max_notice"
                  fallback="Puedes guardar hasta 3 direcciones activas."
                />
              </p>
              <button
                type="button"
                onClick={() => {
                  scrollToAddressesSection();
                  setIsAddressModalOpen(true);
                }}
                className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                {user.addresses && user.addresses.length > 0 ? (
                  <TranslatedText tid="profile.edit_addresses" fallback="Editar direcciones" />
                ) : (
                  <TranslatedText tid="profile.add_address" fallback="Agregar dirección" />
                )}
              </button>
            </div>
          </div>
        </motion.section>

        <CollapsibleSection
          titleId="profile.advanced_settings"
          titleFallback="Configuración avanzada"
        >
          <div className="space-y-8 divide-y divide-gray-100 dark:divide-white/10">
            {/* Security Section */}
            <div className="pt-2 first:pt-0">
              <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                <TranslatedText tid="profile.security_title" fallback="Seguridad de la cuenta" />
              </h4>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                <TranslatedText
                  tid="profile.security_desc"
                  fallback="Mantén tu contraseña al día para proteger tus pedidos y recompensas."
                />
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
                  <TranslatedText
                    tid="profile.google_notice"
                    fallback="Esta cuenta se administra con Google. Usa &ldquo;Continuar con Google&rdquo; para gestionar tu acceso."
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <TranslatedText
                      tid="profile.security_advice"
                      fallback="Usa una contraseña segura con mayúsculas, minúsculas y caracteres especiales."
                    />
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    <TranslatedText
                      tid="profile.update_password_btn"
                      fallback="Actualizar contraseña"
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Marketing Section */}
            <div className="pt-6">
              <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                <TranslatedText
                  tid="profile.marketing_title"
                  fallback="Preferencias de Marketing"
                />
              </h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    {...registerConsent('marketingEmail')}
                    type="checkbox"
                    id="marketingEmail"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled
                    checked={marketingEmailValue}
                    readOnly
                  />
                  <label
                    htmlFor="marketingEmail"
                    className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                  >
                    <TranslatedText
                      tid="profile.marketing_email"
                      fallback="Recibir ofertas por email (administrado por Xoco Café)"
                    />
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    {...registerConsent('marketingPush')}
                    type="checkbox"
                    id="marketingPush"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={marketingPushValue}
                    onChange={(event) => handlePushToggle(event.target.checked)}
                    disabled={isUpdatingConsent}
                  />
                  <label
                    htmlFor="marketingPush"
                    className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                  >
                    <TranslatedText
                      tid="profile.marketing_push"
                      fallback="Recibir notificaciones push de pedidos y recompensas"
                    />
                  </label>
                </div>
                {pushPermissionInfo && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">{pushPermissionInfo}</p>
                )}
              </div>
            </div>

            {/* GDPR Section */}
            <div className="pt-6">
              <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                <TranslatedText tid="profile.gdpr_title" fallback="Gestión de Datos (GDPR)" />
              </h4>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <TranslatedText
                    tid="profile.gdpr_desc"
                    fallback="Descarga una copia de todos tus datos personales en formato CSV."
                  />
                </p>
                <button
                  onClick={exportData}
                  className="shrink-0 rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                >
                  <TranslatedText tid="profile.export_data" fallback="Exportar Datos" />
                </button>
              </div>
            </div>

            {/* Delete Account Section */}
            <div className="pt-6">
              <div className="rounded-xl border border-red-200/60 bg-red-50/50 p-4 dark:border-red-500/30 dark:bg-red-900/20">
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">
                  <TranslatedText tid="profile.delete_title" fallback="Eliminar cuenta" />
                </h4>
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="text-xs text-red-600/80 dark:text-red-300/80">
                    <TranslatedText
                      tid="profile.delete_desc"
                      fallback="Esta acción eliminará permanentemente tu cuenta y todos tus datos. No se puede deshacer."
                    />
                  </p>
                  <button
                    type="button"
                    onClick={deleteAccount}
                    className="shrink-0 rounded-lg bg-red-600/10 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-600/20 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/60"
                  >
                    <TranslatedText tid="profile.delete_account" fallback="Eliminar Cuenta" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      <ProfileModal
        open={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title="Mis direcciones"
        autoScrollTop
        alignToTop
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
              <TranslatedText tid="profile.current_password" fallback="Contraseña actual" />
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
              <TranslatedText tid="profile.new_password" fallback="Nueva contraseña" />
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
              <TranslatedText
                tid="profile.confirm_password"
                fallback="Confirmar nueva contraseña"
              />
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
            <TranslatedText
              tid="profile.password_complexity"
              fallback="Debe contener al menos 8 caracteres, incluir mayúsculas, minúsculas, un número y un caracter especial."
            />
          </p>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isChangingPassword ? (
              <TranslatedText tid="profile.updating" fallback="Actualizando..." />
            ) : (
              <TranslatedText tid="profile.update_password_btn" fallback="Actualizar contraseña" />
            )}
          </button>
        </form>
      </ProfileModal>

      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </>
  );
}

// Helper Component for Collapsible Sections
function CollapsibleSection({
  titleId,
  titleFallback,
  children,
  defaultOpen = false,
}: {
  titleId: string;
  titleFallback: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.section
      className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-all dark:border-white/5 dark:bg-gray-900/40"
      initial={false}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between focus:outline-none"
      >
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          <TranslatedText tid={titleId} fallback={titleFallback} />
        </h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-gray-500 dark:text-gray-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: 'auto', marginTop: 16 },
              collapsed: { opacity: 0, height: 0, marginTop: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="mt-2 w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <span className="border-b border-gray-300 dark:border-gray-600 pb-0.5">
            <span className="hidden sm:inline">Click</span>
            <span className="sm:hidden">Tap</span> para ver más info
          </span>
        </button>
      )}
    </motion.section>
  );
}

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  autoScrollTop?: boolean;
  alignToTop?: boolean;
};

function ProfileModal({
  open,
  onClose,
  title,
  children,
  autoScrollTop = true,
  alignToTop = false,
}: ProfileModalProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    // Bloquear scroll del body
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    if (autoScrollTop && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [autoScrollTop, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/60 px-4 py-6 backdrop-blur-sm ${
        alignToTop ? 'items-start pt-12 sm:pt-16 md:pt-20' : 'items-center'
      }`}
      role="button"
      aria-label="Cerrar modal"
      tabIndex={0}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
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
        <div className="max-h-[70vh] overflow-y-auto pr-1" data-profile-modal-scroll="true">
          {children}
        </div>
      </div>
    </div>
  );
}
