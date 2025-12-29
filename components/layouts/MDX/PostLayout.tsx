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

import AnimatedHeading from '@/components/AnimatedHeading';
import PageTitle from '@/components/PageTitle';
import PostNavigation from '@/components/PostNavigation';
import { CoreContent } from '@/lib/utils/contentlayer';
import siteMetadata from 'content/siteMetadata';
import type { Blog } from 'contentlayer/generated';
import { ReactNode } from 'react';
import SupportBanner from '@/components/SupportBanner';

const postDateTemplate: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

interface Props {
  content: CoreContent<Blog>;
  children: ReactNode;
  next?: { slug: string; title: string };
  prev?: { slug: string; title: string };
}

export default function PostLayout({ content, children, next, prev }: Props) {
  const { date, title, author, readingTime } = content;

  return (
    <article>
      <header className="space-y-1 rounded-lg bg-primary-500 py-4 px-2 text-center sm:py-6 md:py-10">
        <PageTitle>
          <AnimatedHeading text={title} />
        </PageTitle>
        <dl>
          <dt className="sr-only">Published on</dt>
          <dd className="flex flex-col justify-center text-base font-medium leading-6 text-white sm:flex-row sm:space-x-2">
            <div className="flex items-center justify-center space-x-2">
              <span>{author}</span>
              <span>-</span>
              <time dateTime={date}>
                {`${new Date(date).toLocaleDateString(siteMetadata.locale, postDateTemplate)}`}
              </time>
            </div>
            <span className="hidden sm:block">-</span>
            <span>{readingTime.text}</span>
          </dd>
        </dl>
      </header>
      <div
        className="divide-y divide-gray-200 font-medium dark:divide-gray-700 xl:grid xl:grid-cols-4 xl:gap-x-6 xl:divide-y-0"
        style={{ gridTemplateRows: 'auto 1fr' }}
      >
        <div className="divide-y divide-gray-200 dark:divide-gray-700 xl:col-span-4 xl:row-span-2 xl:pb-0">
          <div className="prose max-w-none pt-8 pb-8 dark:prose-dark">
            {children}
            <PostNavigation prev={prev} next={next} />
            <SupportBanner />
            {/* <PostComments /> */}
          </div>
        </div>
      </div>
    </article>
  );
}
