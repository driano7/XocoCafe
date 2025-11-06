import { allAuthors } from 'contentlayer/generated';

export interface MenuItem {
  id: string;
  label: string;
  category: 'beverage' | 'food';
  subcategory?: 'hot' | 'cold' | 'dessert' | 'snack';
  price?: number | null;
  metadata?: {
    mediumPrice?: number | null;
    largePrice?: number | null;
    calories?: number | null;
  };
}

const usesDoc = allAuthors.find((doc) => doc.slug === 'uses');
const rawContent = usesDoc?.body?.raw ?? '';

function normalizeString(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function slugify(value: string) {
  return normalizeString(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractSection(content: string, heading: string): string {
  if (!content) return '';
  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) return '';

  const sliceStart = headingIndex + heading.length;
  const remainder = content.slice(sliceStart);
  const nextHeadingIndex = remainder.indexOf('\n## ');

  return nextHeadingIndex === -1 ? remainder : remainder.slice(0, nextHeadingIndex);
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(rawPrice: string | null | undefined): number | null {
  if (!rawPrice) return null;
  const cleaned = stripHtml(rawPrice);
  const match = cleaned.match(/(\d+([.,]\d+)?)/);
  if (!match) return null;
  return Number(match[1].replace(',', '.'));
}

function parseCalories(rawCalories: string | null | undefined): number | null {
  if (!rawCalories) return null;
  const cleaned = stripHtml(rawCalories);
  const match = cleaned.match(/(\d+)\s*kcal/i);
  if (!match) return null;
  return Number(match[1]);
}

function parseBeverages(section: string): MenuItem[] {
  const rowsRegex =
    /<tr>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/gis;

  const beverages: MenuItem[] = [];

  for (const match of section.matchAll(rowsRegex)) {
    const [, rawSymbol, rawName, rawMedium, rawLarge, rawCalories] = match;
    const name = stripHtml(rawName);
    if (!name) continue;

    const symbol = stripHtml(rawSymbol);
    const mediumPrice = parsePrice(rawMedium);
    const largePrice = parsePrice(rawLarge);
    const calories = parseCalories(rawCalories);

    const subcategory = symbol.includes('🔥') ? 'hot' : symbol.includes('❄️') ? 'cold' : undefined;

    beverages.push({
      id: `beverage-${slugify(name)}`,
      label: name,
      category: 'beverage',
      subcategory,
      price: mediumPrice ?? largePrice ?? null,
      metadata: {
        mediumPrice,
        largePrice,
        calories,
      },
    });
  }

  return beverages;
}

function parseFoodList(section: string, subcategory: MenuItem['subcategory']): MenuItem[] {
  const listItemRegex = /<li>([\s\S]*?)<\/li>/gi;
  const items: MenuItem[] = [];

  for (const match of section.matchAll(listItemRegex)) {
    const rawContent = match[1];
    const text = stripHtml(rawContent);
    if (!text) continue;

    const namePart = text.split('(')[0].trim();
    if (!namePart) continue;

    const price = parsePrice(text);

    items.push({
      id: `food-${slugify(namePart)}`,
      label: namePart,
      category: 'food',
      subcategory,
      price,
    });
  }

  return items;
}

const beveragesSection = extractSection(rawContent, '## Bebidas');
const alimentosSection = extractSection(rawContent, '## Alimentos');
const postresSection = extractSection(rawContent, '## Postres');

const beverages = parseBeverages(beveragesSection);
const alimentos = parseFoodList(alimentosSection, 'snack');
const postres = parseFoodList(postresSection, 'dessert');

export const beverageOptions: MenuItem[] = beverages;
export const foodOptions: MenuItem[] = [...alimentos, ...postres];

const menuItemsById = new Map<string, MenuItem>();
for (const item of [...beverageOptions, ...foodOptions]) {
  menuItemsById.set(item.id, item);
}

export function getMenuItemById(id: string | null | undefined): MenuItem | undefined {
  if (!id) return undefined;
  return menuItemsById.get(id);
}

export function isValidMenuItem(id: string | null | undefined, category: MenuItem['category']) {
  if (!id) return true;
  const item = menuItemsById.get(id);
  return item?.category === category;
}
