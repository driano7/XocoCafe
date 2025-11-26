'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useAuth } from '@/components/Auth/AuthProvider';
import { userFeedbackSchema, type UserFeedbackInput } from '@/lib/validations/auth';

interface ShareExperienceFormProps {
  layout?: 'card' | 'modal';
  onSubmitted?: () => void;
  className?: string;
}

export default function ShareExperienceForm({
  layout = 'card',
  onSubmitted,
  className,
}: ShareExperienceFormProps) {
  const { token } = useAuth();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFeedbackInput>({
    resolver: zodResolver(userFeedbackSchema),
    defaultValues: {
      rating: 5,
      title: '',
      content: '',
    },
  });

  const submitFeedback = async (data: UserFeedbackInput) => {
    if (!token) {
      setFeedbackMessage('Inicia sesión para compartir tu experiencia.');
      return;
    }

    setIsSendingFeedback(true);
    setFeedbackMessage(null);
    try {
      const response = await fetch('/api/user/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        setFeedbackMessage(result.message || '¡Gracias por tu comentario!');
        reset({ rating: 5, title: '', content: '' });
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
