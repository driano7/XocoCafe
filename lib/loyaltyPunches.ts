const LOYALTY_ELIGIBLE_PRODUCTS = (
  process.env.LOYALTY_ELIGIBLE_PRODUCTS ?? 'beverage-cafe-mexicano'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const ORDER_TIMEZONE = process.env.LOYALTY_TIMEZONE ?? 'America/Mexico_City';
const COMPLETION_DELAY_MINUTES = Number(process.env.LOYALTY_COMPLETION_DELAY_MINUTES ?? '60');
const COMPLETION_DELAY_MS = Math.max(COMPLETION_DELAY_MINUTES, 0) * 60_000;

type LoyaltyOrderItem = {
  productId?: string | null;
};

export type LoyaltyOrderSnapshot = {
  items?: LoyaltyOrderItem[] | null;
  status?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
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

export const calculateEligiblePunches = (orders: LoyaltyOrderSnapshot[]) => {
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
