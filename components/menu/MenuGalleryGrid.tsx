'use client';

import { useMemo, useState } from 'react';
import type { MenuItem } from '@/data/menuItems';

type MenuGalleryGridProps = {
  items: MenuItem[];
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=900&h=1100&fit=crop';

export default function MenuGalleryGrid({ items }: MenuGalleryGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const categories = useMemo(
    () => ['Todos', ...new Set(items.map((item) => item.category))],
    [items]
  );

  const filteredItems =
    selectedCategory === 'Todos'
      ? items
      : items.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-[520px] rounded-3xl border border-primary-100/30 bg-white/70 px-4 py-10 shadow-lg backdrop-blur dark:bg-neutral-900/70">
      <div className="mx-auto mb-8 flex max-w-5xl flex-wrap items-center gap-3">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
              selectedCategory === category
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/40'
                : 'bg-white/80 text-gray-700 hover:bg-white dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => {
          const imageSrc = item.image || FALLBACK_IMAGE;

          return (
            <div
              key={item.id}
              className="group overflow-hidden rounded-3xl border border-primary-50/60 bg-white shadow-sm transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg dark:border-white/10 dark:bg-[#0b101f]"
            >
              <div className="relative h-48 overflow-hidden">
                {/*
                 * Some legacy menu entries ship without an image.
                 * Use a curated fallback to avoid blank cards in the gallery grid.
                 */}
                <img
                  src={imageSrc}
                  alt={item.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition group-hover:opacity-90" />
              </div>
              <div className="space-y-2 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-500">
                  {item.category}
                </p>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">{item.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                <div className="flex items-center justify-between pt-2 text-gray-900 dark:text-white">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <span>{item.price}</span>
                    {item.priceGrande ? (
                      <span className="text-sm text-gray-400 dark:text-gray-500">
                        · {item.priceGrande}
                      </span>
                    ) : null}
                  </div>
                  {item.calories ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.calories}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
