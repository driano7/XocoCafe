import { NextResponse } from 'next/server';

type TranslateRequest = {
  text?: string;
  source?: string;
  target?: string;
};

const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.de/translate';
const LIBRETRANSLATE_KEY = process.env.LIBRETRANSLATE_KEY;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as TranslateRequest;
  const text = body.text?.trim();

  if (!text) {
    return NextResponse.json({ error: 'El texto es requerido.' }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    q: text,
    source: body.source || 'es',
    target: body.target || 'en',
    format: 'text',
  };

  if (LIBRETRANSLATE_KEY) {
    payload.api_key = LIBRETRANSLATE_KEY;
  }

  try {
    const response = await fetch(LIBRETRANSLATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

    const translatedText =
      data && typeof data === 'object' && 'translatedText' in data
        ? (data as Record<string, string>).translatedText
        : data && typeof data === 'object' && 'translated_text' in data
        ? (data as Record<string, string>).translated_text
        : '';

    if (!translatedText) {
      return NextResponse.json({ error: 'No se recibió texto traducido.' }, { status: 502 });
    }

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('Auto-translate proxy failed:', error);
    return NextResponse.json(
      { error: 'No se pudo conectar con LibreTranslate. Revisa la configuración.' },
      { status: 502 }
    );
  }
}
