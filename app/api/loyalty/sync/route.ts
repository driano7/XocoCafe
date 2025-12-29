import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const MAX_STAMPS = Number(process.env.NEXT_PUBLIC_LOYALTY_TARGET ?? 7);
const LOYALTY_ELIGIBLE_PRODUCTS = (
  process.env.LOYALTY_ELIGIBLE_PRODUCTS ?? 'beverage-cafe-mexicano'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const ORDER_TIMEZONE = process.env.LOYALTY_TIMEZONE ?? 'America/Mexico_City';
const COMPLETION_DELAY_MINUTES = Number(process.env.LOYALTY_COMPLETION_DELAY_MINUTES ?? '60');
const COMPLETION_DELAY_MS = Math.max(COMPLETION_DELAY_MINUTES, 0) * 60_000;

const SYNC_KEY = process.env.LOYALTY_SYNC_KEY;

const getStartOfWeek = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = (day + 6) % 7; // lunes
  start.setDate(start.getDate() - diff);
  return start;
};

const formatDayKey = (value?: string | null) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ORDER_TIMEZONE,
    }).format(date);
  } catch {
    return null;
  }
};

type LoyaltyOrderItem = {
  productId?: string | null;
};

type LoyaltyOrderRow = {
  items?: LoyaltyOrderItem[] | null;
  status?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

const calculateEligiblePunches = (orders: LoyaltyOrderRow[]) => {
  const now = Date.now();
  const eligibleDays = new Set<string>();

  for (const order of orders) {
    if ((order.status ?? '').toLowerCase() !== 'completed') {
      continue;
    }
    const updatedAt = order.updatedAt ? new Date(order.updatedAt) : null;
    if (!updatedAt || Number.isNaN(updatedAt.getTime())) {
      continue;
    }
    if (now - updatedAt.getTime() < COMPLETION_DELAY_MS) {
      continue;
    }
    const items = Array.isArray(order.items) ? order.items : [];
    const hasEligibleProduct = items.some((item) => {
      const productId = typeof item?.productId === 'string' ? item.productId : null;
      return Boolean(productId && LOYALTY_ELIGIBLE_PRODUCTS.includes(productId));
    });
    if (!hasEligibleProduct) {
      continue;
    }
    const key = formatDayKey(order.createdAt ?? order.updatedAt);
    if (key) {
      eligibleDays.add(key);
    }
  }

  return eligibleDays.size;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  if (!SYNC_KEY) {
    return NextResponse.json(
      {
        success: false,
        message: 'Falta configurar LOYALTY_SYNC_KEY en el entorno del servidor.',
      },
      { status: 500 }
    );
  }

  const providedKey =
    request.headers.get('x-loyalty-sync-key') ?? request.headers.get('authorization');

  if (!providedKey || providedKey.replace(/^Bearer\s+/i, '') !== SYNC_KEY) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
  }

  const startOfWeek = getStartOfWeek();
  const startOfWeekIso = startOfWeek.toISOString();
  const summary: {
    processed: number;
    updated: number;
    skipped: number;
    errors: Array<{ userId: string; message: string }>;
  } = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id,weeklyCoffeeCount')
    .not('clientId', 'is', null);

  if (usersError) {
    return NextResponse.json(
      { success: false, message: usersError.message ?? 'No pudimos consultar usuarios.' },
      { status: 500 }
    );
  }

  for (const user of users ?? []) {
    summary.processed += 1;
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id,createdAt,updatedAt,status,items:order_items(productId,quantity)')
      .eq('userId', user.id)
      .gte('createdAt', startOfWeekIso);

    if (ordersError) {
      summary.errors.push({
        userId: user.id,
        message: ordersError.message ?? 'No pudimos recuperar pedidos.',
      });
      summary.skipped += 1;
      continue;
    }

    const eligibleCount = Math.min(
      calculateEligiblePunches(orders ?? []),
      Number.isFinite(MAX_STAMPS) ? MAX_STAMPS : 7
    );
    const previousCount = Math.max(0, user.weeklyCoffeeCount ?? 0);

    if (eligibleCount === previousCount) {
      summary.skipped += 1;
      continue;
    }

    const updatedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('users')
      .update({ weeklyCoffeeCount: eligibleCount, updatedAt })
      .eq('id', user.id);

    if (updateError) {
      summary.errors.push({
        userId: user.id,
        message: updateError.message ?? 'No pudimos actualizar weeklyCoffeeCount.',
      });
      summary.skipped += 1;
      continue;
    }

    summary.updated += 1;
  }

  return NextResponse.json({
    success: true,
    startOfWeek: startOfWeekIso,
    ...summary,
  });
}
