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
