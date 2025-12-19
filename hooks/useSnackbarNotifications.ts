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

import { useCallback, useEffect, useMemo, useState } from 'react';

export type SnackbarTone = 'info' | 'success' | 'warning' | 'error';

export type SnackbarState = {
  id: number;
  message: string;
  tone: SnackbarTone;
};

type DeviceNotificationOptions = {
  title: string;
  body?: string;
};

interface SnackbarOptions {
  deviceNotification?: DeviceNotificationOptions | null;
}

const PERMISSION_STORAGE_KEY = 'xoco_push_permission';

const hasNotificationSupport = () =>
  typeof window !== 'undefined' &&
  typeof Notification !== 'undefined' &&
  typeof Notification.requestPermission === 'function';

const getInitialPermission = (): NotificationPermission => {
  if (!hasNotificationSupport()) {
    return 'default';
  }
  return Notification.permission;
};

export function useSnackbarNotifications(autoHideMs = 3000) {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    getInitialPermission()
  );
  const [manualPromptRequired, setManualPromptRequired] = useState(false);
  const [storedPermission, setStoredPermission] = useState<NotificationPermission | null>(() => {
    if (typeof window === 'undefined') return null;
    const cached = window.localStorage.getItem(PERMISSION_STORAGE_KEY);
    if (cached === 'granted' || cached === 'denied') {
      return cached;
    }
    return null;
  });
  const notificationSupported = hasNotificationSupport();
  const effectivePermission = storedPermission ?? permission;

  useEffect(() => {
    if (!snackbar) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setSnackbar(null), autoHideMs);
    return () => window.clearTimeout(timeout);
  }, [autoHideMs, snackbar]);

  const requestPermission = useCallback(async () => {
    if (!notificationSupported) {
      setManualPromptRequired(false);
      setStoredPermission('denied');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PERMISSION_STORAGE_KEY, 'denied');
      }
      return 'denied' as NotificationPermission;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'default') {
      setManualPromptRequired(false);
      setStoredPermission(result);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PERMISSION_STORAGE_KEY, result);
      }
    }
    return result;
  }, [notificationSupported]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }
    if (effectivePermission !== 'default') {
      setManualPromptRequired(false);
      return;
    }
    const ua = navigator.userAgent?.toLowerCase() ?? '';
    const isTouch = navigator.maxTouchPoints > 1;
    const isMobile = /android|iphone|ipad|ipod/.test(ua) || isTouch;
    const isIOS =
      /iphone|ipod|ipad/.test(ua) ||
      (/macintosh/i.test(navigator.userAgent || '') &&
        typeof navigator.maxTouchPoints === 'number' &&
        navigator.maxTouchPoints > 1);
    if (!isMobile) {
      return;
    }
    if (isIOS) {
      setManualPromptRequired(true);
      return;
    }
    void requestPermission();
  }, [effectivePermission, requestPermission]);

  const emitDeviceNotification = useMemo(() => {
    if (!notificationSupported) {
      return async () => {};
    }
    return async ({ title, body }: DeviceNotificationOptions) => {
      if (!title) return;
      if (effectivePermission === 'granted') {
        new Notification(title, { body });
        return;
      }
      if (effectivePermission === 'default') {
        const result = await requestPermission();
        if (result === 'granted') {
          new Notification(title, { body });
        }
      }
    };
  }, [effectivePermission, notificationSupported, requestPermission]);

  const showSnackbar = useCallback(
    (message: string, tone: SnackbarTone = 'info', options?: SnackbarOptions) => {
      setSnackbar({ id: Date.now(), message, tone });
      if (options?.deviceNotification) {
        void emitDeviceNotification(options.deviceNotification);
      }
    },
    [emitDeviceNotification]
  );

  const dismissSnackbar = useCallback(() => setSnackbar(null), []);

  return {
    snackbar,
    showSnackbar,
    dismissSnackbar,
    notificationPermission: effectivePermission,
    requestNotificationPermission: requestPermission,
    shouldDisplayPermissionPrompt:
      notificationSupported && manualPromptRequired && effectivePermission === 'default',
    notificationSupported,
  };
}
