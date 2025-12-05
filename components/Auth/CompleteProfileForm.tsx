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

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { completeProfileSchema, type CompleteProfileInput } from '@/lib/validations/auth';
import CountryDropdown from './CountryDropdown';

interface CompleteProfileFormProps {
  onComplete: (data: CompleteProfileInput) => void;
  onSkip: () => void;
  userEmail: string;
}

export default function CompleteProfileForm({
  onComplete,
  onSkip,
  userEmail,
}: CompleteProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
  });

  const countryValue = watch('country');

  const onSubmit = async (data: CompleteProfileInput) => {
    setIsLoading(true);
    try {
      await onComplete(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Completa tu Perfil
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Hola! Completa algunos datos adicionales para tu cuenta en Xoco Café
          </p>
          <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-500">
            Registrado como: {userEmail}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow rounded-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onSkip}
                className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Omitir
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Completando...' : 'Completar Perfil'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
