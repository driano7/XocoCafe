'use client';

import { useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { useMDXComponent } from 'next-contentlayer/hooks';
import { FiArrowRight } from 'react-icons/fi';
import { menuItems } from '@/data/menuItems';
import MenuGalleryGrid from '@/components/menu/MenuGalleryGrid';
import ReelCarousel from '@/components/menu/ReelCarousel';
import { components as mdxComponents } from '@/components/MDXComponents';
import SupportBanner from '@/components/SupportBanner';

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
  const { resolvedTheme } = useTheme();
  const isDark = useMemo(() => resolvedTheme === 'dark', [resolvedTheme]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-3 py-12 sm:px-6 lg:px-0">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p
            className={`text-xs uppercase tracking-[0.35em] ${
              isDark ? 'text-white/50' : 'text-gray-500'
            }`}
          >
            Menú
          </p>
          <h1 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Xoco Café
          </h1>
          <p className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
            Explora nuestras selecciones especiales
          </p>
        </div>
        <div className="hidden sm:block" aria-hidden="true" />
      </header>

      <div className="sticky top-4 z-30 w-full">
        <div
          className={`flex flex-wrap items-center justify-center gap-3 rounded-full border px-4 py-3 backdrop-blur-md ${
            isDark ? 'border-white/20 bg-black/30' : 'border-gray-200 bg-white'
          }`}
        >
          {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
                activeTab === tab
                  ? isDark
                    ? 'bg-white text-black shadow-lg shadow-black/20'
                    : 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                  : isDark
                  ? 'bg-white/10 text-white/70 hover:bg-white/20'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      <section className="min-h-[520px]">
        {activeTab === 'dynamic' ? (
          <ReelCarousel items={menuItems} variant={isDark ? 'dark' : 'light'} />
        ) : activeTab === 'simple' ? (
          <div
            className={`rounded-3xl border p-4 shadow-lg sm:p-6 ${
              isDark
                ? 'border-white/10 bg-[#10121d]/95 text-white'
                : 'border-[#cfc7bc] bg-[#d8d0c7] text-[#1f1c19]'
            }`}
          >
            <div className="relative">
              <div
                className={`max-h-[80vh] w-full overflow-x-auto overflow-y-auto rounded-2xl p-3 sm:max-h-none sm:p-4 ${
                  isDark ? 'bg-white/5' : 'bg-white/60'
                }`}
              >
                <div className="min-w-[680px] sm:min-w-0">
                  <div
                    className={`menu-simple-prose prose max-w-none text-[13px] sm:text-base ${
                      isDark
                        ? 'prose-invert text-white [&_h2]:text-white [&_h3]:text-white [&_li]:text-white [&_strong]:text-white [&_p]:text-white'
                        : 'prose-neutral text-[#1f1c19]'
                    }`}
                  >
                    <SimpleContent content={simpleContent} components={mdxComponents} />
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-sm text-gray-700 shadow-md dark:bg-black/70 dark:text-white sm:hidden">
                <span className="sr-only">Desliza horizontalmente para ver más</span>
                <FiArrowRight aria-hidden />
              </div>
            </div>
          </div>
        ) : (
          <MenuGalleryGrid items={menuItems} />
        )}
      </section>
      <SupportBanner />
    </div>
  );
}
