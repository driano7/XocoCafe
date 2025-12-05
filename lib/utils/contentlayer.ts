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

import kebabCase from '@/lib/utils/kebabCase';
import type { Blog, DocumentTypes } from 'contentlayer/generated';

export function dateSortDesc(a: string, b: string) {
  if (a > b) return -1;
  if (a < b) return 1;
  return 0;
}

export function sortedBlogPost(allBlogs: Blog[]) {
  return allBlogs.sort((a, b) => dateSortDesc(a.date, b.date)).filter((p) => p.draft === false);
}

type ConvertUndefined<T> = OrNull<{
  [K in keyof T as undefined extends T[K] ? K : never]-?: T[K];
}>;
type OrNull<T> = { [K in keyof T]: Exclude<T[K], undefined> | null };
type PickRequired<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};
type ConvertPick<T> = ConvertUndefined<T> & PickRequired<T>;

/**
 *
 * https://github.com/contentlayerdev/contentlayer/issues/24
 */
export const pick = <Obj, Keys extends keyof Obj>(
  obj: Obj,
  keys: Keys[]
): ConvertPick<{ [K in Keys]: Obj[K] }> => {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key] ?? null;
    return acc;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, {} as any);
};

export const omit = <Obj, Keys extends keyof Obj>(obj: Obj, keys: Keys[]): Omit<Obj, Keys> => {
  const result = Object.assign({}, obj);
  keys.forEach((key) => {
    delete result[key];
  });
  return result;
};

export type CoreContent<T> = Omit<T, 'body' | '_raw' | '_id'>;

export function coreContent<T extends DocumentTypes>(content: T) {
  return omit(content, ['body', '_raw', '_id']);
}

export function allCoreContent<T extends DocumentTypes>(contents: T[]) {
  return contents.map((c) => coreContent(c));
}

export function getAllTags(allBlogs: Blog[]) {
  const tagCount: Record<string, number> = {};
  // Iterate through each post, putting all found tags into `tags`
  allBlogs.forEach((file) => {
    if (file.tags && file.draft !== true) {
      file.tags.forEach((tag) => {
        const formattedTag = kebabCase(tag);
        if (formattedTag in tagCount) {
          tagCount[formattedTag] += 1;
        } else {
          tagCount[formattedTag] = 1;
        }
      });
    }
  });

  return tagCount;
}

export type BlogLink = { slug: string; title: string };

export function formatBlogLink(
  blog: Omit<Blog, 'body' | '_raw' | '_id'> | null
): BlogLink | undefined {
  if (blog) {
    return {
      title: blog?.title,
      slug: blog?.slug,
    };
  }
  return undefined;
}
