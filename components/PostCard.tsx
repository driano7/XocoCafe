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

import Tag from '@/components/Tag';
import { CoreContent } from '@/lib/utils/contentlayer';
import type { Blog } from 'contentlayer/generated';
import { motion } from 'framer-motion';
import Link from 'next/link';

export interface PostCardProps {
  posts: CoreContent<Blog>[];
  showTags?: boolean;
}

export default function PostCard({ posts, showTags = true }: PostCardProps) {
  return (
    <ul>
      {posts.map(({ slug, title, tags, summary }, index) => (
        <motion.li
          key={slug}
          className="py-2"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: index / 10 }}
        >
          <Link href={`/blog/${slug}`} aria-label={`Read "${title}"`} legacyBehavior>
            <article className="cursor-pointer gap-3 space-y-2 bg-opacity-20 py-5 xl:grid xl:grid-cols-4 xl:items-baseline xl:space-y-0">
              <div className="space-y-3 xl:col-span-4">
                <span className="text-2xl font-bold leading-8 tracking-tight">
                  <Link href={`/blog/${slug}`}>
                    <span className="text-primary-500 duration-300 hover:text-primary-400">
                      {title}
                    </span>
                  </Link>
                </span>
                {showTags && tags && (
                  <div className="flex flex-wrap gap-3">
                    {tags.map((tag) => (
                      <Tag key={tag} text={tag} />
                    ))}
                  </div>
                )}
                <div className="prose max-w-none text-gray-900 dark:text-gray-100">{summary}</div>
              </div>
            </article>
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}
