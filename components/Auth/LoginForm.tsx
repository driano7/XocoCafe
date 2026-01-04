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

import { ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { useConversionTracking } from '@/components/Analytics/AnalyticsProvider';
import type { AuthSuccessHandler } from '@/components/Auth/types';

interface LoginFormProps {
  onSuccess: AuthSuccessHandler;
  onError: (message: string | ReactNode) => void;
  onForgotPassword?: () => void;
}

export default function LoginForm({ onSuccess, onError, onForgotPassword }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { trackLogin, trackFormSubmit } = useConversionTracking();
  void onForgotPassword;
  const inputClasses = 'brand-input';

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
      onError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold tracking-wide text-primary-900 dark:text-primary-100"
        >
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          id="email"
          className={inputClasses}
          placeholder="tu@email.com"
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold tracking-wide text-primary-900 dark:text-primary-100"
        >
          Contraseña
        </label>
        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            id="password"
            className={inputClasses}
            placeholder="Tu contraseña"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 hover:text-primary-500 dark:text-primary-200"
            aria-label="Mostrar u ocultar contraseña"
          >
            {showPassword ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
      </div>

      <button type="submit" disabled={isLoading} className="brand-primary-btn">
        {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
