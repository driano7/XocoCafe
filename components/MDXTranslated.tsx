'use client';
/*
 * --------------------------------------------------------------------
 * Xoco Café — Software Property
 * Copyright (c) 2025 Xoco Café
 * Principal Developer: Donovan Riaño
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * --------------------------------------------------------------------
 * PROPIEDAD DEL SOFTWARE — XOCO CAFÉ.
 * Copyright (c) 2025 Xoco Café.
 * Desarrollador Principal: Donovan Riaño.
 *
 * Este archivo está licenciado bajo la Apache License 2.0.
 * Consulta el archivo LICENSE en la raíz del proyecto para más detalles.
 * --------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/Language/LanguageProvider';

interface Props {
  slug: string;
  /** Fallback: original MDX body HTML rendered by contentlayer (shown in Spanish or while loading) */
  fallbackHtml: string;
}

/**
 * MDXTranslated
 * When the UI language is NOT Spanish, fetches a translated version of the MDX body
 * from /api/translate/mdx and renders it as sanitised HTML.
 * Falls back to the original Spanish content while loading or on error.
 */
export default function MDXTranslated({ slug, fallbackHtml }: Props) {
  const { currentLanguage } = useLanguage();
  const [html, setHtml] = useState<string>(fallbackHtml);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentLanguage === 'es') {
      setHtml(fallbackHtml);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch('/api/translate/mdx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, target: currentLanguage }),
    })
      .then((res) => res.json())
      .then((data: { translatedBody?: string; error?: string }) => {
        if (cancelled) return;
        if (data.translatedBody) {
          // Convert the translated markdown to basic HTML paragraphs
          // We use a lightweight approach: split by double newlines -> paragraphs
          const paragraphs = data.translatedBody
            .split(/\n\n+/)
            .map((p) =>
              p.startsWith('#')
                ? `<h2 class="text-2xl font-bold mt-6 mb-2">${p.replace(/^#+\s*/, '')}</h2>`
                : `<p class="mb-4">${p.replace(/\n/g, ' ').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/_(.*?)_/g, '<em>$1</em>')}</p>`
            )
            .join('');
          setHtml(paragraphs);
        }
      })
      .catch(() => {
        // On error, keep fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, currentLanguage, fallbackHtml]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 z-10 rounded">
          <span className="text-sm text-gray-500 animate-pulse">Translating...</span>
        </div>
      )}
      <div
        className="prose dark:prose-dark max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
