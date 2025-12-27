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

import { allAuthors } from 'contentlayer/generated';

export interface MenuItem {
  id: string;
  label: string;
  category: 'beverage' | 'food' | 'package';
  subcategory?: 'hot' | 'cold' | 'dessert' | 'snack';
  price?: number | null;
  metadata?: {
    mediumPrice?: number | null;
    largePrice?: number | null;
    calories?: number | null;
    availableSizes?: string[];
    defaultSize?: string;
    description?: string;
    items?: string[];
    loyaltyExclusion?: boolean;
    temperature?: '🔥' | '❄️' | null;
  };
}

const usesDoc = allAuthors.find((doc) => doc.slug === 'uses');
const rawContent = usesDoc?.body?.raw ?? '';
const UNIQUE_SIZE_BEVERAGES = new Set(
  ['Café expreso', 'Refresco', 'Agua embotellada', 'Agua mineral'].map((value) =>
    normalizeString(value)
  )
);
const HOT_BEVERAGES = new Set(
  [
    'Café mexicano 🇲🇽',
    'Café expreso',
    'Café capuccino',
    'Café moka',
    'Chocolate de agua',
    'Chocolate de leche',
    'Té chai',
    'Chai latte',
  ].map((value) => normalizeString(value))
);
const COLD_BEVERAGES = new Set(
  [
    'Chocolate frío',
    'Matcha',
    'Frappé (chocolate, café, matcha)',
    'Refresco',
    'Agua embotellada',
    'Agua mineral',
  ].map((value) => normalizeString(value))
);

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
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  const beverages: MenuItem[] = [];

  for (const rowMatch of section.matchAll(rowRegex)) {
    const cells = Array.from(rowMatch[1].matchAll(/<td>([\s\S]*?)<\/td>/gi)).map(
      ([, value]) => value ?? ''
    );
    if (cells.length < 3) {
      continue;
    }
    const [rawName, rawMedium, rawLarge, rawCalories] = cells;
    const nameContent = stripHtml(rawName).trim();
    if (!nameContent) {
      continue;
    }
    const inlineCaloriesMatch = nameContent.match(/\s*-\s*\*?(\d+)\s*kcal\*?$/i);
    const inlineCalories = inlineCaloriesMatch ? Number(inlineCaloriesMatch[1]) : null;
    const sanitizedName = inlineCaloriesMatch
      ? nameContent.replace(inlineCaloriesMatch[0], '').trim()
      : nameContent;
    const normalizedNameForLabel = sanitizedName || nameContent;
    const symbolMatch = normalizedNameForLabel.match(/\((🔥|❄️)\)\s*$/);
    const baseName = symbolMatch
      ? normalizedNameForLabel.replace(symbolMatch[0], '').trim()
      : normalizedNameForLabel;
    if (!baseName || /^\$/.test(baseName) || !/[a-záéíóúüñ]/i.test(baseName.replace(/[()]/g, ''))) {
      continue;
    }
    const temperatureSymbol = (symbolMatch?.[1] as '🔥' | '❄️' | undefined) ?? null;
    const displayName = symbolMatch ? `${baseName} ${symbolMatch[1]}` : baseName;
    const mediumPrice = parsePrice(rawMedium);
    const largePrice = parsePrice(rawLarge);
    const calories = inlineCalories ?? parseCalories(rawCalories);

    let subcategory: MenuItem['subcategory'];
    const normalizedName = normalizeString(baseName);
    if (HOT_BEVERAGES.has(normalizedName)) subcategory = 'hot';
    else if (COLD_BEVERAGES.has(normalizedName)) subcategory = 'cold';
    else
      subcategory =
        temperatureSymbol === '🔥' ? 'hot' : temperatureSymbol === '❄️' ? 'cold' : undefined;

    let availableSizes: string[] = [];
    if (UNIQUE_SIZE_BEVERAGES.has(normalizedName)) {
      availableSizes = ['único'];
    } else {
      if (mediumPrice) availableSizes.push('mediano');
      if (largePrice) availableSizes.push('grande');
    }
    if (!availableSizes.length) {
      availableSizes = ['único'];
    }
    const defaultSize = availableSizes[0];

    beverages.push({
      id: `beverage-${slugify(displayName)}`,
      label: displayName,
      category: 'beverage',
      subcategory,
      price: mediumPrice ?? largePrice ?? null,
      metadata: {
        mediumPrice,
        largePrice,
        calories,
        availableSizes,
        defaultSize,
        temperature: temperatureSymbol,
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
const packages: MenuItem[] = [
  {
    id: 'package-1',
    label: 'Paquete 1 · Café mexicano + panqué',
    category: 'package',
    price: 50,
    metadata: {
      items: ['Café mexicano 🇲🇽', 'Panqué'],
      calories: 405,
      description: 'Incluye Café mexicano 🇲🇽 y panqué artesanal.',
      loyaltyExclusion: true,
    },
  },
  {
    id: 'package-2',
    label: 'Paquete 2 · Café mexicano + sándwich',
    category: 'package',
    price: 50,
    metadata: {
      items: ['Café mexicano 🇲🇽', 'Sándwich'],
      calories: 355,
      description: 'Incluye Café mexicano 🇲🇽 acompañado de un sándwich.',
      loyaltyExclusion: true,
    },
  },
  {
    id: 'package-3',
    label: 'Paquete 3 · Café mexicano + cheesecake o pastel',
    category: 'package',
    price: 50,
    metadata: {
      items: ['Café mexicano 🇲🇽', 'Cheesecake o pastel'],
      calories: 480,
      description: 'Café mexicano 🇲🇽 con tu postre favorito.',
      loyaltyExclusion: true,
    },
  },
  {
    id: 'package-4',
    label: 'Paquete 4 · Chocolate de agua + pan de yema',
    category: 'package',
    price: 50,
    metadata: {
      items: ['Chocolate de agua', 'Pan de yema'],
      calories: 520,
      description: 'Chocolate de agua tradicional con pan de yema.',
      loyaltyExclusion: true,
    },
  },
];

export const beverageOptions: MenuItem[] = beverages;
export const foodOptions: MenuItem[] = [...alimentos, ...postres];
export const packageOptions: MenuItem[] = packages;

const menuItemsById = new Map<string, MenuItem>();
for (const item of [...beverageOptions, ...foodOptions, ...packages]) {
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
