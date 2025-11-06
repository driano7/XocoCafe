import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type ProductCategory = 'beverage' | 'food' | null;

type ProductInfo = {
  id: string;
  productId: string;
  name: string;
  category: string | null;
};

type ProductStat = {
  name: string;
  total: number;
};

type ConsumptionBucket = {
  key: string;
  label: string;
  beverages: ProductStat[];
  foods: ProductStat[];
};

interface ConsumptionResponse {
  success: boolean;
  data: {
    monthly: ConsumptionBucket[];
    yearly: ConsumptionBucket[];
  };
}

const BEVERAGE_CATEGORIES = new Set([
  'bebida',
  'bebidas',
  'drink',
  'drinks',
  'cafe',
  'cafes',
  'coffee',
  'te',
  'té',
  'hot beverage',
  'cold beverage',
]);

const FOOD_CATEGORIES = new Set([
  'alimento',
  'alimentos',
  'food',
  'foods',
  'snack',
  'snacks',
  'postre',
  'postres',
  'dessert',
  'desserts',
  'sandwich',
  'panaderia',
  'bakery',
]);

function normalizeCategory(category: string | null): string | null {
  if (!category) return null;
  return category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function resolveCategory(category: string | null): ProductCategory {
  const normalized = normalizeCategory(category);
  if (!normalized) return null;
  if (BEVERAGE_CATEGORIES.has(normalized)) return 'beverage';
  if (FOOD_CATEGORIES.has(normalized)) return 'food';
  return null;
}

function topEntries(map: Map<string, number>, limit: number): ProductStat[] {
  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });
}

function formatYearLabel(date: Date): string {
  return date.getFullYear().toString();
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token no proporcionado' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, createdAt')
      .eq('userId', decoded.userId)
      .order('createdAt', { ascending: false });

    if (ordersError) {
      throw new Error(ordersError.message);
    }

    if (!orders || orders.length === 0) {
      const payload: ConsumptionResponse = {
        success: true,
        data: { monthly: [], yearly: [] },
      };
      return NextResponse.json(payload);
    }

    const orderIds = orders.map((order) => order.id);

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('orderId, productId, quantity')
      .in('orderId', orderIds);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    if (!items || items.length === 0) {
      const payload: ConsumptionResponse = {
        success: true,
        data: { monthly: [], yearly: [] },
      };
      return NextResponse.json(payload);
    }

    const uniqueProductIds = Array.from(
      new Set(items.map((item) => item.productId).filter(Boolean))
    );

    const productMapById = new Map<string, ProductInfo>();
    const productMapBySlug = new Map<string, ProductInfo>();

    if (uniqueProductIds.length > 0) {
      const { data: productsById, error: productsByIdError } = await supabase
        .from('products')
        .select('id, productId, name, category')
        .in('id', uniqueProductIds);

      if (productsByIdError) {
        throw new Error(productsByIdError.message);
      }

      productsById?.forEach((product) => {
        const info = product as ProductInfo;
        productMapById.set(info.id, info);
      });

      const idsNotFound = uniqueProductIds.filter((id) => !productMapById.has(id));

      if (idsNotFound.length > 0) {
        const { data: productsBySlug, error: productsBySlugError } = await supabase
          .from('products')
          .select('id, productId, name, category')
          .in('productId', idsNotFound);

        if (productsBySlugError) {
          throw new Error(productsBySlugError.message);
        }

        productsBySlug?.forEach((product) => {
          const info = product as ProductInfo;
          productMapBySlug.set(info.productId, info);
        });
      }
    }

    const ordersById = new Map<string, { createdAt: string }>();
    orders.forEach((order) => {
      ordersById.set(order.id, { createdAt: order.createdAt });
    });

    const monthlyBuckets = new Map<
      string,
      {
        date: Date;
        beverages: Map<string, number>;
        foods: Map<string, number>;
      }
    >();

    const yearlyBuckets = new Map<
      string,
      {
        date: Date;
        beverages: Map<string, number>;
        foods: Map<string, number>;
      }
    >();

    for (const item of items) {
      if (!item.orderId || !ordersById.has(item.orderId)) continue;
      const orderInfo = ordersById.get(item.orderId)!;
      const orderDate = new Date(orderInfo.createdAt);
      const productInfo =
        productMapById.get(item.productId) ?? productMapBySlug.get(item.productId);

      if (!productInfo) continue;
      const category = resolveCategory(productInfo.category ?? null);
      if (!category) continue;

      const quantity =
        typeof item.quantity === 'number' ? item.quantity : Number(item.quantity ?? 0);
      if (Number.isNaN(quantity) || quantity <= 0) continue;

      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      const yearKey = orderDate.getFullYear().toString();

      if (!monthlyBuckets.has(monthKey)) {
        monthlyBuckets.set(monthKey, {
          date: new Date(orderDate.getFullYear(), orderDate.getMonth(), 1),
          beverages: new Map(),
          foods: new Map(),
        });
      }

      if (!yearlyBuckets.has(yearKey)) {
        yearlyBuckets.set(yearKey, {
          date: new Date(orderDate.getFullYear(), 0, 1),
          beverages: new Map(),
          foods: new Map(),
        });
      }

      const monthBucket = monthlyBuckets.get(monthKey)!;
      const yearBucket = yearlyBuckets.get(yearKey)!;

      const targetMonthMap = category === 'beverage' ? monthBucket.beverages : monthBucket.foods;
      const targetYearMap = category === 'beverage' ? yearBucket.beverages : yearBucket.foods;

      targetMonthMap.set(productInfo.name, (targetMonthMap.get(productInfo.name) || 0) + quantity);
      targetYearMap.set(productInfo.name, (targetYearMap.get(productInfo.name) || 0) + quantity);
    }

    const monthly: ConsumptionBucket[] = Array.from(monthlyBuckets.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, bucket]) => ({
        key,
        label: formatMonthLabel(bucket.date),
        beverages: topEntries(bucket.beverages, 3),
        foods: topEntries(bucket.foods, 3),
      }));

    const yearly: ConsumptionBucket[] = Array.from(yearlyBuckets.entries())
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([key, bucket]) => ({
        key,
        label: formatYearLabel(bucket.date),
        beverages: topEntries(bucket.beverages, 3),
        foods: topEntries(bucket.foods, 3),
      }));

    const payload: ConsumptionResponse = {
      success: true,
      data: {
        monthly,
        yearly,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error obteniendo consumo del usuario:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
export const dynamic = 'force-dynamic';
