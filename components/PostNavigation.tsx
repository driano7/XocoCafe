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

import { BlogLink } from '@/lib/utils/contentlayer';
import Link from 'next/link';

interface PostNavigationProps {
  prev?: BlogLink;
  next?: BlogLink;
}

export default function PostNavigation({ prev, next }: PostNavigationProps) {
  return (
    <div className="grid grid-rows-2 gap-3 pt-4 sm:grid-cols-2 sm:pt-6">
      <div>
        {prev && (
          <div className="flex flex-col items-center space-y-1 sm:items-start">
            <span className="italic">Previous Blog</span>
            <Link
              href={`/blog/${prev.slug}`}
              className="underline-magical max-w-sm truncate sm:max-w-[250px] xl:max-w-md"
            >
              &larr; {prev.title}
            </Link>
          </div>
        )}
      </div>
      <div>
        {next && (
          <div className="flex flex-col items-center space-y-1 sm:items-end">
            <span className="italic">Next Blog</span>
            <Link
              href={`/blog/${next.slug}`}
              className="underline-magical max-w-sm truncate sm:max-w-[250px] xl:max-w-md"
            >
              {next.title} &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
