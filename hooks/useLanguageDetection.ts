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

import { useEffect, useState, useCallback } from 'react';

export type SupportedLanguage = 'es' | 'en' | 'fr' | 'pt' | 'de' | 'it';

interface LanguageDetectionOptions {
  fallbackLanguage?: SupportedLanguage;
  detectFromBrowser?: boolean;
  detectFromURL?: boolean;
  detectFromStorage?: boolean;
}

const LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  es: 'es',
  'es-ES': 'es',
  'es-MX': 'es',
  'es-AR': 'es',
  'es-CO': 'es',
  'es-PE': 'es',
  'es-VE': 'es',
  'es-CL': 'es',
  'es-UY': 'es',
  'es-PY': 'es',
  'es-BO': 'es',
  'es-EC': 'es',
  'es-GT': 'es',
  'es-CR': 'es',
  'es-PA': 'es',
  'es-HN': 'es',
  'es-NI': 'es',
  'es-SV': 'es',
  'es-DO': 'es',
  'es-CU': 'es',
  'es-PR': 'es',
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'en-CA': 'en',
  'en-AU': 'en',
  'en-NZ': 'en',
  'en-ZA': 'en',
  'en-IE': 'en',
  fr: 'fr',
  'fr-FR': 'fr',
  'fr-CA': 'fr',
  'fr-BE': 'fr',
  'fr-CH': 'fr',
  pt: 'pt',
  'pt-BR': 'pt',
  'pt-PT': 'pt',
  de: 'de',
  'de-DE': 'de',
  'de-AT': 'de',
  'de-CH': 'de',
  it: 'it',
  'it-IT': 'it',
  'it-CH': 'it',
};

export function useLanguageDetection(options: LanguageDetectionOptions = {}) {
  const {
    fallbackLanguage = 'es',
    detectFromBrowser = true,
    detectFromURL = true,
    detectFromStorage = true,
  } = options;

  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage>(fallbackLanguage);
  const [isDetecting, setIsDetecting] = useState(true);

  // Función para detectar idioma del navegador
  const detectBrowserLanguage = useCallback((): SupportedLanguage => {
    if (typeof window === 'undefined') return fallbackLanguage;

    const browserLanguages = navigator.languages || [navigator.language];

    for (const lang of browserLanguages) {
      const normalizedLang = lang.toLowerCase();
      if (LANGUAGE_MAP[normalizedLang]) {
        return LANGUAGE_MAP[normalizedLang];
      }
    }

    return fallbackLanguage;
  }, [fallbackLanguage]);

  // Función para detectar idioma desde URL
  const detectURLanguage = useCallback((): SupportedLanguage | null => {
    if (typeof window === 'undefined') return null;

    const pathname = window.location.pathname;
    const urlLang = pathname.split('/')[1];

    if (urlLang && LANGUAGE_MAP[urlLang.toLowerCase()]) {
      return LANGUAGE_MAP[urlLang.toLowerCase()];
    }

    return null;
  }, []);

  // Función para detectar idioma desde localStorage
  const detectStorageLanguage = useCallback((): SupportedLanguage | null => {
    if (typeof window === 'undefined') return null;

    const storedLang = localStorage.getItem('preferred_language');
    if (storedLang && LANGUAGE_MAP[storedLang.toLowerCase()]) {
      return LANGUAGE_MAP[storedLang.toLowerCase()];
    }

    return null;
  }, []);

  // Función principal de detección
  const detectLanguage = useCallback((): SupportedLanguage => {
    // 1. Prioridad: URL
    if (detectFromURL) {
      const urlLang = detectURLanguage();
      if (urlLang) return urlLang;
    }

    // 2. Prioridad: localStorage
    if (detectFromStorage) {
      const storageLang = detectStorageLanguage();
      if (storageLang) return storageLang;
    }

    // 3. Prioridad: Navegador
    if (detectFromBrowser) {
      return detectBrowserLanguage();
    }

    return fallbackLanguage;
  }, [
    detectFromURL,
    detectFromStorage,
    detectFromBrowser,
    detectURLanguage,
    detectStorageLanguage,
    detectBrowserLanguage,
    fallbackLanguage,
  ]);

  // Función para establecer idioma preferido
  const setPreferredLanguage = useCallback((language: SupportedLanguage) => {
    if (typeof window === 'undefined') return;

    localStorage.setItem('preferred_language', language);
    setDetectedLanguage(language);

    // Actualizar el atributo lang del HTML
    document.documentElement.lang = language;
  }, []);

  // Función para obtener información del dispositivo
  const getDeviceInfo = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent
    );
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    return {
      isMobile,
      isTablet,
      isDesktop,
      userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }, []);

  // Efecto para detectar idioma al montar el componente
  useEffect(() => {
    const detected = detectLanguage();
    setDetectedLanguage(detected);
    setIsDetecting(false);

    // Establecer el idioma en el HTML
    if (typeof window !== 'undefined') {
      document.documentElement.lang = detected;
    }
  }, [detectLanguage]);

  // Efecto para escuchar cambios en el idioma del navegador
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLanguageChange = () => {
      const newLanguage = detectLanguage();
      setDetectedLanguage(newLanguage);
    };

    // Escuchar cambios en el idioma del navegador
    window.addEventListener('languagechange', handleLanguageChange);

    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, [detectLanguage]);

  return {
    detectedLanguage,
    isDetecting,
    setPreferredLanguage,
    detectLanguage,
    getDeviceInfo,
    supportedLanguages: Object.keys(LANGUAGE_MAP) as SupportedLanguage[],
  };
}
