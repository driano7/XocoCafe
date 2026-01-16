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
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage, SupportedLanguage } from './LanguageProvider';
import { motion, AnimatePresence } from 'framer-motion';
import classNames from 'classnames';

export default function LanguageToggle() {
  const { currentLanguage, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const otherLanguage: SupportedLanguage = currentLanguage === 'es' ? 'en' : 'es';
  const label = otherLanguage === 'en' ? 'English' : 'Español';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100/50 text-gray-700 transition-all hover:bg-gray-200/50 dark:bg-gray-800/50 dark:text-gray-200 dark:hover:bg-gray-700/50"
        aria-label="Change language"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 11.37 9.198 15.343 3 17.05"
          />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-32 origin-top-right rounded-2xl border border-black/5 bg-white p-1 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-black/90"
          >
            <button
              onClick={() => {
                setLanguage(otherLanguage);
                setIsOpen(false);
              }}
              className={classNames(
                'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                'hover:bg-primary-50 text-gray-700 dark:text-gray-200 dark:hover:bg-primary-900/40'
              )}
            >
              <span className="text-base">{otherLanguage === 'en' ? '🇺🇸' : '🇪🇸'}</span>
              <span>{label}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
