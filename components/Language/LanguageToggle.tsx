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

import { useCallback } from 'react';
import { useLanguage, SupportedLanguage } from './LanguageProvider';
import classNames from 'classnames';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  es: 'Español',
  en: 'English',
};

export default function LanguageToggle() {
  const { currentLanguage, setLanguage, isChanging } = useLanguage();
  const nextLanguage: SupportedLanguage = currentLanguage === 'es' ? 'en' : 'es';

  const handleToggle = useCallback(() => {
    setLanguage(nextLanguage);
  }, [nextLanguage, setLanguage]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={
        currentLanguage === 'es' ? 'Cambiar idioma a English' : 'Change language to Español'
      }
      className={classNames(
        'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.35em]',
        'bg-gray-100/60 text-gray-800 transition-all hover:bg-gray-200 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-700',
        isChanging ? 'opacity-60 pointer-events-none' : ''
      )}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 11.37 9.198 15.343 3 17.05"
        />
      </svg>
      <span>{currentLanguage === 'es' ? 'ES' : 'EN'}</span>
      <span className="text-[0.6rem] font-semibold tracking-[0.4em] text-gray-500 dark:text-gray-400">
        {LANGUAGE_LABELS[nextLanguage]}
      </span>
    </button>
  );
}
