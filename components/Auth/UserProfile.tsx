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
import { motion } from 'framer-motion';
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
} from '@/lib/validations/auth';
import { resolveFavoriteLabel } from '@/lib/menuFavorites';
import { useClientFavorites } from '@/hooks/useClientFavorites';
import { detectDeviceInfo, ensurePushPermission } from '@/lib/pushNotifications';
import { useSnackbarNotifications } from '@/hooks/useSnackbarNotifications';
import Snackbar from '@/components/Feedback/Snackbar';
import { useLoyalty } from '@/hooks/useLoyalty';

const FREE_COFFEE_NOTICE_KEY = 'xoco_free_coffee_notice';

export default function UserProfile() {
  const { user, token, updateUser, isLoading } = useAuth();
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
        showSnackbar('Tu próximo café americano es cortesía. Mantente al pendiente.', 'profile', {
          deviceNotification: {
            title: 'Tu siguiente café es gratis ☕️',
            body: 'Acumula un sello más para canjearlo en barra.',
          },
        });
        void ensurePushPermission(deviceInfo);
      }
    } else {
      window.sessionStorage.removeItem(FREE_COFFEE_NOTICE_KEY);
    }
  }, [deviceInfo, loyaltyCoffeeCount, showSnackbar]);

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
            reject(new Error('No pudimos generar la imagen del programa de lealtad.'));
            return;
          }
          resolve(blob);
        },
        'image/png',
        1
      );
    });
  }, [waitForLoyaltyPanelAssets, dataUrlToBlob]);

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
          'Tu dispositivo no permite compartir este archivo. Intenta descargarlo desde este botón.'
        );
      } else if (error instanceof Error && error.message === 'share_failed') {
        setLoyaltyPanelActionError(
          'No pudimos compartir el panel en este dispositivo. Intenta nuevamente o descárgalo.'
        );
      } else {
        setLoyaltyPanelActionError(
          'No pudimos generar la imagen del programa de lealtad. Intenta de nuevo en unos segundos.'
        );
      }
    } finally {
      setIsExportingLoyaltyPanel(false);
    }
  }, [captureLoyaltyPanelBlob, downloadLoyaltyPanel, shouldShareLoyaltyPanel, deviceInfo]);

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
        setPushPermissionInfo('Ocurrió un error al actualizar tus preferencias.');
        return false;
      } finally {
        setIsUpdatingConsent(false);
      }
    },
    [prefillConsentForm, token, updateUser, user]
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
        showSnackbar('Perfil actualizado correctamente.', 'profile');
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

        setMessage('');
        showSnackbar('Descargamos una copia de tus datos personales.', 'profile');
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
          ref={addressesSectionRef}
          className={sectionCardClass}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
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
                {isExportingLoyaltyPanel
                  ? 'Generando...'
                  : shouldShareLoyaltyPanel
                  ? 'Compartir programa de lealtad'
                  : 'Descargar programa de lealtad'}
              </button>
            </div>
          </div>
          {loyaltyPanelActionError && (
            <p className="text-xs text-red-600 dark:text-red-400">{loyaltyPanelActionError}</p>
          )}
          <div className="rounded-2xl border border-white/30 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-gray-900/60">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Personalízalos</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Selecciona tus bebidas y alimentos favoritos del menú.
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

        <motion.section
          className={sectionCardClass}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
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
        </motion.section>

        <motion.section
          className={sectionCardClass}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
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
              onClick={() => {
                scrollToAddressesSection();
                setIsAddressModalOpen(true);
              }}
              className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Administrar direcciones
            </button>
          </div>
        </motion.section>

        <motion.section
          className={sectionCardClass}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
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
        </motion.section>

        <motion.section
          className={sectionCardClass}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
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
                checked={marketingEmailValue}
                readOnly
              />
              <label
                htmlFor="marketingEmail"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Recibir ofertas por email (administrado por Xoco Café)
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
                Recibir notificaciones push de pedidos y recompensas
              </label>
            </div>
            {pushPermissionInfo && (
              <p className="text-xs text-gray-600 dark:text-gray-400">{pushPermissionInfo}</p>
            )}
          </div>
        </motion.section>

        <motion.section
          className={sectionCardClass}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
        >
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
        </motion.section>

        <motion.section
          className={`${sectionCardClass} border-red-200/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-900/40`}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionVariants}
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
        </motion.section>
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

      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </>
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
    if (!autoScrollTop) {
      return;
    }
    if (open && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
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
