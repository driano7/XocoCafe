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
    <SectionContainer>
      <header className="z-40 bg-transparent py-5 md:py-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <Link
              href="/"
              className={classNames(
                'horizontal-underline hidden text-3xl font-extrabold sm:block',
                {
                  'horizontal-underline-active': pathName === '/',
                }
              )}
              aria-label="A"
            >
              Xoco
            </Link>
          </div>
          <div className="flex items-center space-x-3 text-base leading-5">
            <div className="hidden space-x-3 sm:flex">
              {headerNavLinks.map(({ title, href }) => {
                const active = pathName?.includes(href);
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
            <div className="flex items-center space-x-3">
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
