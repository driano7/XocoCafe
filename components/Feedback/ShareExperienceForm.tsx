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

import { useEffect, useMemo, useState } from 'react';
import { Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useAuth } from '@/components/Auth/AuthProvider';
import { userFeedbackSchema, type UserFeedbackInput } from '@/lib/validations/auth';

interface ShareExperienceFormProps {
  layout?: 'card' | 'modal';
  onSubmitted?: () => void;
  className?: string;
  showNameField?: boolean;
  allowAnonymous?: boolean;
}

export default function ShareExperienceForm({
  layout = 'card',
  onSubmitted,
  className,
  showNameField = false,
  allowAnonymous = false,
}: ShareExperienceFormProps) {
  const { token, user } = useAuth();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = useForm<UserFeedbackInput>({
    resolver: zodResolver(userFeedbackSchema) as Resolver<UserFeedbackInput>,
    defaultValues: {
      rating: 5,
      title: '',
      content: '',
      name: '',
    },
  });
  const userFullName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim(),
    [user]
  );
  const watchName = watch('name');
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    if (!showNameField) {
      return;
    }
    if (isAnonymous) {
      setValue('name', '');
      return;
    }
    if (userFullName && !watchName) {
      setValue('name', userFullName);
    }
  }, [showNameField, userFullName, watchName, setValue, isAnonymous]);

  const submitFeedback = async (data: UserFeedbackInput) => {
    const resolvedName = isAnonymous
      ? null
      : data.name || (userFullName ? userFullName : undefined);

    if (!token && !resolvedName) {
      setFeedbackMessage(
        allowAnonymous
          ? 'Agrega tu nombre para compartir tu experiencia.'
          : 'Inicia sesión o agrega tu nombre para compartir tu experiencia.'
      );
      return;
    }

    setIsSendingFeedback(true);
    setFeedbackMessage(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/user/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rating: data.rating,
          title: data.title,
          content: data.content,
          name: resolvedName,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setFeedbackMessage(result.message || '¡Gracias por tu comentario!');
        reset({
          rating: 5,
          title: '',
          content: '',
          name: userFullName,
        });
        onSubmitted?.();
      } else {
        setFeedbackMessage(result.message || 'No pudimos guardar tu comentario. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error enviando comentario:', error);
      setFeedbackMessage('Error enviando tu comentario. Intenta de nuevo.');
    } finally {
      setIsSendingFeedback(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(submitFeedback)}
      className={clsx('space-y-4', className, layout === 'modal' && 'mt-4')}
    >
      {feedbackMessage && (
        <div
          className={clsx(
            'mb-1 rounded-md px-4 py-3 text-sm',
            feedbackMessage.toLowerCase().includes('error') ||
              feedbackMessage.toLowerCase().includes('no ')
              ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200'
              : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200'
          )}
        >
          {feedbackMessage}
        </div>
      )}

      <div>
        <label
          htmlFor={`${layout}-feedback-rating`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Calificación
        </label>
        <select
          id={`${layout}-feedback-rating`}
          {...register('rating', { valueAsNumber: true })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} {value === 1 ? 'estrella' : 'estrellas'}
            </option>
          ))}
        </select>
        {errors.rating && <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>}
      </div>

      {showNameField && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor={`${layout}-feedback-name`}
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Nombre{' '}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                (opcional)
              </span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(event) => setIsAnonymous(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-500"
              />
              Anónimo
            </label>
          </div>
          <input
            id={`${layout}-feedback-name`}
            type="text"
            maxLength={80}
            {...register('name')}
            disabled={isAnonymous}
            className={clsx(
              'mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white',
              isAnonymous
                ? 'border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500'
                : 'border-gray-300 text-gray-900 dark:border-gray-600'
            )}
            placeholder="Tu nombre completo"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
      )}

      <div>
        <label
          htmlFor={`${layout}-feedback-title`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Título (opcional)
        </label>
        <input
          id={`${layout}-feedback-title`}
          type="text"
          maxLength={120}
          {...register('title')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Ej. Servicio excelente"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label
          htmlFor={`${layout}-feedback-content`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Comentario
        </label>
        <textarea
          id={`${layout}-feedback-content`}
          rows={layout === 'modal' ? 5 : 4}
          {...register('content')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Cuéntanos tu experiencia o sugerencia..."
        />
        {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSendingFeedback}
        className="inline-flex w-full items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSendingFeedback ? 'Enviando...' : 'Enviar comentario'}
      </button>
    </form>
  );
}
