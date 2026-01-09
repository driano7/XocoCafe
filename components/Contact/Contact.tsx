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

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Contact() {
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  };

  return (
    <section className="relative w-full bg-white py-24 text-black dark:bg-black dark:text-white lg:py-40">
      {/* Resaltado perimetral Permanente (Color Café) */}
      <div className="pointer-events-none absolute inset-0 z-50 border-[20px] border-primary-600/30" />

      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">
        <div className="flex flex-col gap-20 lg:gap-32">
          {/* Bloque 1: Café */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={containerVariants}
            className="flex flex-col items-start"
          >
            <p className="text-4xl font-semibold leading-tight md:text-7xl lg:text-8xl">
              ¿A poco no se te antoja
              <br />
              un buen{' '}
              <Link
                href="/blog/cafe"
                className="font-black text-primary-600 underline decoration-4 underline-offset-8 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Café
              </Link>
            </p>
          </motion.div>

          {/* Bloque 2: Chocolate */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={containerVariants}
            className="flex flex-col items-end text-end"
          >
            <p className="text-4xl font-semibold leading-tight md:text-7xl lg:text-8xl">
              ó{' '}
              <Link
                href="/blog/chocolate"
                className="font-black text-primary-600 underline decoration-4 underline-offset-8 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Chocolate
              </Link>
              ?
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
