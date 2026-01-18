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

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { dictionaries } from '@/lib/i18n/dictionaries';

export type SupportedLanguage = 'es' | 'en';

const LANGUAGE_ALIASES: Record<string, SupportedLanguage> = {
  es: 'es',
  'es-es': 'es',
  'es-mx': 'es',
  'es-419': 'es',
  'es-ar': 'es',
  'es-co': 'es',
  'es-pe': 'es',
  'es-ve': 'es',
  'es-cl': 'es',
  'es-uy': 'es',
  'es-py': 'es',
  'es-bo': 'es',
  'es-ec': 'es',
  'es-gt': 'es',
  'es-cr': 'es',
  'es-pa': 'es',
  'es-hn': 'es',
  'es-ni': 'es',
  'es-sv': 'es',
  'es-do': 'es',
  'es-cu': 'es',
  'es-pr': 'es',
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  'en-ca': 'en',
  'en-au': 'en',
  'en-nz': 'en',
  'en-za': 'en',
  'en-ie': 'en',
};

const normalizeLanguage = (value?: string | null): SupportedLanguage | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized in LANGUAGE_ALIASES) {
    return LANGUAGE_ALIASES[normalized];
  }
  const base = normalized.split('-')[0];
  if (base === 'es') return 'es';
  if (['en', 'zh', 'ja', 'de'].includes(base)) {
    return 'en';
  }
  return null;
};

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  t: (path: string) => string;
  setLanguage: (lang: SupportedLanguage) => void;
  isChanging: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  fallbackLanguage = 'es',
}: {
  children: ReactNode;
  fallbackLanguage?: SupportedLanguage;
}) {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(fallbackLanguage);
  const [isChanging, setIsChanging] = useState(false);

  const detectLanguage = useCallback((): SupportedLanguage => {
    if (typeof window === 'undefined') return fallbackLanguage;

    const storedPreference = normalizeLanguage(localStorage.getItem('preferred_language'));
    if (storedPreference) {
      return storedPreference;
    }

    const htmlLang = normalizeLanguage(document.documentElement?.lang);
    if (htmlLang) {
      return htmlLang;
    }

    const browserLanguages = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    for (const lang of browserLanguages) {
      const normalized = normalizeLanguage(lang);
      if (normalized) {
        return normalized;
      }
    }

    return fallbackLanguage;
  }, [fallbackLanguage]);

  useEffect(() => {
    const detected = detectLanguage();
    setCurrentLanguage(detected);
    document.documentElement.lang = detected;
  }, [detectLanguage]);

  const setLanguage = (lang: SupportedLanguage) => {
    if (lang === currentLanguage) return;

    setIsChanging(true);
    setTimeout(() => {
      setCurrentLanguage(lang);
      localStorage.setItem('preferred_language', lang);
      document.documentElement.lang = lang;

      // End animation after content has likely updated
      setTimeout(() => setIsChanging(false), 300);
    }, 150);
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let result: unknown = dictionaries[currentLanguage];
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = (result as Record<string, unknown>)[key];
      } else {
        // Fallback to Spanish if key missing in English
        let fallbackDict: unknown = dictionaries['es'];
        for (const fKey of keys) {
          if (fallbackDict && typeof fallbackDict === 'object' && fKey in fallbackDict) {
            fallbackDict = (fallbackDict as Record<string, unknown>)[fKey];
          } else {
            return path;
          }
        }
        return typeof fallbackDict === 'string' ? fallbackDict : path;
      }
    }
    return typeof result === 'string' ? result : path;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, t, setLanguage, isChanging }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
