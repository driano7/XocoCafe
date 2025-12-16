import { beverageOptions, foodOptions, getMenuItemById } from '@/lib/menuData';

const MENU_LOOKUP = [...beverageOptions, ...foodOptions];

function normalizeLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export type FavoriteDescriptor = {
  label: string | null;
  value: string | null;
  menuId: string | null;
};

export function describeFavorite(value?: string | null): FavoriteDescriptor {
  if (!value) {
    return { label: null, value: null, menuId: null };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { label: null, value: null, menuId: null };
  }

  const direct = getMenuItemById(trimmed);
  if (direct) {
    return { label: direct.label, value: trimmed, menuId: direct.id };
  }

  const normalized = normalizeLabel(trimmed);
  const fallback = MENU_LOOKUP.find((item) => normalizeLabel(item.label) === normalized);

  return {
    label: fallback?.label ?? trimmed,
    value: trimmed,
    menuId: fallback?.id ?? null,
  };
}

export function resolveFavoriteLabel(value?: string | null) {
  return describeFavorite(value).label;
}
