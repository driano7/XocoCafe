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
import ShareExperienceForm from './ShareExperienceForm';
import FeedbackCarousel, { type FeedbackHighlight } from './FeedbackCarousel';

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
          <p className="max-w-3xl text-base text-white/80">
            Deja un comentario, comparte lo que más te gustó o sugiere algo nuevo. Transformamos
            estos insights en acciones reales y los mostramos en un carrusel que evoluciona
            automáticamente, igualito a la experiencia de las reseñas de AirBnB.
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="rounded-3xl bg-white/90 p-6 shadow-2xl shadow-black/30 dark:bg-gray-950/80">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Comparte tu comentario
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              ¿Tienes algo que contarnos? Usa el botón de mensajes del dock y deja tu voz aquí.
            </p>
            <ShareExperienceForm showNameField allowAnonymous className="text-sm" />
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/5 p-6">
            <FeedbackCarousel items={highlights} />
          </div>
        </div>
      </div>
    </section>
  );
}
