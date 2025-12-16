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

import siteMetadata from 'content/siteMetadata';
import Link from 'next/link';
import { FaWhatsapp } from 'react-icons/fa';

interface WhatsAppCTAProps {
  prefix?: string;
  suffix?: string;
}

export default function WhatsAppCTA({
  prefix = 'Si necesitas ayuda, mándanos un',
  suffix = 'y con gusto te atendemos.',
}: WhatsAppCTAProps) {
  return (
    <div className="my-8 flex flex-wrap items-center justify-center gap-2 rounded-3xl bg-primary-600 px-4 py-3 text-sm text-white shadow-lg dark:bg-primary-900/30 dark:text-primary-100">
      <span>{prefix}</span>
      <Link
        href={siteMetadata.whats}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white shadow transition-colors hover:bg-white/30 dark:bg-[#0f1728]"
        aria-label="WhatsApp"
      >
        <FaWhatsapp />
      </Link>
      <span>{suffix}</span>
    </div>
  );
}
