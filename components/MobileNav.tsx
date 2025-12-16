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
          className={classNames(
            'fixed inset-0 z-20 h-full w-full bg-gradient-to-b from-black/70 via-black/60 to-black/50 text-white backdrop-blur-[28px] dark:from-black/80 dark:via-black/80 dark:to-black/80'
          )}
        >
          <header className="flex justify-end py-5 px-4">
            <button
              type="button"
              aria-label="toggle modal"
              className="h-8 w-8 rounded"
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
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </header>
          <div className="flex h-full w-full justify-center px-5 pb-12">
            <nav className="mt-6 flex w-full max-w-sm flex-col overflow-y-auto rounded-3xl border border-white/30 bg-gray-900/90 px-8 py-10 text-white shadow-2xl backdrop-blur-2xl dark:border-white/20 dark:bg-white/95 dark:text-gray-900">
              <div className="mb-6 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 dark:text-gray-500">
                Navega
              </div>
              <div key="Home" className="py-3">
                <Link
                  href="/"
                  onClick={() => setNavShow(!navShow)}
                  className={classNames('horizontal-underline font-bold tracking-[0.2em]', {
                    'horizontal-underline-active': pathName === '/',
                  })}
                >
                  Home
                </Link>
              </div>
              {headerNavLinks.map(({ title, href }) => {
                const active = pathName?.includes(href);

                return (
                  <div key={title} className="py-3">
                    <Link
                      href={href}
                      onClick={() => setNavShow(!navShow)}
                      className={classNames('horizontal-underline font-semibold tracking-[0.2em]', {
                        'horizontal-underline-active': active,
                      })}
                      aria-label={title}
                    >
                      {title}
                    </Link>
                  </div>
                );
              })}
            </nav>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
