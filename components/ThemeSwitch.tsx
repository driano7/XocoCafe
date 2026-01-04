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

import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { BsMoonFill, BsSunFill } from 'react-icons/bs';

const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pulses, setPulses] = useState<number[]>([]);

  // When mounted on client, now we can show the UI
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    return () => {
      if (transitionTimeout.current) {
        clearTimeout(transitionTimeout.current);
      }
      document.documentElement.classList.remove('theme-transition');
    };
  }, []);

  const isDarkMode = theme === 'dark' || resolvedTheme === 'dark';

  const handleToggle = () => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    if (transitionTimeout.current) {
      clearTimeout(transitionTimeout.current);
    }
    transitionTimeout.current = setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 750);

    const pulseId = Date.now();
    setPulses((prev) => [...prev, pulseId]);
    setTimeout(() => {
      setPulses((prev) => prev.filter((id) => id !== pulseId));
    }, 550);

    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <motion.button
      id="theme-btn"
      aria-label="Toggle Dark Mode"
      type="button"
      className="relative ml-1 mr-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
      whileTap={{
        scale: 0.7,
        rotate: 360,
        transition: { duration: 0.2 },
      }}
      whileHover={{ scale: 1.2 }}
      onClick={handleToggle}
    >
      <AnimatePresence>
        {pulses.map((pulse) => (
          <motion.span
            key={pulse}
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background: isDarkMode
                ? 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(20,20,20,0.25) 0%, transparent 70%)',
            }}
            initial={{ opacity: 0.7, scale: 0.2 }}
            animate={{ opacity: 0, scale: 1.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
          />
        ))}
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        {mounted ? (
          <motion.span
            key={isDarkMode ? 'sun' : 'moon'}
            className="text-gray-900 dark:text-gray-100"
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.35, ease: [0.17, 0.55, 0.55, 1] }}
          >
            {isDarkMode ? <BsSunFill size={16} /> : <BsMoonFill size={18} />}
          </motion.span>
        ) : (
          <span className="text-gray-900 dark:text-gray-100">
            <BsMoonFill size={18} />
          </span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default ThemeSwitch;
