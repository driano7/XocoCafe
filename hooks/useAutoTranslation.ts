'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/Language/LanguageProvider';

type TranslationStatus = 'idle' | 'loading' | 'error';

const STORAGE_KEY = 'xoco_auto_translation_cache';
const translationCache = new Map<string, string>();
let persistentCacheLoaded = false;

const loadPersistentCache = () => {
  if (persistentCacheLoaded || typeof window === 'undefined') return;
  persistentCacheLoaded = true;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored) as Record<string, string>;
    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === 'string') {
        translationCache.set(key, value);
      }
    });
  } catch (error) {
    console.error('No se pudo cargar la caché de traducciones automáticas:', error);
  }
};

const persistTranslation = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as Record<string, string>) : {};
    parsed[key] = value;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.error('No se pudo guardar la traducción automática en caché:', error);
  }
};

export function useAutoTranslation(sourceText?: string) {
  const { currentLanguage } = useLanguage();
  const shouldTranslate = currentLanguage === 'en';
  const normalizedText = sourceText?.trim();
  const [translation, setTranslation] = useState<string | null>(null);
  const [status, setStatus] = useState<TranslationStatus>('idle');

  useEffect(() => {
    if (!normalizedText || !shouldTranslate) {
      setTranslation(null);
      setStatus('idle');
      return;
    }

    loadPersistentCache();

    const cacheKey = normalizedText;
    const cached = translationCache.get(cacheKey);
    if (cached) {
      setTranslation(cached);
      setStatus('idle');
      return;
    }

    const controller = new AbortController();
    let active = true;

    setStatus('loading');

    fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: normalizedText }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}) as Record<string, string>)) as {
          translatedText?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || 'Error desconocido');
        }

        if (!payload.translatedText) {
          throw new Error('Respuesta inválida de traducción.');
        }

        return payload.translatedText;
      })
      .then((translated) => {
        if (!active) return;
        translationCache.set(cacheKey, translated);
        persistTranslation(cacheKey, translated);
        setTranslation(translated);
        setStatus('idle');
      })
      .catch((error) => {
        if (!active) return;
        console.error('Auto translation failed:', error);
        setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [normalizedText, shouldTranslate]);

  return { translation, status, shouldTranslate };
}
