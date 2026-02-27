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

import { ensureProductExists } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { decryptUserData } from '@/lib/encryption';
import AutoTranslatedText from '@/components/AutoTranslatedText';
import ShareExperienceForm from './ShareExperienceForm';
import FeedbackCarousel, { type FeedbackHighlight } from './FeedbackCarousel';
import { FiStar } from 'react-icons/fi';

const FEEDBACK_PRODUCT_ID = 'feedback-general';
const FEEDBACK_PRODUCT_NAME = 'Feedback general';

type ReviewRow = {
  id: string;
  rating: number | null;
  title: string | null;
  content: string;
  createdAt: string;
  reviewerName: string | null;
  userId: string | null;
};

type UserRow = {
  id: string;
  email: string;
  firstNameEncrypted: string | null;
  firstNameIv: string | null;
  firstNameTag: string | null;
  firstNameSalt: string | null;
  lastNameEncrypted: string | null;
  lastNameIv: string | null;
  lastNameTag: string | null;
  lastNameSalt: string | null;
};

type RatingSummary = {
  average: number;
  count: number;
};

const buildHighlights = (
  reviews: ReviewRow[],
  userNames: Record<string, string>
): FeedbackHighlight[] => {
  if (reviews.length === 0) {
    return [
      {
        id: 'placeholder',
        name: 'Tu voz importa',
        rating: 5,
        title: 'Sé el primero',
        summary: 'Comparte tu experiencia en este blog y ayúdanos a mejorar cada detalle.',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  return reviews.map((review) => ({
    id: review.id,
    name: review.reviewerName || userNames[review.userId ?? ''] || 'Anónimo especial',
    rating: review.rating ?? 5,
    title: review.title || 'Experiencias reales',
    summary: review.content,
    createdAt: review.createdAt,
  }));
};

export default async function BlogFeedbackSection() {
  let highlights: FeedbackHighlight[] = [
    {
      id: 'placeholder',
      name: 'Tu voz importa',
      rating: 5,
      title: 'Sé el primero',
      summary: 'Comparte tu experiencia en este blog y ayúdanos a mejorar cada detalle.',
      createdAt: new Date().toISOString(),
    },
  ];
  let ratingSummary: RatingSummary = {
    average: 0,
    count: 0,
  };

  try {
    const productRowId = await ensureProductExists({
      productId: FEEDBACK_PRODUCT_ID,
      name: FEEDBACK_PRODUCT_NAME,
      category: 'feedback',
      subcategory: 'comentarios',
      price: 0,
      cost: 0,
      lowStockThreshold: 0,
    });

    const reviewsResponse = await supabase
      .from('reviews')
      .select('id,rating,title,content,createdAt,reviewerName,userId')
      .eq('productId', productRowId)
      .order('createdAt', { ascending: false })
      .limit(6);
    const reviews: ReviewRow[] = (reviewsResponse.data ?? []) as ReviewRow[];

    const userIds = Array.from(new Set(reviews.map((review) => review.userId).filter(Boolean)));
    const userNames: Record<string, string> = {};

    if (userIds.length > 0) {
      const usersResponse = await supabase
        .from('users')
        .select(
          'id,email,firstNameEncrypted,firstNameIv,firstNameTag,firstNameSalt,lastNameEncrypted,lastNameIv,lastNameTag,lastNameSalt'
        )
        .in('id', userIds);
      const users: UserRow[] = usersResponse.data ?? [];

      users.forEach((user) => {
        const decrypted = decryptUserData(user.email, user);
        const fullName = [decrypted.firstName, decrypted.lastName].filter(Boolean).join(' ').trim();
        if (fullName) {
          userNames[user.id] = fullName;
        }
      });
    }

    highlights = buildHighlights(reviews, userNames);
    const validRatings = reviews
      .map((review) => review.rating)
      .filter((rating): rating is number => typeof rating === 'number' && !Number.isNaN(rating));
    const count = validRatings.length;
    const average = count ? validRatings.reduce((total, rating) => total + rating, 0) / count : 0;
    ratingSummary = {
      average,
      count,
    };
  } catch (error: unknown) {
    console.error('No se pudieron cargar los comentarios dinámicos:', error);
  }

  return (
    <section id="feedback" className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl space-y-10 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#050912] via-[#0b1221] to-[#141f33] p-8 shadow-2xl shadow-black/40 sm:p-12">
        <div className="space-y-4 text-white">
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">Blog + Feedback</p>
          <h2 className="text-3xl font-black leading-tight sm:text-4xl">
            Tu experiencia inspira el próximo capítulo
          </h2>
          <AutoTranslatedText
            spanish="Deja un comentario, comparte lo que más te gustó o sugiere algo nuevo. Transformamos estos insights en acciones reales y los mostramos en un carrusel que evoluciona automáticamente."
            as="p"
            className="max-w-3xl text-base text-white/80"
          />
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/20 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">Calificación</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="text-5xl font-black text-white">
                  {ratingSummary.count ? ratingSummary.average.toFixed(1) : '—'}
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-sm text-white/70">
                    {Array.from({ length: 5 }, (_, index) => {
                      const fillRatio = ratingSummary.count
                        ? Math.min(Math.max(ratingSummary.average - index, 0), 1)
                        : 0;
                      const fillPercent = Math.round(fillRatio * 100);

                      const starStyle =
                        ratingSummary.count > 0
                          ? {
                              background: `linear-gradient(90deg, #facc15 ${fillPercent}%, rgba(255,255,255,0.4) ${fillPercent}%)`,
                              WebkitBackgroundClip: 'text' as const,
                              WebkitTextFillColor: 'transparent' as const,
                            }
                          : undefined;

                      return (
                        <FiStar
                          key={index}
                          className="h-4 w-4 transition-colors text-white/30"
                          style={starStyle}
                        />
                      );
                    })}
                    <span className="text-base font-semibold text-white">
                      {ratingSummary.count ? ratingSummary.count : 'Sin reseñas'}
                    </span>
                  </div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                    {ratingSummary.count ? 'reseñas' : 'Aún no hay calificaciones'}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white/90 p-6 shadow-2xl shadow-black/30 dark:bg-gray-950/80">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Comparte tu comentario
              </h3>
              <AutoTranslatedText
                spanish="¿Tienes algo que contarnos? Usa el botón de mensajes del dock y deja tu voz aquí."
                as="p"
                className="mb-4 text-sm text-gray-600 dark:text-gray-300"
              />
              <ShareExperienceForm showNameField allowAnonymous className="text-sm" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/5 p-6">
            <FeedbackCarousel items={highlights} />
          </div>
        </div>
      </div>
    </section>
  );
}
