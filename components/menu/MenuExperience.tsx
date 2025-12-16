'use client';

import { useState } from 'react';
import { useMDXComponent } from 'next-contentlayer/hooks';
import { menuItems } from '@/data/menuItems';
import MenuGalleryGrid from '@/components/menu/MenuGalleryGrid';
import ReelCarousel from '@/components/menu/ReelCarousel';
import { components as mdxComponents } from '@/components/MDXComponents';

type MenuExperienceProps = {
  simpleCode: string;
  simpleContent: Record<string, unknown>;
};

type TabKey = 'dynamic' | 'simple' | 'gallery';

const TAB_LABELS: Record<TabKey, string> = {
  dynamic: 'Dinámico',
  simple: 'Simple',
  gallery: 'Galería',
};

export default function MenuExperience({ simpleCode, simpleContent }: MenuExperienceProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('dynamic');
  const SimpleContent = useMDXComponent(simpleCode);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-3 py-12 sm:px-6 lg:px-0">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Menú</p>
          <h1 className="text-3xl font-black text-white">Xoco Café</h1>
          <p className="text-sm text-white/70">Explora nuestras selecciones especiales</p>
        </div>
        <div className="hidden sm:block" aria-hidden="true" />
      </header>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
              activeTab === tab
                ? 'bg-white text-black shadow-lg shadow-black/20'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <section className="min-h-[520px]">
        {activeTab === 'dynamic' ? (
          <ReelCarousel items={menuItems} />
        ) : activeTab === 'simple' ? (
          <div className="rounded-3xl border border-[#cfc7bc] bg-[#d8d0c7] p-6 text-[#1f1c19] shadow-lg dark:border-white/10 dark:bg-[#10121d]/95 dark:text-white">
            <div className="prose prose-neutral max-w-none text-[#1f1c19] dark:prose-invert dark:text-white dark:[&_h2]:text-white dark:[&_h3]:text-white dark:[&_p]:text-white dark:[&_li]:text-white dark:[&_td]:text-white dark:[&_th]:text-white dark:[&_em]:text-white dark:[&_strong]:text-white">
              <SimpleContent content={simpleContent} components={mdxComponents} />
            </div>
          </div>
        ) : (
          <MenuGalleryGrid items={menuItems} />
        )}
      </section>
    </div>
  );
}
