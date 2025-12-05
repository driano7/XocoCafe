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

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './Auth/AuthProvider';

interface LoyaltyFlipCardProps {
  className?: string;
}

interface CoffeeCountResult {
  success: boolean;
  data: {
    weeklyCoffeeCount: number;
    rewardEarned?: boolean;
    message?: string | null;
  };
}

const MAX_STAMPS = 7;

export default function LoyaltyFlipCard({ className = '' }: LoyaltyFlipCardProps) {
  const { user, token } = useAuth();
  const [coffeeCount, setCoffeeCount] = useState(0);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.weeklyCoffeeCount !== undefined) {
      setCoffeeCount(user.weeklyCoffeeCount);
    }
  }, [user]);

  const fetchCoffeeCount = useCallback(async () => {
    if (!token) return;
    setLoyaltyError(null);
    try {
      const response = await fetch('/api/user/coffee-count', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });
      const payload = (await response.json()) as CoffeeCountResult;
      if (!payload?.success) {
        throw new Error(payload?.data?.message || 'No pudimos obtener tu progreso.');
      }
      if (typeof payload.data?.weeklyCoffeeCount === 'number') {
        const normalized = Math.max(0, Math.min(MAX_STAMPS, payload.data.weeklyCoffeeCount));
        setCoffeeCount(normalized);
      }
    } catch (error) {
      console.error('Error cargando contador de cafés:', error);
      setLoyaltyError('No pudimos cargar tu progreso de lealtad. Intenta más tarde.');
    }
  }, [token]);

  useEffect(() => {
    void fetchCoffeeCount();
  }, [fetchCoffeeCount]);

  return (
    <div className={`relative ${className}`}>
      <div className="flex h-full w-full flex-col items-center rounded-2xl bg-gradient-to-br from-[#5c3025] via-[#7d4a30] to-[#b46f3c] p-6 text-white shadow-xl">
        <h3 className="mb-6 text-xl font-semibold uppercase tracking-widest">
          Programa de lealtad
        </h3>
        <p className="text-xs uppercase tracking-[0.35em] text-white/80">Sellos acumulados</p>
        <p className="mb-4 mt-1 text-4xl font-bold text-white">
          {coffeeCount}
          <span className="ml-1 text-base font-semibold text-white/80">/ {MAX_STAMPS}</span>
        </p>

        <div className="mb-5 grid grid-cols-7 gap-3">
          {Array.from({ length: MAX_STAMPS }, (_, index) => {
            const isFilled = index < coffeeCount;
            return (
              <div
                key={index}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/70 text-sm font-semibold ${
                  isFilled
                    ? 'bg-white text-[#5c3025] shadow-lg'
                    : 'bg-white/10 text-white opacity-80'
                }`}
                aria-label={`Sello ${index + 1} ${isFilled ? 'completo' : 'pendiente'}`}
              >
                {isFilled ? '☕' : index + 1}
              </div>
            );
          })}
        </div>

        <div className="text-center text-sm">
          <p className="font-semibold">
            {[user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
              user?.email ||
              'Cliente'}
          </p>
          <p className="text-xs opacity-80">{user?.clientId || 'ID pendiente'}</p>
          <p className="mt-2 text-[11px] opacity-70">
            {coffeeCount >= MAX_STAMPS
              ? 'Canjea tu bebida gratis mostrando este código en barra.'
              : `Te faltan ${Math.max(0, MAX_STAMPS - coffeeCount)} sellos para tu bebida gratis.`}
          </p>
        </div>

        <p className="mt-5 text-xs uppercase tracking-widest opacity-80">
          Tus sellos se actualizan automáticamente al cerrar un pedido.
        </p>
      </div>

      {loyaltyError && (
        <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">{loyaltyError}</p>
      )}
    </div>
  );
}
