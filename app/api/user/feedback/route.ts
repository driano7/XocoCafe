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

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken, getUserById } from '@/lib/auth';
import { ensureProductExists } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { userFeedbackSchema } from '@/lib/validations/auth';

const FEEDBACK_PRODUCT_ID = 'feedback-general';
const FEEDBACK_PRODUCT_NAME = 'Feedback general';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let userId: string | null = null;
    let userFullName: string | null = null;

    if (token) {
      const decoded = verifyToken(token);
      if (!decoded) {
        return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
      }
      const authenticatedUser = await getUserById(decoded.userId);
      if (!authenticatedUser) {
        return NextResponse.json(
          { success: false, message: 'Usuario no encontrado' },
          { status: 404 }
        );
      }
      userId = authenticatedUser.id;
      const fullName = [authenticatedUser.firstName, authenticatedUser.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      userFullName = fullName || null;
    }

    const body = await request.json();
    const validated = userFeedbackSchema.parse(body);

    const resolvedName = validated.name || userFullName || null;
    if (!userId && !resolvedName) {
      return NextResponse.json(
        { success: false, message: 'Agrega un nombre para publicar tu comentario.' },
        { status: 400 }
      );
    }

    const productRowId = await ensureProductExists({
      productId: FEEDBACK_PRODUCT_ID,
      name: FEEDBACK_PRODUCT_NAME,
      category: 'feedback',
      subcategory: 'comentarios',
      price: 0,
      cost: 0,
      lowStockThreshold: 0,
    });

    const feedbackRecord = {
      id: randomUUID(),
      userId,
      reviewerName: resolvedName,
      productId: productRowId,
      rating: validated.rating,
      title: validated.title ?? null,
      content: validated.content,
      helpfulVotes: 0,
      totalVotes: 0,
      verifiedPurchase: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('reviews').insert(feedbackRecord);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      message: '¡Gracias por tu comentario! Lo recibimos correctamente.',
    });
  } catch (error: unknown) {
    console.error('Error guardando comentario:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Datos inválidos', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
