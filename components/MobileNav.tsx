/*
 * --------------------------------------------------------------------
 * Xoco Café — Software Property
 * Copyright (c) 2025 Xoco Café
 * Principal Developer: Donovan Riaño
 *
 * (Resto de la licencia...)
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
    <>
      <button
        type="button"
        aria-label="Toggle menu"
        onClick={() => setNavShow(!navShow)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 sm:hidden"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-primary-400 opacity-75" />
        <span className="relative z-10 text-2xl">
          <svg
            stroke="currentColor"
            fill="none"
            strokeWidth="2"
            viewBox="0 0 24 24"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <AnimatePresence>
        <motion.div
          key="MobileNav"
          transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
          animate={navShow ? 'enter' : 'exit'}
          initial="exit"
          exit="exit"
          variants={variants}
          // Fondo invertido: Negro en claro, Blanco en oscuro.
          className="fixed inset-0 z-20 h-full w-full bg-black dark:bg-white"
        >
          <div
            className={classNames(
              'flex h-full w-full flex-col',
              // Contraste de texto y fondo: Blanco sobre negro, Negro sobre blanco.
              'bg-black text-white',
              'dark:bg-white dark:text-black'
            )}
          >
            {/* Cabecera y botón de cierre con contraste forzado */}
            <header className="flex justify-end py-5 px-4 text-white dark:text-black">
              <button
                type="button"
                aria-label="toggle modal"
                className="h-8 w-8 rounded text-white dark:text-black"
                onClick={() => setNavShow(!navShow)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="text-white dark:text-black"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </header>

            {/* CLASES MODIFICADAS CLAVE:
              1. justify-center cambiado a justify-start (alinea al inicio).
              2. Se añadió pt-10 para un espacio superior agradable.
            */}
            <nav className="flex flex-1 flex-col justify-start space-y-4 px-10 pt-10 text-center text-3xl font-semibold tracking-[0.25em] text-white dark:text-black">
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
    </>
  );
}
