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

    (data ?? []).forEach((item) => {
      const order = (item as any).orders;
      if (!order) return;
      const createdAt = new Date(order.createdAt);
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      const yearKey = `${createdAt.getFullYear()}`;
      const category = item.productId?.toLowerCase().includes('food') ? 'food' : 'beverage';
      const targetMap = (map: Map<string, any>, key: string, period: 'month' | 'year') => {
        if (!map.has(key)) {
          map.set(key, {
            key,
            label: buildBucketLabel(createdAt, period === 'month' ? 'month' : 'year'),
            beverages: new Map<string, number>(),
            foods: new Map<string, number>(),
          });
        }
        const bucket = map.get(key);
        const target = category === 'food' ? bucket.foods : bucket.beverages;
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
