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

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useLanguageDetection, SupportedLanguage } from '@/hooks/useLanguageDetection';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  isDetecting: boolean;
  setLanguage: (language: SupportedLanguage) => void;
  getDeviceInfo: () => any;
  supportedLanguages: SupportedLanguage[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  fallbackLanguage?: SupportedLanguage;
}

export function LanguageProvider({ children, fallbackLanguage = 'es' }: LanguageProviderProps) {
  const { detectedLanguage, isDetecting, setPreferredLanguage, getDeviceInfo, supportedLanguages } =
    useLanguageDetection({
      fallbackLanguage,
      detectFromBrowser: true,
      detectFromURL: true,
      detectFromStorage: true,
    });

  // Efecto para aplicar traducciones automáticas
  useEffect(() => {
    if (!isDetecting && typeof window !== 'undefined') {
      // Aplicar traducciones automáticas usando Google Translate
      applyAutoTranslation(detectedLanguage);
    }
  }, [detectedLanguage, isDetecting]);

  const setLanguage = (language: SupportedLanguage) => {
    setPreferredLanguage(language);
    applyAutoTranslation(language);
  };

  const applyAutoTranslation = (language: SupportedLanguage) => {
    if (typeof window === 'undefined') return;

    // Si el idioma detectado no es español, aplicar traducción automática
    if (language !== 'es') {
      // Crear script de Google Translate si no existe
      if (!document.getElementById('google-translate-script')) {
        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.src =
          'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.head.appendChild(script);
      }

      // Función para inicializar Google Translate
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: 'es',
            includedLanguages: 'en,fr,pt,de,it',
            autoDisplay: false,
            layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          'google_translate_element'
        );
      };

      // Crear elemento para Google Translate
      if (!document.getElementById('google_translate_element')) {
        const translateElement = document.createElement('div');
        translateElement.id = 'google_translate_element';
        translateElement.style.display = 'none';
        document.body.appendChild(translateElement);
      }

      // Aplicar traducción después de un delay
      setTimeout(() => {
        const selectElement = document.querySelector('.goog-te-combo');
        if (selectElement) {
          const targetLanguage =
            language === 'en'
              ? 'en'
              : language === 'fr'
              ? 'fr'
              : language === 'pt'
              ? 'pt'
              : language === 'de'
              ? 'de'
              : language === 'it'
              ? 'it'
              : 'en';

          (selectElement as HTMLSelectElement).value = targetLanguage;
          selectElement.dispatchEvent(new Event('change'));
        }
      }, 1000);
    }
  };

  const value: LanguageContextType = {
    currentLanguage: detectedLanguage,
    isDetecting,
    setLanguage,
    getDeviceInfo,
    supportedLanguages,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage debe ser usado dentro de LanguageProvider');
  }
  return context;
}
