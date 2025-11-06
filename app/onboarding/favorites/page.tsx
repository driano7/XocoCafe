'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FavoritesSelect from '@/components/FavoritesSelect';
import { useAuth } from '@/components/Auth/AuthProvider';

export default function FavoriteOnboardingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg bg-white p-8 shadow dark:bg-gray-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            ¡Personaliza tu experiencia!
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Como último paso opcional, selecciona tu bebida y alimento favorito del menú. Podrás
            modificarlos más adelante desde tu perfil.
          </p>

          <FavoritesSelect
            onUpdate={() => {
              router.replace('/profile');
            }}
          />

          <div className="mt-6 text-right">
            <button
              type="button"
              onClick={() => router.replace('/profile')}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Omitir por ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
