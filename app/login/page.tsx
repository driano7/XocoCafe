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

import classNames from 'classnames';
import { motion, type Variants } from 'framer-motion';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/Auth/AuthProvider';
import LoginForm from '@/components/Auth/LoginForm';
import RegisterForm from '@/components/Auth/RegisterForm';
import ForgotPasswordForm from '@/components/Auth/ForgotPasswordForm';
import type { AuthSuccessContext } from '@/components/Auth/types';
import type { AuthUser } from '@/lib/validations/auth';

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
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [formHasBeenVisible, setFormHasBeenVisible] = useState(false);
  const [animationSeed] = useState(() => Math.random());
  const pageShellClasses =
    'relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-50 via-white to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8';
  const highlightItems = [
    {
      title: 'Pedidos inteligentes',
      description: 'Confirma órdenes, monitorea estados y recibe alertas al instante.',
      accent: 'Pedidos',
    },
    {
      title: 'Recompensas siempre visibles',
      description: 'Consulta metas de lealtad y anima a tus clientes a canjearlas.',
      accent: 'Rewards',
    },
  ];

  useEffect(() => {
    router.prefetch('/profile');
    router.prefetch('/onboarding/favorites');
    router.prefetch('/dashboard/pedidos');
  }, [router]);

  useEffect(() => {
    const target = formCardRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setFormVisible(true);
          setFormHasBeenVisible(true);
        } else {
          setFormVisible(false);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

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

  const handleSuccess = (token: string, authUser: AuthUser, context: AuthSuccessContext) => {
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
    info: 'bg-primary-600 text-white shadow-primary-600/40',
    success: 'bg-success-600 text-white shadow-success-600/40',
    error: 'bg-danger-600 text-white shadow-danger-600/40',
  };

  const interactiveVariants = useMemo<Variants>(() => {
    const baseDelay = 0.15 + (animationSeed % 0.15);
    return {
      hidden: { opacity: 0, y: 16 },
      visible: (index: number) => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: baseDelay + index * 0.08,
          duration: 0.4,
          ease: [0.17, 0.55, 0.55, 1],
        },
      }),
      instant: { opacity: 1, y: 0, transition: { duration: 0 } },
    };
  }, [animationSeed]);

  const shouldAnimateLoginStack = formHasBeenVisible && formVisible;

  const snackbarElement = snackbar ? (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        className={`flex items-center space-x-3 rounded-2xl px-4 py-3 shadow-xl ${
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
        <div className={pageShellClasses}>
          <div className="relative z-10 flex min-h-[60vh] items-center justify-center">
            <p className="rounded-full border border-primary-200/60 bg-white/70 px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg shadow-primary-900/5 dark:border-primary-900/40 dark:bg-gray-900/70 dark:text-primary-100">
              Cargando tu sesión...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (user) {
    return (
      <>
        {snackbarElement}
        <div className={pageShellClasses}>
          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="brand-auth-card space-y-6 text-center">
              <div>
                <p className="text-xs uppercase tracking-[0.5em] text-primary-500/80">
                  Sesión activa
                </p>
                <h2 className="mt-2 text-4xl font-black text-primary-900 dark:text-white">
                  Hola, {greetingName}
                </h2>
                <p className="mt-3 text-sm text-primary-800/80 dark:text-primary-100/80">
                  Ya tienes una sesión activa. Ve directo a tu perfil o cierra sesión para ingresar
                  con otra cuenta.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => router.push('/profile')}
                  className="brand-primary-btn"
                >
                  Ir a mi perfil
                </button>
                <button type="button" onClick={() => void logout()} className="brand-secondary-btn">
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
                className="brand-tertiary-btn w-full justify-center"
              >
                ¿Quieres registrar otra cuenta?
              </button>
            </div>
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
      <div className={pageShellClasses}>
        <div className="pointer-events-none absolute inset-y-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl dark:bg-primary-900/30" />
        <div className="pointer-events-none absolute bottom-0 right-10 h-64 w-64 rounded-full bg-primary-200/40 blur-3xl dark:bg-primary-900/40" />
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col-reverse gap-12 lg:flex-row">
          <section className="flex-1 space-y-8">
            <div className="rounded-3xl border border-primary-100/70 bg-white/90 p-8 shadow-2xl shadow-primary-900/5 backdrop-blur-md dark:border-primary-900/40 dark:bg-gray-900/70">
              <p className="text-sm uppercase tracking-[0.5em] text-primary-500/70">
                {isLogin ? 'Tu barra digital' : 'Bienvenido a Xoco Café'}
              </p>
              <h1 className="mt-4 text-4xl font-black text-primary-900 dark:text-white">
                {isLogin
                  ? 'Inicia sesión en tu barra digital'
                  : 'Registra tu cuenta y personaliza la experiencia POS'}
              </h1>
              <p className="mt-3 text-sm text-primary-800/80 dark:text-primary-100/80">
                Mantén sincronizados pedidos, recompensas, notificaciones y campañas de marketing en
                un mismo flujo.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {highlightItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-primary-100/80 bg-white/80 p-4 shadow-lg shadow-primary-900/5 transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-primary-900/10 dark:border-primary-900/40 dark:bg-gray-900/60"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-primary-500">
                    {item.accent}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-primary-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-primary-800/80 dark:text-primary-100/80">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex-1 lg:max-w-xl">
            {error && (
              <div className="mb-4 rounded-2xl border border-danger-200 bg-danger-50/80 px-4 py-3 text-sm font-semibold text-danger-700 dark:border-danger-500/40 dark:bg-danger-900/20 dark:text-danger-100">
                {error}
              </div>
            )}

            <motion.div
              ref={formCardRef}
              className={classNames(
                'brand-auth-card relative overflow-hidden transition-all duration-500',
                formHasBeenVisible && formVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-6 opacity-0'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="absolute inset-x-0 top-0 h-1 rounded-full bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400" />
              <div className="space-y-6 pt-2">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.5em] text-primary-500/70">
                    {isLogin ? 'Iniciar sesión' : 'Registrar cuenta'}
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-primary-900 dark:text-white">
                    {isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta en minutos'}
                  </h2>
                  <p className="mt-2 text-sm text-primary-800/80 dark:text-primary-100/80">
                    {isLogin
                      ? 'Accede al panel para continuar con tus pedidos.'
                      : 'Prepara tus datos básicos para activar tu perfil POS.'}
                  </p>
                </div>

                {isLogin ? (
                  <>
                    <LoginForm
                      onSuccess={handleSuccess}
                      onError={handleError}
                      onForgotPassword={handleForgotPassword}
                      shouldAnimateFields={shouldAnimateLoginStack}
                      animationDelay={0.1}
                    />
                    <motion.div
                      className="text-center"
                      variants={interactiveVariants}
                      initial="hidden"
                      animate={shouldAnimateLoginStack ? 'visible' : 'instant'}
                      custom={3}
                    >
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="brand-tertiary-btn w-full justify-center"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </motion.div>
                  </>
                ) : (
                  <RegisterForm
                    onSuccess={handleSuccess}
                    onError={handleError}
                    onExistingAccount={handleExistingAccount}
                  />
                )}

                <motion.div
                  className="text-center"
                  variants={interactiveVariants}
                  initial="hidden"
                  animate={shouldAnimateLoginStack ? 'visible' : 'instant'}
                  custom={4}
                >
                  <button
                    onClick={() => {
                      if (showForgotPassword) {
                        handleBackToLogin();
                        return;
                      }
                      setIsLogin(!isLogin);
                      setShowForgotPassword(false);
                      setError(null);
                    }}
                    className="brand-tertiary-btn w-full justify-center"
                  >
                    {showForgotPassword
                      ? 'Volver a iniciar sesión'
                      : isLogin
                      ? '¿No tienes cuenta? Regístrate aquí'
                      : '¿Ya tienes cuenta? Inicia sesión aquí'}
                  </button>
                </motion.div>

                <motion.div
                  className="text-center text-xs text-primary-800/70 dark:text-primary-100/70"
                  variants={interactiveVariants}
                  initial="hidden"
                  animate={shouldAnimateLoginStack ? 'visible' : 'instant'}
                  custom={5}
                >
                  <p>
                    Al {isLogin ? 'iniciar sesión' : 'registrarte'}, aceptas nuestros{' '}
                    <a
                      href="/terms"
                      className="font-semibold text-primary-600 underline decoration-dotted underline-offset-4 hover:text-primary-500"
                    >
                      términos y condiciones
                    </a>{' '}
                    y{' '}
                    <a
                      href="/privacy"
                      className="font-semibold text-primary-600 underline decoration-dotted underline-offset-4 hover:text-primary-500"
                    >
                      política de privacidad
                    </a>
                    .
                  </p>
                </motion.div>
              </div>
            </motion.div>

            <div className="mt-8 flex flex-wrap gap-3 lg:hidden">
              {['Tu barra digital', 'Pedidos', 'Rewards'].map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-primary-200/80 bg-primary-50/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-primary-700 dark:border-primary-800/50 dark:bg-primary-900/20 dark:text-primary-100"
                >
                  {badge}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
