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

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function buildBucketLabel(date: Date, period: 'month' | 'year') {
  const options =
    period === 'month'
      ? ({ year: 'numeric', month: 'long' } as const)
      : ({ year: 'numeric' } as const);
  return date.toLocaleDateString('es-MX', options);
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('order_items')
      .select('quantity,price,createdAt,productId,orders!inner(userId,createdAt,total)')
      .eq('orders.userId', decoded.userId)
      .order('createdAt', { ascending: false })
      .limit(500);

    if (error) {
      throw new Error(error.message);
    }

    const monthlyMap = new Map<string, any>();
    const yearlyMap = new Map<string, any>();

    const detectCategory = (record: any): 'beverage' | 'food' | 'package' => {
      const rawValues = [record.category, record.productId]
        .filter(Boolean)
        .map((value: string) => value.toLowerCase());
      const matches = (needle: string) => rawValues.some((value) => value.includes(needle));
      if (matches('package') || matches('paquete')) {
        return 'package';
      }
      if (matches('food') || matches('alimento') || matches('comida')) {
        return 'food';
      }
      if (matches('bebida') || matches('drink') || matches('coffee') || matches('cafe')) {
        return 'beverage';
      }
      return 'beverage';
    };

    (data ?? []).forEach((item) => {
      const order = (item as any).orders;
      if (!order) return;
      const createdAt = new Date(order.createdAt);
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      const yearKey = `${createdAt.getFullYear()}`;
      const category = detectCategory(item);
      const targetMap = (map: Map<string, any>, key: string, period: 'month' | 'year') => {
        if (!map.has(key)) {
          map.set(key, {
            key,
            label: buildBucketLabel(createdAt, period === 'month' ? 'month' : 'year'),
            beverages: new Map<string, number>(),
            foods: new Map<string, number>(),
            packages: new Map<string, number>(),
          });
        }
        const bucket = map.get(key);
        const target =
          category === 'food'
            ? bucket.foods
            : category === 'package'
            ? bucket.packages
            : bucket.beverages;
        const current = target.get(item.productId) ?? 0;
        target.set(item.productId, current + item.quantity);
      };

      targetMap(monthlyMap, monthKey, 'month');
      targetMap(yearlyMap, yearKey, 'year');
    });

    const mapToArray = (map: Map<string, any>) =>
      Array.from(map.values()).map((bucket) => {
        const beverageEntries = Array.from(bucket.beverages.entries()) as Array<[string, number]>;
        const foodEntries = Array.from(bucket.foods.entries()) as Array<[string, number]>;
        const packageEntries = Array.from(bucket.packages.entries()) as Array<[string, number]>;
        return {
          key: bucket.key,
          label: bucket.label,
          beverages: beverageEntries
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5),
          foods: foodEntries
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5),
          packages: packageEntries
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5),
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        monthly: mapToArray(monthlyMap),
        yearly: mapToArray(yearlyMap),
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo consumo:', error);
    return NextResponse.json(
      { success: false, message: 'No pudimos cargar tu consumo' },
      { status: 500 }
    );
  }
}
