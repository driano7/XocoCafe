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

interface LoyaltyActivationPromptProps {
  coffeeCount?: number | null;
  onActivate: () => void;
}

export default function LoyaltyActivationPrompt({
  coffeeCount = 0,
  onActivate,
}: LoyaltyActivationPromptProps) {
  return (
    <div className="mb-6 w-full max-w-3xl rounded-3xl border border-amber-200 bg-amber-50/90 p-6 text-amber-900 shadow-lg ring-1 ring-amber-100 dark:border-amber-400/40 dark:bg-[#2b1604] dark:text-amber-50 dark:ring-amber-500/20 sm:mx-auto">
      <p className="text-xs uppercase tracking-[0.35em] text-amber-600 dark:text-amber-300">
        Programa de lealtad
      </p>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-2xl font-semibold">Activa tu programa de lealtad</h3>
          <p className="mt-1 text-sm">
            Acumula cafés cada vez que ordenes. Lleva <strong>{coffeeCount ?? 0}</strong> de 7
            bebidas selladas esta semana.
          </p>
        </div>
        <button
          type="button"
          onClick={onActivate}
          className="inline-flex items-center justify-center rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 dark:focus:ring-offset-[#2b1604]"
        >
          Activar ahora
        </button>
      </div>
    </div>
  );
}
