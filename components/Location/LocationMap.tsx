/*
 * --------------------------------------------------------------------
 * Xoco Café — Software Property
 * Copyright (c) 2025 Xoco Café
 * Principal Developer: Donovan Riaño
 * Licensed under the Apache License, Version 2.0
 * --------------------------------------------------------------------
 */
'use client';

import { useEffect, useState } from 'react';

interface LocationMapProps {
  className?: string;
}

// Coordenadas del café demo (Ipanema, Río de Janeiro)
const LAT = -22.984578;
const LON = -43.202729;
const ZOOM = 16;

export default function LocationMap({ className }: LocationMapProps) {
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsAndroid(/android/i.test(navigator.userAgent || navigator.vendor || ''));
    }
  }, []);

  const loadingMode: 'lazy' | 'eager' = isAndroid ? 'eager' : 'lazy';

  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${LON - 0.005}%2C${
    LAT - 0.003
  }%2C${LON + 0.005}%2C${LAT + 0.003}&layer=mapnik&marker=${LAT}%2C${LON}&zoom=${ZOOM}`;

  return (
    <div
      className={`my-6 w-full overflow-hidden rounded-3xl shadow-2xl ${className ?? ''}`}
      data-device={isAndroid ? 'android' : 'default'}
    >
      <iframe
        title="Cómo llegar a Xoco Café"
        loading={loadingMode}
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={osmUrl}
        style={{ border: 0, width: '100%', minHeight: '260px', height: 'min(420px, 60vw)' }}
      />
    </div>
  );
}
