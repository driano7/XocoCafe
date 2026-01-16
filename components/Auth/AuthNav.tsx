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

import { useAuth } from '@/components/Auth/AuthProvider';
import { useLanguage } from '@/components/Language/LanguageProvider';
import TranslatedText from '@/components/Language/TranslatedText';
import Link from 'next/link';

export default function AuthNav() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  if (user) {
    const displayName = user.firstName?.trim() || '';
    return (
      <div className="flex items-center space-x-4">
        <span className="hidden text-sm text-gray-600 dark:text-gray-300 sm:block">
          {t('nav.hola')}, {displayName || user.email}
        </span>
        <Link
          href="/profile"
          className="text-sm font-semibold text-primary-700 transition-colors hover:text-primary-600 dark:text-primary-200 dark:hover:text-primary-100"
        >
          <TranslatedText tid="nav.mi_perfil" fallback="Mi Perfil" />
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-sm text-red-600 hover:text-red-500 dark:text-red-400"
        >
          <TranslatedText tid="nav.cerrar_sesion" fallback="Cerrar Sesión" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <Link
        href="/login"
        className="group relative inline-flex overflow-hidden rounded-full border border-primary-700 px-4 py-1.5 text-sm font-semibold text-primary-700 transition-colors duration-300 hover:text-primary-600 dark:border-primary-200 dark:text-primary-100"
      >
        <span className="absolute inset-0 scale-0 rounded-full bg-current opacity-10 transition-transform duration-300 group-hover:scale-100" />
        <span className="relative">
          <TranslatedText tid="nav.iniciar_sesion" fallback="Iniciar Sesión" />
        </span>
      </Link>
    </div>
  );
}
