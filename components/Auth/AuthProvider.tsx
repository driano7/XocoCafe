'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { AuthUser } from '@/lib/validations/auth';
import { useAnalyticsContext } from '@/components/Analytics/AnalyticsProvider';

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
