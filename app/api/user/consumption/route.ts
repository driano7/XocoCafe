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

type ProductAggregate = {
  name: string;
  total: number;
};

type ConsumptionBucket = {
  key: string;
  label: string;
  beverages: Map<string, ProductAggregate>;
  foods: Map<string, ProductAggregate>;
  packages: Map<string, ProductAggregate>;
};

type OrderItemRecord = {
  quantity?: number | null;
  price?: number | null;
  createdAt?: string;
  productId?: string | null;
  category?: string | null;
  name?: string | null;
  productName?: string | null;
  displayName?: string | null;
  title?: string | null;
  orders?:
    | {
        userId: string;
        createdAt: string;
        total: number | null;
      }
    | {
        userId: string;
        createdAt: string;
        total: number | null;
      }[]
    | null;
};

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
      .select(
        `
        quantity,
        price,
        createdAt,
        productId,
        orders!inner(userId,createdAt,total)
      `
      )
      .eq('orders.userId', decoded.userId)
      .order('createdAt', { ascending: false })
      .limit(500);

    if (error) {
      throw new Error(error.message);
    }

    const monthlyMap = new Map<string, ConsumptionBucket>();
    const yearlyMap = new Map<string, ConsumptionBucket>();

    const detectCategory = (record: OrderItemRecord): 'beverage' | 'food' | 'package' => {
      const rawValues = [record.category, record.productId, record.name, record.productName]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

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

    (data ?? []).forEach((itemRaw) => {
      const item = itemRaw as OrderItemRecord;
      const orderArray = Array.isArray(item.orders)
        ? item.orders
        : item.orders
        ? [item.orders]
        : [];
      const order = orderArray[0];
      if (!order) return;

      const createdAt = new Date(order.createdAt);
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      const yearKey = `${createdAt.getFullYear()}`;
      const category = detectCategory(item);

      const applyToMap = (
        map: Map<string, ConsumptionBucket>,
        key: string,
        period: 'month' | 'year'
      ) => {
        if (!map.has(key)) {
          map.set(key, {
            key,
            label: buildBucketLabel(createdAt, period === 'month' ? 'month' : 'year'),
            beverages: new Map<string, ProductAggregate>(),
            foods: new Map<string, ProductAggregate>(),
            packages: new Map<string, ProductAggregate>(),
          });
        }

        const bucket = map.get(key)!;
        const targetMap =
          category === 'food'
            ? bucket.foods
            : category === 'package'
            ? bucket.packages
            : bucket.beverages;

        const productKey = item.productId ?? item.name ?? item.productName ?? 'producto';
        const displayName =
          item.name ??
          item.productName ??
          item.displayName ??
          item.title ??
          item.productId ??
          'Producto';

        const current = targetMap.get(productKey) ?? { total: 0, name: displayName };

        targetMap.set(productKey, {
          name: displayName,
          total: current.total + Number(item.quantity ?? 0),
        });
      };

      applyToMap(monthlyMap, monthKey, 'month');
      applyToMap(yearlyMap, yearKey, 'year');
    });

    const mapToArray = (map: Map<string, ConsumptionBucket>) =>
      Array.from(map.values()).map((bucket) => {
        const beverageEntries = Array.from(bucket.beverages.entries()) as Array<
          [string, ProductAggregate]
        >;
        const foodEntries = Array.from(bucket.foods.entries()) as Array<[string, ProductAggregate]>;
        const packageEntries = Array.from(bucket.packages.entries()) as Array<
          [string, ProductAggregate]
        >;

        return {
          key: bucket.key,
          label: bucket.label,
          beverages: beverageEntries
            .map(([, value]) => ({ name: value.name, total: value.total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5),
          foods: foodEntries
            .map(([, value]) => ({ name: value.name, total: value.total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5),
          packages: packageEntries
            .map(([, value]) => ({ name: value.name, total: value.total }))
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
  } catch (error: unknown) {
    console.error('Error obteniendo consumo:', error);
    return NextResponse.json(
      { success: false, message: 'No pudimos cargar tu consumo' },
      { status: 500 }
    );
  }
}
