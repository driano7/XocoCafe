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

import ListLayout from '@/layouts/MDX/ListLayout';
import MainLayout from '@/layouts/MainLayout';
import { allCoreContent } from '@/lib/utils/contentlayer';
import kebabCase from '@/lib/utils/kebabCase';
import { allBlogs } from 'contentlayer/generated';

export const metadata = {
  title: 'Blog - Dale Larroder',
  description: 'My Tags - Dale Larroder',
};

export default function Tag({ params }: { params: { tag: string } }) {
  const { tag } = params;
  const posts = allCoreContent(
    allBlogs.filter(
      (post) => post.draft !== true && post.tags?.map((t) => kebabCase(t)).includes(tag)
    )
  );

  // Capitalize first letter and convert space to dash
  const title = tag[0].toUpperCase() + tag.split(' ').join('-').slice(1);

  return (
    <MainLayout>
      <ListLayout posts={posts} title={title} />
    </MainLayout>
  );
}
