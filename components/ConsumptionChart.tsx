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

import { useEffect, useId, useMemo, useState } from 'react';
import { useAuth } from '@/components/Auth/AuthProvider';

interface ProductStat {
  name: string;
  total: number;
}

interface ConsumptionBucket {
  key: string;
  label: string;
  beverages: ProductStat[];
  foods: ProductStat[];
  packages: ProductStat[];
}

interface ConsumptionPayload {
  monthly: ConsumptionBucket[];
  yearly: ConsumptionBucket[];
}

interface ConsumptionResponse {
  success: boolean;
  data?: ConsumptionPayload;
  message?: string;
}

const BEVERAGE_COLOR = '#5c3025';
const FOOD_COLOR = '#b46f3c';
const PACKAGE_COLOR = '#b45309';
const CARD_BG = '#f8f1e4';

type Period = 'monthly' | 'yearly';

function buildBars(bucket: ConsumptionBucket) {
  const beverages = bucket.beverages.map((item) => ({
    ...item,
    type: 'beverage' as const,
  }));
  const foods = bucket.foods.map((item) => ({
    ...item,
    type: 'food' as const,
  }));
  const packages = bucket.packages.map((item) => ({
    ...item,
    type: 'package' as const,
  }));
  const combined = [...beverages, ...foods, ...packages];
  return combined.sort((a, b) => b.total - a.total).slice(0, 5);
}

export default function ConsumptionChart() {
  const { token } = useAuth();
  const [data, setData] = useState<ConsumptionPayload | null>(null);
  const [period, setPeriod] = useState<Period>('monthly');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/consumption', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        const result = (await response.json()) as ConsumptionResponse;
        if (!result.success || !result.data) {
          setError(result.message || 'No se pudo cargar el consumo.');
          setData(null);
          return;
        }
        setData(result.data);
        const firstMonthly = result.data.monthly[0]?.key;
        const firstYearly = result.data.yearly[0]?.key;
        setSelectedKey(firstMonthly || firstYearly || '');
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Error cargando el consumo del usuario.');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [token]);

  const buckets = useMemo(() => {
    if (!data) return [] as ConsumptionBucket[];
    return period === 'monthly' ? data.monthly : data.yearly;
  }, [data, period]);

  useEffect(() => {
    if (!buckets.length) return;
    if (!buckets.some((bucket) => bucket.key === selectedKey)) {
      setSelectedKey(buckets[0].key);
    }
  }, [buckets, selectedKey]);

  const currentBucket = buckets.find((bucket) => bucket.key === selectedKey);
  const periodToggleId = useId();
  const periodIds = {
    monthly: `${periodToggleId}-monthly`,
    yearly: `${periodToggleId}-yearly`,
  };

  const bars = useMemo(() => {
    if (!currentBucket)
      return [] as Array<{ name: string; total: number; type: 'beverage' | 'food' | 'package' }>;
    return buildBars(currentBucket);
  }, [currentBucket]);

  const maxTotal = useMemo(() => {
    return bars.reduce((max, bar) => (bar.total > max ? bar.total : max), 0);
  }, [bars]);

  return (
    <div className="rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Consumo de favoritos
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Bebidas, alimentos y paquetes más pedidos según tu historial.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              id={periodIds.monthly}
              type="radio"
              name="consumption-period"
              value="monthly"
              checked={period === 'monthly'}
              onChange={() => setPeriod('monthly')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={periodIds.monthly}>Mensual</label>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              id={periodIds.yearly}
              type="radio"
              name="consumption-period"
              value="yearly"
              checked={period === 'yearly'}
              onChange={() => setPeriod('yearly')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={periodIds.yearly}>Anual</label>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <select
          value={selectedKey}
          onChange={(event) => setSelectedKey(event.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          {buckets.map((bucket) => (
            <option key={bucket.key} value={bucket.key}>
              {bucket.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: BEVERAGE_COLOR }} />
          Bebidas
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: FOOD_COLOR }} />
          Alimentos
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PACKAGE_COLOR }} />
          Paquetes
        </div>
      </div>

      <div className="mt-6 min-h-[220px]">
        {isLoading ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">Cargando gráfico…</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : !currentBucket || bars.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Aún no tenemos suficientes compras para mostrar un gráfico.
          </p>
        ) : (
          <div className="flex items-end gap-4 overflow-x-auto py-2">
            {bars.map((bar) => {
              const percentage = maxTotal === 0 ? 0 : Math.round((bar.total / maxTotal) * 100);
              const height = `${Math.max(percentage, 6)}%`;
              const color =
                bar.type === 'beverage'
                  ? BEVERAGE_COLOR
                  : bar.type === 'food'
                  ? FOOD_COLOR
                  : PACKAGE_COLOR;
              const background =
                bar.type === 'beverage' ? CARD_BG : bar.type === 'food' ? '#f3ded0' : '#fee2c5';
              return (
                <div
                  key={`${bar.type}-${bar.name}`}
                  className="flex min-w-[64px] flex-1 flex-col items-center"
                >
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {bar.total}
                  </span>
                  <div className="relative mt-2 flex h-48 w-12 items-end rounded-b-md bg-gray-100 dark:bg-gray-700">
                    <div
                      className="w-full rounded-t-md"
                      style={{
                        background: `linear-gradient(180deg, ${color} 0%, ${color} 70%, ${background} 100%)`,
                        height,
                        transition: 'height 0.4s ease',
                      }}
                    />
                  </div>
                  <span className="mt-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                    {bar.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {bar.type === 'beverage'
                      ? 'Bebida'
                      : bar.type === 'food'
                      ? 'Alimento'
                      : 'Paquete'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
