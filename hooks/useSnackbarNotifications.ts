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

const getInitialPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'default';
  }
  return Notification.permission;
};

export function useSnackbarNotifications(autoHideMs = 3000) {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    getInitialPermission()
  );

  useEffect(() => {
    if (!snackbar) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setSnackbar(null), autoHideMs);
    return () => window.clearTimeout(timeout);
  }, [autoHideMs, snackbar]);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return 'denied';
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const emitDeviceNotification = useMemo(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return async () => {};
    }
    return async ({ title, body }: DeviceNotificationOptions) => {
      if (!title) return;
      if (permission === 'granted') {
        new Notification(title, { body });
        return;
      }
      if (permission === 'default') {
        const result = await requestPermission();
        if (result === 'granted') {
          new Notification(title, { body });
        }
      }
    };
  }, [permission, requestPermission]);

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
    notificationPermission: permission,
    requestNotificationPermission: requestPermission,
  };
}
