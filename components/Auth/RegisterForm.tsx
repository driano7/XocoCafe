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
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import CountryDropdown from './CountryDropdown';
import { useConversionTracking } from '@/components/Analytics/AnalyticsProvider';
import { encryptWithUserId, generateLocalUserId } from '@/lib/clientEncryption';
import type { AuthSuccessHandler } from '@/components/Auth/types';

interface RegisterFormProps {
  onSuccess: AuthSuccessHandler;
  onError: (message: string | ReactNode) => void;
  onExistingAccount: (email: string) => void;
}

export default function RegisterForm({ onSuccess, onError, onExistingAccount }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { trackSignup, trackFormSubmit } = useConversionTracking();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const countryValue = watch('country');
  const passwordValue = watch('password', '');
  const confirmPasswordValue = watch('confirmPassword', '');

  const passwordCriteria = [
    {
      key: 'special',
      label: 'Caracter permitido (!@#$%^&*)',
      isMet: /[!@#$%^&*]/.test(passwordValue),
    },
    {
      key: 'uppercase',
      label: 'Letra mayúscula',
      isMet: /[A-Z]/.test(passwordValue),
    },
    {
      key: 'number',
      label: 'Número',
      isMet: /\d/.test(passwordValue),
    },
  ];

  const metCriteriaCount = passwordCriteria.filter((criterion) => criterion.isMet).length;
  const firstUnmetCriterionIndex = passwordCriteria.findIndex((criterion) => !criterion.isMet);

  const strengthMeta =
    metCriteriaCount === 3
      ? { label: 'Strong', barClass: 'bg-green-500', textClass: 'text-green-600' }
      : metCriteriaCount === 2
      ? { label: 'Medium', barClass: 'bg-yellow-400', textClass: 'text-yellow-600' }
      : { label: 'Weak', barClass: 'bg-red-500', textClass: 'text-red-600' };

  const passwordsMatch =
    passwordValue.length > 0 &&
    confirmPasswordValue.length > 0 &&
    passwordValue === confirmPasswordValue;

  const passwordTimeline = [
    ...passwordCriteria,
    {
      key: 'match',
      label: 'Contraseñas iguales',
      isMet: passwordsMatch,
      isPending: confirmPasswordValue.length === 0,
    },
  ];

  const getTimelineStepClasses = (
    index: number,
    key: string,
    isMet: boolean,
    isPending?: boolean
  ): string => {
    if (key === 'match') {
      if (isPending) {
        return 'border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300';
      }
      return isMet
        ? 'border-green-500 bg-green-500 text-white'
        : 'border-red-500 bg-red-500 text-white';
    }

    if (isMet) {
      return 'border-green-500 bg-green-500 text-white';
    }

    if (firstUnmetCriterionIndex === index) {
      return 'border-yellow-400 bg-yellow-300 text-yellow-900';
    }

    return 'border-red-500 bg-red-500 text-white';
  };

  const getConnectorClasses = (
    index: number,
    key: string,
    isMet: boolean,
    isPending?: boolean
  ): string => {
    if (index >= passwordTimeline.length - 1) {
      return '';
    }

    if (key === 'match') {
      if (isPending) {
        return 'bg-gray-300 dark:bg-gray-600';
      }
      return isMet ? 'bg-green-500' : 'bg-red-500';
    }

    if (isMet) {
      return 'bg-green-500';
    }

    if (firstUnmetCriterionIndex === index) {
      return 'bg-yellow-300';
    }

    return 'bg-red-500';
  };

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        // Track successful signup
        trackSignup('email');
        trackFormSubmit('register', true);

        // Guardar token en localStorage
        localStorage.setItem('authToken', result.token);

        try {
          const localUserId = generateLocalUserId();
          const { password, confirmPassword, ...formSnapshot } = data;
          void password;
          void confirmPassword;
          const encryptedPayload = await encryptWithUserId(localUserId, {
            endpoint: '/api/auth/register',
            method: 'POST',
            user: result.user,
            token: result.token,
            formData: formSnapshot,
          });

          localStorage.setItem('xocoUserId', localUserId);
          localStorage.setItem('xocoUserData', JSON.stringify(encryptedPayload));
        } catch (storageError) {
          console.error('Error al guardar datos cifrados localmente:', storageError);
        }

        onSuccess(result.token, result.user, { source: 'register' });
      } else {
        // Track failed signup
        trackFormSubmit('register', false);

        if (response.status === 400 && result?.code === 'USER_EXISTS') {
          onExistingAccount(data.email);
          onError(result.message || 'Ya existe una cuenta con este correo.');
        } else {
          onError(result.message || 'No se pudo crear la cuenta. Inténtalo nuevamente.');
        }
      }
    } catch (error) {
      onError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Información básica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Nombre *
          </label>
          <input
            {...register('firstName')}
            type="text"
            id="firstName"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Tu nombre"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Apellido *
          </label>
          <input
            {...register('lastName')}
            type="text"
            id="lastName"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Tu apellido"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email *
        </label>
        <input
          {...register('email')}
          type="email"
          id="email"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          placeholder="tu@email.com"
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Contraseña *
          </label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-2 flex items-center text-sm text-gray-500"
              aria-label="Mostrar u ocultar contraseña"
            >
              {showPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
          <div className="mt-3 space-y-3" aria-live="polite">
            <div className="flex items-center space-x-1" aria-hidden="true">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index < metCriteriaCount
                      ? strengthMeta.barClass
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 text-xs font-semibold">
              <span className={strengthMeta.textClass}>
                Password strength: {strengthMeta.label}
              </span>
            </div>
            <ol
              className="mt-3 flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:gap-0"
              aria-label="Timeline de requisitos de contraseña"
            >
              {passwordTimeline.map((step, index) => (
                <li key={step.key} className="flex items-center sm:flex-1 sm:justify-between">
                  <div className="flex items-center">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-semibold uppercase ${getTimelineStepClasses(
                        index,
                        step.key,
                        step.isMet,
                        'isPending' in step ? step.isPending : undefined
                      )}`}
                    >
                      {step.key === 'match'
                        ? 'isPending' in step && step.isPending
                          ? '?'
                          : step.isMet
                          ? '✔'
                          : '✖'
                        : step.isMet
                        ? '✔'
                        : firstUnmetCriterionIndex === index
                        ? '!'
                        : '✖'}
                    </span>
                    <span className="ml-2 font-semibold text-gray-700 dark:text-gray-200">
                      {step.label}
                    </span>
                  </div>
                  {index < passwordTimeline.length - 1 && (
                    <span
                      className={`ml-4 hidden h-0.5 flex-1 rounded-full sm:flex ${getConnectorClasses(
                        index,
                        step.key,
                        step.isMet,
                        'isPending' in step ? step.isPending : undefined
                      )}`}
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Confirmar Contraseña *
          </label>
          <div className="relative">
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="Repite tu contraseña"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-2 flex items-center text-sm text-gray-500"
              aria-label="Mostrar u ocultar confirmación de contraseña"
            >
              {showConfirmPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
          <div
            className={`mt-3 inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold ${
              confirmPasswordValue.length === 0
                ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                : passwordsMatch
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {confirmPasswordValue.length === 0
              ? 'Confirma tu contraseña'
              : passwordsMatch
              ? 'Las contraseñas son iguales'
              : 'Las contraseñas no coinciden'}
          </div>
        </div>
      </div>

      {/* Información opcional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Teléfono (opcional)
          </label>
          <input
            {...register('phone')}
            type="tel"
            id="phone"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="+1 234 567 8900"
          />
        </div>

        <div>
          <label
            htmlFor="walletAddress"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Wallet EVM (opcional)
          </label>
          <input
            {...register('walletAddress')}
            type="text"
            id="walletAddress"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="0x..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Ciudad (opcional)
          </label>
          <input
            {...register('city')}
            type="text"
            id="city"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Tu ciudad"
          />
        </div>

        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            País (opcional)
          </label>
          <CountryDropdown
            value={countryValue || ''}
            onChange={(value) => setValue('country', value)}
            error={errors.country?.message}
            inputId="country"
          />
        </div>
      </div>

      {/* Consentimientos GDPR */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Términos y Condiciones
        </h3>

        <div className="space-y-3">
          <div className="flex items-start">
            <input
              {...register('termsAndPrivacyAccepted')}
              type="checkbox"
              id="termsAndPrivacyAccepted"
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="termsAndPrivacyAccepted"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              Acepto los{' '}
              <a href="/terms" className="text-blue-600 hover:text-blue-500 underline">
                términos y condiciones
              </a>{' '}
              y la{' '}
              <a href="/privacy" className="text-blue-600 hover:text-blue-500 underline">
                política de privacidad
              </a>{' '}
              *
            </label>
          </div>
          {errors.termsAndPrivacyAccepted && (
            <p className="text-sm text-red-600">{errors.termsAndPrivacyAccepted.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Preferencias de Marketing (opcional)
          </h4>

          <div className="flex items-start">
            <input
              {...register('marketingEmail')}
              type="checkbox"
              id="marketingEmail"
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="marketingEmail"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              Recibir ofertas por email
            </label>
          </div>

          <div className="flex items-start">
            <input
              {...register('marketingPush')}
              type="checkbox"
              id="marketingPush"
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="marketingPush"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              Recibir notificaciones push
            </label>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
      </button>
    </form>
  );
}
