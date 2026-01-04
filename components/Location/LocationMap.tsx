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

import { useEffect, useState } from 'react';

const MAP_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3673.0666030397556!2d-43.2027296!3d-22.984578199999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9bd59882ffa197%3A0xc2c8053202cfe6fb!2sThe%20Coffee!5e0!3m2!1ses-419!2smx!4v1762541810334!5m2!1ses-419!2smx';

interface LocationMapProps {
  className?: string;
}

export default function LocationMap({ className }: LocationMapProps) {
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsAndroid(/android/i.test(navigator.userAgent));
    }
  }, []);

  const loadingMode: 'lazy' | 'eager' = isAndroid ? 'eager' : 'lazy';

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
        src={MAP_EMBED_URL}
        style={{ border: 0, width: '100%', minHeight: '260px', height: 'min(420px, 60vw)' }}
      />
    </div>
  );
}
