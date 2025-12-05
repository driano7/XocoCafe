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

import { useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const SCREEN_LOCK_GRACE_MS = 5000; // avoid instant logout on quick tab switches

export default function SessionWatcher() {
  const { user, logout } = useAuth();
  const logoutRef = useRef(logout);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // Detect reloads and end the session right away
  useEffect(() => {
    if (!user) return;

    const navigationEntries = performance.getEntriesByType(
      'navigation'
    ) as PerformanceNavigationTiming[];
    const isReload =
      navigationEntries.some((entry) => entry.type === 'reload') ||
      performance.navigation?.type === performance.navigation?.TYPE_RELOAD;

    if (isReload) {
      void logoutRef.current();
    }
  }, [user]);

  // Inactivity tracking
  useEffect(() => {
    if (!user) return;

    let inactivityTimer: number | undefined;

    const resetInactivityTimer = () => {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => {
        void logoutRef.current();
      }, INACTIVITY_LIMIT_MS);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'focus',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, true);
    });

    resetInactivityTimer();

    return () => {
      window.clearTimeout(inactivityTimer);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer, true);
      });
    };
  }, [user]);

  // Screen lock / visibility handling
  useEffect(() => {
    if (!user) return;

    let pendingLockTimer: number | undefined;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        pendingLockTimer = window.setTimeout(() => {
          void logoutRef.current();
        }, SCREEN_LOCK_GRACE_MS);
      } else {
        window.clearTimeout(pendingLockTimer);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleVisibility);

    return () => {
      window.clearTimeout(pendingLockTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handleVisibility);
    };
  }, [user]);

  return null;
}
