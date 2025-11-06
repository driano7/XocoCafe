import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
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

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token no proporcionado' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const validated = userFeedbackSchema.parse(body);

    const user = await getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
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
      userId: decoded.userId,
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
  } catch (error: any) {
    console.error('Error guardando comentario:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Datos inválidos', errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
