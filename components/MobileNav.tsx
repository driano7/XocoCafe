/*
 * --------------------------------------------------------------------
 * Xoco Café — Software Property
 * Copyright (c) 2025 Xoco Café
 * Principal Developer: Donovan Riaño
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * --------------------------------------------------------------------
 * PROPIEDAD DEL SOFTWARE — XOCO CAFÉ.
 * Copyright (c) 2025 Xoco Café.
 * Desarrollador Principal: Donovan Riaño.
 *
 * Este archivo está licenciado bajo la Apache License 2.0.
 * Consulta el archivo LICENSE en la raíz del proyecto para más detalles.
 * --------------------------------------------------------------------
 */

'use client';

import classNames from 'classnames';
import headerNavLinks from 'content/headerNavLinks';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MobileNav() {
  const pathName = usePathname();
  const [navShow, setNavShow] = useState(false);

  const variants = {
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: '100vw' },
  };

  useEffect(() => {
    if (navShow) {
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [navShow]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        className="ml-1 mr-1 h-8 w-8 rounded py-1"
        aria-label="Toggle Menu"
        onClick={() => setNavShow(!navShow)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="text-gray-900 dark:text-gray-100"
        >
          <path
            fillRule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <AnimatePresence>
        <motion.div
          key="MobileNav"
          transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
          animate={navShow ? 'enter' : 'exit'}
          initial="exit"
          exit="exit"
          variants={variants}
          // CLASE MODIFICADA CLAVE (Inversión de fondo):
          // En modo claro (por defecto): Fondo negro (bg-black)
          // En modo oscuro (dark:): Fondo blanco (dark:bg-white)
          className="fixed inset-0 z-20 h-full w-full bg-black dark:bg-white"
        >
          <div
            className={classNames(
              'flex h-full w-full flex-col',
              // CLASES MODIFICADAS CLAVE (Inversión de texto):
              // En modo claro (fondo negro): Texto blanco (text-white)
              // En modo oscuro (fondo blanco): Texto negro (dark:text-black)
              'bg-black text-white',
              'dark:bg-white dark:text-black'
            )}
          >
            <header className="flex justify-end py-5 px-4 text-current">
              <button
                type="button"
                aria-label="toggle modal"
                className="h-8 w-8 rounded text-current"
                onClick={() => setNavShow(!navShow)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="text-current"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </header>
            <nav className="flex flex-1 flex-col justify-center space-y-8 px-10 text-center text-3xl font-semibold tracking-[0.25em] text-current">
              <Link
                href="/"
                onClick={() => setNavShow(!navShow)}
                className={classNames('horizontal-underline', {
                  'horizontal-underline-active': pathName === '/',
                })}
              >
                Home
              </Link>
              {headerNavLinks.map(({ title, href }) => {
                const active = pathName?.includes(href);
                return (
                  <Link
                    key={title}
                    href={href}
                    onClick={() => setNavShow(!navShow)}
                    className={classNames('horizontal-underline', {
                      'horizontal-underline-active': active,
                    })}
                    aria-label={title}
                  >
                    {title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
