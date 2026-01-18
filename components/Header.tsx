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

'use client';

import AuthNav from '@/components/Auth/AuthNav';
import classNames from 'classnames';
import headerNavLinks from 'content/headerNavLinks';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import CommandPalette from './CommandPalette/CommandPalette';

import ThemeSwitch from './ThemeSwitch';
import LanguageToggle from './Language/LanguageToggle';
import { useLanguage } from './Language/LanguageProvider';
import TranslatedText from './Language/TranslatedText';

export default function Header() {
  const { t } = useLanguage();
  const pathName = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [forceVisible, setForceVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDelayElapsed, setMobileDelayElapsed] = useState(true);

  useEffect(() => {
    const updateForceVisible = () => {
      const scrollableSpace = document.documentElement.scrollHeight - window.innerHeight;
      setForceVisible(scrollableSpace < 120);
    };
    updateForceVisible();
    window.addEventListener('resize', updateForceVisible);
    return () => window.removeEventListener('resize', updateForceVisible);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 640px)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileDelayElapsed(true);
      return undefined;
    }
    setMobileDelayElapsed(false);
    setIsVisible(true);
    const timer = window.setTimeout(() => {
      setMobileDelayElapsed(true);
      setIsVisible(forceVisible || window.scrollY > 16);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [isMobile, forceVisible]);

  useEffect(() => {
    const handleScroll = () => {
      if (isMobile && !mobileDelayElapsed) {
        setIsVisible(true);
        return;
      }
      setIsVisible(forceVisible || window.scrollY > 16);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [forceVisible, isMobile, mobileDelayElapsed]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4 sm:px-6 lg:px-8">
      <header
        data-app-header
        className={classNames(
          'pointer-events-auto flex w-[min(1100px,100%)] items-center gap-4 rounded-3xl border px-5 py-3 text-sm font-semibold shadow-2xl transition-all duration-500 backdrop-blur-md',
          'text-gray-900 dark:text-white',
          isVisible
            ? 'border-black/5 bg-white/80 dark:border-white/10 dark:bg-black/60'
            : 'border-transparent bg-transparent opacity-0 pointer-events-none -translate-y-8'
        )}
      >
        <div className="shrink-0">
          <Link
            href="/"
            className={classNames(
              'text-2xl font-black tracking-tight transition-transform duration-200 hover:-translate-y-0.5',
              pathName === '/' ? 'text-primary-600 dark:text-primary-200' : ''
            )}
            aria-label="Xoco Café"
          >
            Xoco
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          <nav className="hidden items-center gap-4 sm:flex lg:gap-6">
            {headerNavLinks.map(({ title, href }) => {
              const active = href === '/' ? pathName === '/' : pathName?.startsWith(href);
              const tid = title
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '_');
              const localizedSlug = t(`blog.slug_${tid}`);
              const localizedHref =
                localizedSlug && href.startsWith('/blog/') ? `/blog/${localizedSlug}` : href;

              return (
                <Link
                  prefetch
                  key={title}
                  href={localizedHref}
                  className={classNames(
                    'group relative inline-flex flex-col items-center gap-1 text-base font-semibold tracking-wide text-gray-700 transition duration-300 dark:text-gray-200',
                    active ? 'text-primary-600 dark:text-primary-200' : ''
                  )}
                  aria-label={title}
                >
                  <span className="transition-transform duration-200 group-hover:-translate-y-0.5">
                    <TranslatedText
                      tid={`nav.${title
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/\s+/g, '_')}`}
                      fallback={title}
                    />
                  </span>
                  <span
                    className={classNames(
                      'h-1 w-1 rounded-full bg-current transition-all duration-200',
                      active
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
                    )}
                  />
                  <span
                    className={classNames(
                      'absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300',
                      'group-hover:scale-x-100'
                    )}
                  />
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>
            <AuthNav />
            <div className="sm:hidden">
              <LanguageToggle />
            </div>
            <CommandPalette />
            <ThemeSwitch />
          </div>
        </div>
      </header>
    </div>
  );
}
