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
import { NextResponse } from 'next/server';
import { allBlogs } from 'contentlayer/generated';

const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.de/translate';
const LIBRETRANSLATE_KEY = process.env.LIBRETRANSLATE_KEY;

/**
 * POST /api/translate/mdx
 * Body: { slug: string, target?: string }
 * Returns: { translatedBody: string } (markdown translated from es to target)
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { slug?: string; target?: string };
  const slug = body.slug?.trim();
  const target = body.target || 'en';

  if (!slug) {
    return NextResponse.json({ error: 'slug es requerido.' }, { status: 400 });
  }

  // Find the Spanish version of the post
  const post = allBlogs.find((p) => p.slug === slug && (p as any).locale === 'es')
    || allBlogs.find((p) => p.slug === slug);

  if (!post) {
    return NextResponse.json({ error: 'Post no encontrado.' }, { status: 404 });
  }

  // If target is same as source, return original
  if (target === 'es') {
    return NextResponse.json({ translatedBody: post.body.raw });
  }

  const payload: Record<string, unknown> = {
    q: post.body.raw,
    source: 'es',
    target,
    format: 'text',
  };

  if (LIBRETRANSLATE_KEY) {
    payload.api_key = LIBRETRANSLATE_KEY;
  }

  try {
    const response = await fetch(LIBRETRANSLATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        (data && typeof data === 'object' && 'error' in data
          ? (data as Record<string, string>).error
          : undefined) || 'Error al traducir.';
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const translatedBody =
      (data && typeof data === 'object' && 'translatedText' in data
        ? (data as Record<string, string>).translatedText
        : data && typeof data === 'object' && 'translated_text' in data
        ? (data as Record<string, string>).translated_text
        : null) || '';

    if (!translatedBody) {
      return NextResponse.json({ error: 'No se recibió texto traducido.' }, { status: 502 });
    }

    return NextResponse.json({ translatedBody });
  } catch (error) {
    console.error('MDX translate error:', error);
    return NextResponse.json(
      { error: 'No se pudo conectar con LibreTranslate.' },
      { status: 502 }
    );
  }
}
