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

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiCalendar, FiMapPin, FiPackage } from 'react-icons/fi';
import { useAuth } from '@/components/Auth/AuthProvider';
import UserProfile from '@/components/Auth/UserProfile';
import CoffeeBackground from '@/components/CoffeeBackground';

import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const openAddressQuickAction = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.dispatchEvent(new CustomEvent('profile-open-addresses'));
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <CoffeeBackground className="py-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="mx-auto min-h-[70vh] max-w-6xl rounded-[32px] bg-white/95 shadow-2xl shadow-black/20 dark:bg-gray-950/80 overflow-hidden"
      >
        <div className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mi Cuenta</h1>
              <div className="flex flex-wrap gap-3 sm:flex-nowrap">
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Volver al Inicio
                </button>
                <button
                  onClick={logout}
                  className="flex-1 rounded-md bg-red-600 px-4 py-2 text-center text-white hover:bg-red-700"
                >
                  Cerrar Sesión
                </button>
              </div>
              <div className="flex w-full gap-3 sm:hidden">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/pedidos')}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white/60 px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <span className="flex items-center justify-center gap-2">
                    <FiPackage className="text-lg" />
                    Pedidos
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/reserve')}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white/60 px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <span className="flex items-center justify-center gap-2">
                    <FiCalendar className="text-lg" />
                    Reservas
                  </span>
                </button>
                <button
                  type="button"
                  onClick={openAddressQuickAction}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white/60 px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <span className="flex items-center justify-center gap-2">
                    <FiMapPin className="text-lg" />
                    Direcciones
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="py-8">
          <UserProfile />
        </div>
      </motion.div>
    </CoffeeBackground>
  );
}
