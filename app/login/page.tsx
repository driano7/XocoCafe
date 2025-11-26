'use client';

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/Auth/AuthProvider';
import LoginForm from '@/components/Auth/LoginForm';
import RegisterForm from '@/components/Auth/RegisterForm';
import ForgotPasswordForm from '@/components/Auth/ForgotPasswordForm';
import type { AuthSuccessContext } from '@/components/Auth/types';

type SnackbarTone = 'info' | 'success' | 'error';

interface SnackbarState {
  message: ReactNode;
  tone: SnackbarTone;
  id: number;
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState<ReactNode>(null);
  const [postAuthRedirect, setPostAuthRedirect] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const { login, user, logout, isLoading } = useAuth();
  const router = useRouter();

  const triggerSnackbar = useCallback((message: ReactNode, tone: SnackbarTone = 'info') => {
    setSnackbar({ message, tone, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!snackbar) return;
    const timeout = window.setTimeout(() => setSnackbar(null), 5000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [snackbar]);

  const handleSuccess = (token: string, authUser: any, context: AuthSuccessContext) => {
    login(token, authUser);
    if (typeof window !== 'undefined' && context.source === 'login' && context.showFeedbackPrompt) {
      sessionStorage.setItem('xoco:feedbackPrompt', 'true');
    }
    setPostAuthRedirect(context.source === 'register' ? '/onboarding/favorites' : '/profile');
  };

  const handleError = (message: string | ReactNode) => {
    setError(message);
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    setError(null);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setError(null);
  };

  useEffect(() => {
    if (user && postAuthRedirect) {
      router.replace(postAuthRedirect);
      setPostAuthRedirect(null);
    }
  }, [user, router, postAuthRedirect]);

  const greetingName = useMemo(() => {
    if (!user) return null;
    const composedName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return composedName.length > 0 ? composedName : user.email;
  }, [user]);

  const handleExistingAccount = (email: string) => {
    setIsLogin(true);
    setShowForgotPassword(true);
    setError(null);

    triggerSnackbar(
      <span>
        Ya existe una cuenta asociada a <strong>{email}</strong>.{' '}
        <button
          type="button"
          onClick={() => {
            setShowForgotPassword(true);
          }}
          className="underline decoration-dotted underline-offset-4 text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </span>,
      'info'
    );
  };

  const snackbarToneStyles: Record<SnackbarTone, string> = {
    info: 'bg-blue-600 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
  };

  const snackbarElement = snackbar ? (
    <div className="fixed bottom-6 inset-x-0 flex justify-center px-4 z-50">
      <div
        className={`flex items-center space-x-3 rounded-md px-4 py-3 shadow-lg ${
          snackbarToneStyles[snackbar.tone]
        }`}
      >
        <span className="text-sm font-medium">{snackbar.message}</span>
        <button
          type="button"
          onClick={() => setSnackbar(null)}
          className="text-sm font-semibold underline underline-offset-4"
        >
          Cerrar
        </button>
      </div>
    </div>
  ) : null;

  if (isLoading) {
    return (
      <>
        {snackbarElement}
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-300">Cargando tu sesión...</p>
        </div>
      </>
    );
  }

  if (user) {
    return (
      <>
        {snackbarElement}
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg w-full space-y-6 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Hola, {greetingName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ya tienes una sesión activa. Puedes visitar tu perfil o cerrar sesión desde aquí.
            </p>
            <div className="flex flex-col sm:flex-row sm:justify-center sm:space-x-4 space-y-3 sm:space-y-0">
              <button
                type="button"
                onClick={() => router.push('/profile')}
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Ir a mi perfil
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cerrar sesión
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setShowForgotPassword(false);
                setSnackbar(null);
              }}
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              ¿Quieres registrar otra cuenta?
            </button>
          </div>
        </div>
      </>
    );
  }

  if (showForgotPassword) {
    return (
      <>
        {snackbarElement}
        <ForgotPasswordForm onBack={handleBackToLogin} />
      </>
    );
  }

  return (
    <>
      {snackbarElement}
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {isLogin ? 'Accede a tu cuenta de Xoco Café' : 'Únete a la comunidad Xoco Café'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow rounded-lg">
            {isLogin ? (
              <LoginForm
                onSuccess={handleSuccess}
                onError={handleError}
                onForgotPassword={handleForgotPassword}
              />
            ) : (
              <RegisterForm
                onSuccess={handleSuccess}
                onError={handleError}
                onExistingAccount={handleExistingAccount}
              />
            )}
          </div>

          <div className="text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setShowForgotPassword(false);
                setError(null);
              }}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              {isLogin
                ? '¿No tienes cuenta? Regístrate aquí'
                : '¿Ya tienes cuenta? Inicia sesión aquí'}
            </button>
          </div>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Al {isLogin ? 'iniciar sesión' : 'registrarte'}, aceptas nuestros{' '}
              <a href="/terms" className="text-blue-600 hover:text-blue-500 underline">
                términos y condiciones
              </a>{' '}
              y{' '}
              <a href="/privacy" className="text-blue-600 hover:text-blue-500 underline">
                política de privacidad
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
