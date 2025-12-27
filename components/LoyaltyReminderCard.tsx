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

interface LoyaltyReminderCardProps {
  onActivate: () => void | Promise<void>;
  className?: string;
  isLoading?: boolean;
}

export default function LoyaltyReminderCard({
  onActivate,
  className = '',
  isLoading = false,
}: LoyaltyReminderCardProps) {
  return (
    <div
      className={`rounded-2xl border border-primary-200 bg-primary-50/80 p-4 text-sm text-primary-900 shadow-sm dark:border-primary-800/40 dark:bg-primary-950/40 dark:text-primary-100 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">
            Programa de lealtad
          </p>
          <p className="text-base font-semibold text-primary-900 dark:text-primary-50">
            Activa tus sellos y canjea cafés sin costo
          </p>
          <p className="text-xs text-primary-800 dark:text-primary-200">
            Solo toma un minuto conectar tu cuenta al programa. Después, seguimos tu saldo de manera
            automática.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void onActivate();
          }}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-full bg-primary-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white shadow transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-400"
        >
          {isLoading ? 'Activando...' : 'Tarjeta de lealtad'}
        </button>
      </div>
    </div>
  );
}
