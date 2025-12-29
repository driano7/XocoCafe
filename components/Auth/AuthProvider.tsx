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

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { AuthUser } from '@/lib/validations/auth';
import { useAnalyticsContext } from '@/components/Analytics/AnalyticsProvider';
import { detectDeviceInfo, ensurePushPermission, type DeviceInfo } from '@/lib/pushNotifications';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
const PUSH_PROMPT_KEY = 'xoco_push_prompted';

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => detectDeviceInfo());

  // Obtener contexto de analítica de forma segura
  const analyticsContext = useAnalyticsContext();

  useEffect(() => {
    // Verificar si hay un token guardado
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setToken(savedToken);
      // Verificar si el token es válido
      verifyToken(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setDeviceInfo(detectDeviceInfo());
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenToVerify}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.user);
        setToken(tokenToVerify);
      } else {
        // Token inválido, limpiar
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error verificando token:', error);
      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const syncMarketingPushPreference = useCallback(
    async (marketingPush: boolean) => {
      if (!token || !user) return;
      try {
        const response = await fetch('/api/auth/consent', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            marketingEmail: Boolean(user.marketingEmail),
            marketingSms: Boolean(user.marketingSms),
            marketingPush,
          }),
        });
        const result = await response.json();
        if (result.success) {
          setUser(result.user);
        }
      } catch (error) {
        console.error('Error actualizando preferencia push:', error);
      }
    },
    [token, user]
  );

  const login = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('authToken', newToken);

    // Track login event
    if (analyticsContext) {
      analyticsContext.setUserId(newUser.id);
      analyticsContext.trackConversion('login', undefined, {
        method: newUser.authProvider || 'email',
        userId: newUser.id,
        clientId: newUser.clientId,
      });
    }
  };

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch('/api/auth/me', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Track logout event
      if (analyticsContext && user) {
        analyticsContext.trackEvent('logout', {
          userId: user.id,
          clientId: user.clientId,
        });
        analyticsContext.setUserId(null);
      }

      setToken(null);
      setUser(null);
      localStorage.removeItem('authToken');
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          window.location.replace('/login');
        }, 800);
      }
    }
  }, [analyticsContext, token, user]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }
    if (!user || !token) {
      return;
    }
    const alreadyPrompted = window.localStorage.getItem(PUSH_PROMPT_KEY);
    if (alreadyPrompted) {
      return;
    }
    if (user.marketingPush || Notification.permission !== 'default') {
      window.localStorage.setItem(PUSH_PROMPT_KEY, 'yes');
      return;
    }
    const timeout = window.setTimeout(() => {
      const wantsPush = window.confirm(
        '¿Quieres recibir notificaciones push sobre tus pedidos y recompensas de Xoco Café?'
      );
      window.localStorage.setItem(PUSH_PROMPT_KEY, 'yes');
      if (!wantsPush) {
        void syncMarketingPushPreference(false);
        return;
      }
      void (async () => {
        const permissionResult = await ensurePushPermission(deviceInfo);
        window.alert(permissionResult.message);
        if (permissionResult.granted) {
          await syncMarketingPushPreference(true);
        } else {
          await syncMarketingPushPreference(false);
        }
      })();
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [deviceInfo, syncMarketingPushPreference, token, user]);

  useEffect(() => {
    if (!token) return undefined;

    let timeoutId: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        void logout();
      }, INACTIVITY_LIMIT_MS);
    };

    const handleActivity = () => resetTimer();
    const activityEvents: (keyof WindowEventMap)[] = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
    ];

    activityEvents.forEach((event) => window.addEventListener(event, handleActivity));
    const handleVisibility = () => {
      if (!document.hidden) {
        resetTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => window.removeEventListener(event, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [logout, token]);

  const updateUser = (updatedUser: AuthUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
