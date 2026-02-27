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

/* eslint-disable react/display-name */
'use client';
import { coreContent } from '@/lib/utils/contentlayer';
import type { Authors, Blog } from 'contentlayer/generated';
import type { MDXComponents } from 'mdx/types';
import { useMDXComponent } from 'next-contentlayer/hooks';
import Image from './Image';
import CustomLink from './Link';
import LinkButton from './LinkButton';
import Pre from './Pre';
import TOCInline from './TOCInline';
import WhatsAppCTA from './WhatsAppCTA';
import LocationMap from './Location/LocationMap';
import { AutoTranslateChildren } from './AutoTranslateContent';
import type { ElementType, ReactNode } from 'react';

const autoTranslateTags: Array<keyof JSX.IntrinsicElements> = [
  'p',
  'span',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'blockquote',
  'strong',
  'em',
  'small',
  'summary',
  'label',
  'caption',
  'th',
  'td',
];

type AutoTranslateWrapperProps = {
  children?: ReactNode;
  [key: string]: unknown;
};

const createAutoTranslateComponent =
  (Tag: ElementType) =>
  ({ children, ...rest }: AutoTranslateWrapperProps) => (
    <Tag {...rest}>
      <AutoTranslateChildren>{children}</AutoTranslateChildren>
    </Tag>
  );

interface MDXLayout {
  content: Blog | Authors;
  [key: string]: unknown;
}

const autoTranslateComponents = autoTranslateTags.reduce<Record<string, ElementType>>(
  (acc, tag) => {
    acc[tag] = createAutoTranslateComponent(tag);
    return acc;
  },
  {}
);

export const components: MDXComponents = {
  Image,
  TOCInline,
  a: CustomLink,
  pre: Pre,
  LinkButton,
  WhatsAppCTA,
  LocationMap,
  ...autoTranslateComponents,
};

export const MDXLayoutRenderer = ({ content, ...rest }: MDXLayout) => {
  const MDXLayout = useMDXComponent(content.body.code);
  const mainContent = coreContent(content);

  return <MDXLayout content={mainContent} components={components} {...rest} />;
};
