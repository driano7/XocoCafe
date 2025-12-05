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

import { sortedBlogPost } from '@/lib/utils/contentlayer';
import { allBlogs } from 'contentlayer/generated';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import {
  HiOutlineDocumentAdd,
  HiOutlineDocumentDuplicate,
  HiOutlineHome,
  HiOutlinePencil,
  HiOutlineUser,
} from 'react-icons/hi';
import { TbBolt, TbBoltOff } from 'react-icons/tb';

type PaletteOption = {
  id: string;
  name: string;
  onSelect: (v: string) => void;
  icon?: ReactNode;
};

export default function usePaletteOptions() {
  const router = useRouter();
  const sortedPosts = sortedBlogPost(allBlogs);
  const { theme, setTheme } = useTheme();

  const generalOptions: PaletteOption[] = [
    {
      id: 'Toggle Theme',
      name: 'Toggle Theme',
      icon: theme === 'dark' ? <TbBolt /> : <TbBoltOff />,
      onSelect: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    },
    {
      id: 'Copy Current URL',
      name: 'Copy Current URL',
      icon: <HiOutlineDocumentDuplicate />,
      onSelect: () => navigator.clipboard.writeText(window.location.href),
    },
  ];

  const pageOptions: PaletteOption[] = [
    { id: '/', name: 'Home', icon: <HiOutlineHome />, onSelect: (v) => router.push(v) },
    { id: '/blog', name: 'Blog', icon: <HiOutlinePencil />, onSelect: (v) => router.push(v) },
    { id: '/about', name: 'About', icon: <HiOutlineUser />, onSelect: (v) => router.push(v) },
    { id: '/uses', name: 'Menu', icon: <HiOutlineDocumentAdd />, onSelect: (v) => router.push(v) },
  ];

  const blogOptions: PaletteOption[] = sortedPosts.map((post) => ({
    id: post.slug,
    name: post.title,
    onSelect: (v) => router.push(`/blog/${v}`),
  }));

  return { pageOptions, blogOptions, generalOptions };
}
