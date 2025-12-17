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

import Link from 'next/link';

export default function Contact() {
  return (
    <section className="relative h-screen w-screen py-10 px-12 md:px-32 xl:px-36 dark:bg-black dark:text-white bg-white  text-black">
      <div className="flex flex-col justify-evenly h-5/6">
        <p className="text-3xl md:text-6xl xl:text-8xl">
          ¿A poco no se te antoja <br /> un buen{' '}
          <Link
            href="/blog/cafe"
            className="font-black text-primary-600 underline decoration-4 underline-offset-8 dark:text-primary-400"
          >
            Café
          </Link>
        </p>
        <p className="text-3xl md:text-6xl xl:text-8xl text-end">
          ó{' '}
          <Link
            href="/blog/chocolate"
            className="font-black text-primary-600 underline decoration-4 underline-offset-8 dark:text-primary-400"
          >
            Chocolate
          </Link>
          ?
        </p>
      </div>
    </section>
  );
}
