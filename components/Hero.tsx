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

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ReactElement, useContext, useEffect, useRef } from 'react';
import { HiOutlineArrowNarrowDown } from 'react-icons/hi';
import TypewriterText from './TypewriterText';
import { ScrollContext } from './Providers/ScrollProvider';
import { renderCanvas } from './renderCanvas';
import { useAuth } from './Auth/AuthProvider';
import { useLanguage } from './Language/LanguageProvider';
import TranslatedText from './Language/TranslatedText';

export default function Hero(): ReactElement {
  const { currentLanguage, t } = useLanguage();
  const ref = useRef<HTMLHeadingElement>(null);
  const { scrollY } = useContext(ScrollContext);
  const { token } = useAuth();

  let progress = 0;
  const { current: elContainer } = ref;

  if (elContainer) {
    progress = Math.min(1, scrollY / elContainer.clientHeight);
  }

  useEffect(() => {
    renderCanvas();
  }, []);

  const quienesVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { delay: 0.9, type: 'spring', stiffness: 120 },
    },
    pulse: {
      scale: [1, 1.05, 1],
      boxShadow: [
        '0 0 0 rgba(239, 68, 68, 0)',
        '0 0 18px rgba(239, 68, 68, 0.35)',
        '0 0 0 rgba(239, 68, 68, 0)',
      ],
      transition: { delay: 2.2, duration: 1.2, repeat: 1 },
    },
  };

  return (
    <div>
      <h1 className="sr-only">Chocolate y café hecho por los dioses.</h1>
      <div className="relative z-10 flex h-[calc(100vh-81px)] items-center md:h-[calc(100vh-116px)]">
        <div className="mx-auto w-screen max-w-3xl px-4 sm:px-9 xl:max-w-5xl xl:px-0">
          <div className="-mt-36">
            <div ref={ref} className="flex cursor-default flex-col space-y-2">
              <h1 className="text-5xl font-semibold sm:text-7xl md:text-8xl xl:text-9xl">
                Xoco Café
              </h1>
              <h2 className="text-3xl font-medium opacity-80 sm:text-6xl md:text-6xl xl:text-7xl">
                <TypewriterText
                  key={`subtitle-${currentLanguage}`}
                  segments={[{ text: t('hero.subtitle') }]}
                  startDelay={400}
                />
              </h2>
              <p className="max-w-[18rem] text-xs font-semibold uppercase tracking-[0.25em] text-primary-600/60 dark:text-primary-400/40 sm:max-w-none sm:text-sm">
                <TranslatedText
                  tid="hero.antoja"
                  fallback="¿A poco no se te antoja un buen Café ó Chocolate?"
                />
              </p>
              <motion.div
                initial="hidden"
                animate={['visible', 'pulse']}
                variants={quienesVariants}
              >
                <span className="inline-flex w-max rounded-full px-1.5 py-0.5 text-base font-semibold sm:text-lg md:text-xl xl:text-2xl">
                  <span className="absolute inset-0 hidden" aria-hidden="true" />
                  <span className="relative inline-flex items-center rounded-full px-1.5 py-0.5">
                    <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary-100/40 blur-lg dark:bg-primary-500/20" />
                    <TypewriterText
                      key={`about-${currentLanguage}`}
                      segments={[
                        {
                          kind: 'link',
                          href: '/about',
                          text: t('hero.about_btn'),
                          className:
                            'underline-magical cursor-pointer text-primary-700 dark:text-primary-200',
                        },
                      ]}
                      startDelay={900}
                      speed={35}
                      showCursor={false}
                    />
                  </span>
                </span>
              </motion.div>
              {!token && (
                <div className="pt-6">
                  <Link
                    href="/login"
                    className="group relative inline-flex overflow-hidden rounded-full border border-primary-700 px-4 py-1.5 text-sm font-semibold text-primary-700 transition-colors duration-300 hover:text-primary-600 dark:border-primary-200 dark:text-primary-100"
                  >
                    <span className="absolute inset-0 scale-0 rounded-full bg-current opacity-10 transition-transform duration-300 group-hover:scale-100" />
                    <span className="relative">
                      <TranslatedText tid="hero.login_btn" fallback="Iniciar Sesión" />
                    </span>
                  </Link>
                </div>
              )}
            </div>
            <motion.div
              animate={{
                transform: `translateY(${progress * 10}vh)`,
              }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 transform md:bottom-8"
            >
              <div
                role="presentation"
                className="flex cursor-pointer flex-col items-center justify-center"
                onClick={() => {
                  const intro = document.querySelector('#intro');

                  intro?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <HiOutlineArrowNarrowDown size={20} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <canvas className="bg-skin-base pointer-events-none absolute inset-0" id="canvas"></canvas>
    </div>
  );
}
