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

import { ReactNode, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { useConversionTracking } from '@/components/Analytics/AnalyticsProvider';
import type { AuthSuccessHandler } from '@/components/Auth/types';
import { motion, type Variants } from 'framer-motion';
import { useLanguage } from '@/components/Language/LanguageProvider';

interface LoginFormProps {
  onSuccess: AuthSuccessHandler;
  onError: (message: string | ReactNode) => void;
  onForgotPassword?: () => void;
  shouldAnimateFields?: boolean;
  animationDelay?: number;
}

export default function LoginForm({
  onSuccess,
  onError,
  onForgotPassword,
  shouldAnimateFields = false,
  animationDelay = 0,
}: LoginFormProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { trackLogin, trackFormSubmit } = useConversionTracking();
  void onForgotPassword;
  const inputClasses = 'brand-input';

  const fieldVariants = useMemo<Variants>(() => {
    return {
      hidden: { opacity: 0, y: 18 },
      visible: (custom: number) => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: animationDelay + custom * 0.1,
          duration: 0.45,
          ease: [0.17, 0.55, 0.55, 1],
        },
      }),
      instant: { opacity: 1, y: 0, transition: { duration: 0 } },
    };
  }, [animationDelay]);

  const animationState = shouldAnimateFields ? 'visible' : 'instant';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        trackLogin('email');
        trackFormSubmit('login', true);
        localStorage.setItem('authToken', result.token);
        onSuccess(result.token, result.user, {
          source: 'login',
          loginCount: result.loginCount ?? null,
          showFeedbackPrompt: Boolean(result.showFeedbackPrompt),
        });
      } else {
        trackFormSubmit('login', false);
        onError(result.message);
      }
    } catch (error) {
      onError(t('auth.errors.connection') || 'Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <motion.div variants={fieldVariants} initial="hidden" animate={animationState} custom={0}>
        <label
          htmlFor="email"
          className="block text-sm font-semibold tracking-wide text-primary-900 dark:text-primary-100"
        >
          {t('auth.email') || 'Email'}
        </label>
        <input
          {...register('email')}
          type="email"
          id="email"
          className={inputClasses}
          placeholder={t('auth.email_placeholder') || 'tu@email.com'}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </motion.div>

      <motion.div variants={fieldVariants} initial="hidden" animate={animationState} custom={1}>
        <label
          htmlFor="password"
          className="block text-sm font-semibold tracking-wide text-primary-900 dark:text-primary-100"
        >
          {t('auth.password') || 'Contraseña'}
        </label>
        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            id="password"
            className={inputClasses}
            placeholder={t('auth.password_placeholder') || 'Tu contraseña'}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 hover:text-primary-500 dark:text-primary-200"
            aria-label={t('profile.password_visibility_label') || 'Mostrar u ocultar contraseña'}
          >
            {showPassword ? t('profile.hide') || 'Ocultar' : t('profile.view') || 'Ver'}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
      </motion.div>

      <motion.button
        type="submit"
        disabled={isLoading}
        className="brand-primary-btn"
        variants={fieldVariants}
        initial="hidden"
        animate={animationState}
        custom={2}
      >
        {isLoading
          ? t('auth.logging_in') || 'Iniciando sesión...'
          : t('auth.login_btn') || 'Iniciar sesión'}
      </motion.button>
    </motion.form>
  );
}
