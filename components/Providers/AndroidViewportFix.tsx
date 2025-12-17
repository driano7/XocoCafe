'use client';

import { useEffect } from 'react';

const ANDROID_VIEWPORT_CONTENT = 'width=device-width, initial-scale=1, minimum-scale=1';

export default function AndroidViewportFix() {
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    if (!/Android/i.test(navigator.userAgent)) return;

    const head = document.head;
    if (!head) return;

    let viewportMeta = head.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      head.appendChild(viewportMeta);
    }
    viewportMeta.content = ANDROID_VIEWPORT_CONTENT;
  }, []);

  return null;
}
