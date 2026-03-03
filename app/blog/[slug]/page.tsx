/*
 * --------------------------------------------------------------------
 * Xoco Café — Software Property
 * Copyright (c) 2025 Xoco Café
 * Principal Developer: Donovan Riaño
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * --------------------------------------------------------------------
 * PROPIEDAD DEL SOFTWARE — XOCO CAFÉ.
 * Copyright (c) 2025 Xoco Café.
 * Desarrollador Principal: Donovan Riaño.
 *
 * Este archivo está licenciado bajo la Apache License 2.0.
 * Consulta el archivo LICENSE en la raíz del proyecto para más detalles.
 * --------------------------------------------------------------------
 */
import PageTitle from '@/components/PageTitle';
import ScrollProgressBar from '@/components/ScrollProgressBar';
import MDXTranslated from '@/components/MDXTranslated';
import PostLayout from '@/layouts/MDX/PostLayout';
import MainLayout from '@/layouts/MainLayout';
import { coreContent, formatBlogLink, sortedBlogPost } from '@/lib/utils/contentlayer';
import type { Blog } from 'contentlayer/generated';
import { allBlogs } from 'contentlayer/generated';
import { Metadata } from 'next';

type BlogBodyWithHtml = Blog['body'] & { html?: string };

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = params.slug;
  const post = allBlogs.find((p) => p.slug === slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.summary,
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  // Always use the Spanish version as the canonical source for translation
  const matchingPosts: Blog[] = allBlogs.filter((p) => p.slug === slug);
  const post = matchingPosts.find((p) => p.locale === 'es') || matchingPosts[0];

  // Navigation: use Spanish posts for prev/next
  const filteredPosts = sortedBlogPost(allBlogs.filter((p) => p.locale === 'es'));
  const postIndex = filteredPosts.findIndex((p) => p.slug === slug);
  const prevContent = filteredPosts[postIndex + 1] || null;
  const prev = prevContent ? coreContent(prevContent) : null;
  const nextContent = filteredPosts[postIndex - 1] || null;
  const next = nextContent ? coreContent(nextContent) : null;

  return (
    <>
      <ScrollProgressBar />
      <MainLayout>
        {post && 'draft' in post && post.draft !== true ? (
          <PostLayout
            content={coreContent(post)}
            prev={formatBlogLink(prev)}
            next={formatBlogLink(next)}
          >
            {/* MDXTranslated handles language detection client-side:
                - Spanish: renders the original body.html from contentlayer
                - Other: fetches translated markdown from /api/translate/mdx */}
            <MDXTranslated
              slug={slug}
              fallbackHtml={(post.body as BlogBodyWithHtml).html ?? ''}
              showLocationMap={Boolean(post.body.raw?.includes('<LocationMap'))}
            />
          </PostLayout>
        ) : (
          <div className="mt-24 text-center">
            <PageTitle>
              {' '}
              <span role="img" aria-label="roadwork sign">
                🚧
              </span>{' '}
              En construcción
            </PageTitle>
          </div>
        )}
      </MainLayout>
    </>
  );
}
