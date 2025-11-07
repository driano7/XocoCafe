'use client';

import { useAuth } from '@/components/Auth/AuthProvider';
import Link from 'next/link';

export default function AuthNav() {
  const { user, logout } = useAuth();

  if (user) {
    const displayName = user.firstName?.trim() || '';
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Hola, {displayName || user.email}
        </span>
        <Link
          href="/profile"
          className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          Mi Perfil
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-sm text-red-600 hover:text-red-500 dark:text-red-400"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
        Iniciar Sesión
      </Link>
    </div>
  );
}
