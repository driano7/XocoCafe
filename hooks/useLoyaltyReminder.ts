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

import { useCallback, useEffect, useState } from 'react';

interface LoyaltyReminderOptions {
  userId?: string | null;
  enrolled?: boolean | null;
  token?: string | null;
}

interface LoyaltyActivationResult {
  success: boolean;
  message?: string;
}

export function useLoyaltyReminder({ userId, enrolled, token }: LoyaltyReminderOptions) {
  const [showReminder, setShowReminder] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const storageKey = userId ? `xoco:loyalty-activated:${userId}` : null;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!userId || enrolled) {
      setShowReminder(false);
      return;
    }
    const activated = storageKey ? window.localStorage.getItem(storageKey) === 'true' : false;
    setShowReminder(!activated);
  }, [enrolled, storageKey, userId]);

  const markActivated = useCallback(() => {
    if (typeof window !== 'undefined' && storageKey) {
      window.localStorage.setItem(storageKey, 'true');
    }
    setShowReminder(false);
  }, [storageKey]);

  const activate = useCallback(async (): Promise<LoyaltyActivationResult> => {
    if (!userId) {
      return { success: false, message: 'Inicia sesión para activar tu programa de lealtad.' };
    }
    if (!token) {
      return { success: false, message: 'Tu sesión expiró. Inicia sesión nuevamente.' };
    }
    setIsActivating(true);
    try {
      const response = await fetch('/api/loyalty/activate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'No pudimos activar tu programa de lealtad.');
      }
      markActivated();
      return { success: true, message: payload.message };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'No pudimos activar tu programa de lealtad. Intenta nuevamente.',
      };
    } finally {
      setIsActivating(false);
    }
  }, [markActivated, token, userId]);

  return { showReminder, isActivating, activate };
}
