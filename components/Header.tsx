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

import classNames from 'classnames';
import headerNavLinks from 'content/headerNavLinks';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CommandPalette from './CommandPalette/CommandPalette';
import MobileNav from './MobileNav';
import SectionContainer from './SectionContainer';
import ThemeSwitch from './ThemeSwitch';
import AuthNav from './Auth/AuthNav';

export default function Header() {
  const pathName = usePathname();

  return (
    <SectionContainer className="lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      <header className="z-40 bg-transparent py-5 md:py-10">
        <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white/70 px-6 py-3 text-base font-semibold text-gray-900 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40 dark:text-white md:px-8 md:flex-nowrap">
          <div className="shrink-0">
            <Link
              href="/"
              className={classNames(
                'horizontal-underline hidden text-3xl font-extrabold sm:block',
                {
                  'horizontal-underline-active': pathName === '/',
                }
              )}
              aria-label="Xoco Café"
            >
              Xoco
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end gap-4 text-base leading-5">
            <div className="hidden items-center gap-4 sm:flex lg:gap-6">
              {headerNavLinks.map(({ title, href }) => {
                const active = href === '/' ? pathName === '/' : pathName?.startsWith(href);
                return (
                  <Link
                    prefetch
                    key={title}
                    href={href}
                    className={classNames('horizontal-underline text-base', {
                      'horizontal-underline-active': active,
                    })}
                    aria-label={title}
                  >
                    <span className="font-semibold tracking-wide text-gray-900 dark:text-gray-100">
                      {title}
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <AuthNav />
              <CommandPalette />
              <ThemeSwitch />
              <MobileNav />
            </div>
          </div>
        </div>
      </header>
    </SectionContainer>
  );
}
