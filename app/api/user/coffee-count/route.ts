import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const authenticate = (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Token no proporcionado' },
        { status: 401 }
      ),
    };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return {
      error: NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 }),
    };
  }

  return { decoded, token };
};

export async function GET(request: NextRequest) {
  const auth = authenticate(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('weeklyCoffeeCount')
      .eq('id', auth.decoded.userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    let weeklyCoffeeCount = user?.weeklyCoffeeCount ?? null;

    if (weeklyCoffeeCount === null || weeklyCoffeeCount === undefined) {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setHours(0, 0, 0, 0);
      const day = startOfWeek.getDay();
      const diff = (day + 6) % 7; // lunes como inicio
      startOfWeek.setDate(startOfWeek.getDate() - diff);

      const { count: loyaltyCount, error: loyaltyError } = await supabase
        .from('loyalty_points')
        .select('id', { count: 'exact', head: true })
        .eq('userId', auth.decoded.userId)
        .eq('reason', 'coffee_increment')
        .gte('createdAt', startOfWeek.toISOString());

      if (loyaltyError) {
        throw new Error(loyaltyError.message);
      }

      weeklyCoffeeCount = loyaltyCount ?? 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        weeklyCoffeeCount: Math.min(weeklyCoffeeCount ?? 0, 7),
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo contador de cafés:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();
    const { increment = 1 } = body;

    // Obtener usuario actual
    const { data: user, error } = await supabase
      .from('users')
      .select('weeklyCoffeeCount')
      .eq('id', auth.decoded.userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const previousCount = user.weeklyCoffeeCount ?? 0;
    const newCount = Math.min(previousCount + increment, 7); // Máximo 7

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        weeklyCoffeeCount: newCount,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', auth.decoded.userId)
      .select('id,weeklyCoffeeCount')
      .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (!updatedUser) {
      throw new Error('No se pudo recuperar la actualización del usuario');
    }

    const incrementMetadata = {
      increment,
      previousCount,
      newCount,
      action: 'increment',
      source: 'loyalty_flip_card',
      occurredAt: new Date().toISOString(),
    };

    await insertLoyaltyEntry({
      id: randomUUID(),
      userId: auth.decoded.userId,
      points: updatedUser.weeklyCoffeeCount,
      reason: 'coffee_increment',
      metadata: incrementMetadata,
    });

    let rewardEarned = false;
    let finalCount = updatedUser.weeklyCoffeeCount;

    if (newCount >= 7) {
      rewardEarned = true;

      await insertLoyaltyEntry({
        id: randomUUID(),
        userId: auth.decoded.userId,
        points: updatedUser.weeklyCoffeeCount,
        reason: 'coffee_reward',
        metadata: {
          action: 'reward_claimed',
          previousCount: newCount,
          source: 'loyalty_flip_card',
          occurredAt: new Date().toISOString(),
        },
      });

      const { data: resetResult, error: resetError } = await supabase
        .from('users')
        .update({
          weeklyCoffeeCount: 0,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', auth.decoded.userId)
        .select('weeklyCoffeeCount')
        .maybeSingle();

      if (resetError) {
        throw new Error(resetError.message);
      }

      finalCount = resetResult?.weeklyCoffeeCount ?? 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        weeklyCoffeeCount: finalCount,
        rewardEarned,
        message: rewardEarned
          ? '¡Felicidades! Ganaste un americano y reiniciamos tu contador.'
          : null,
      },
    });
  } catch (error: any) {
    console.error('Error actualizando contador de cafés:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

let loyaltyMetadataSupported = true;

async function insertLoyaltyEntry({
  id,
  userId,
  points,
  reason,
  metadata,
}: {
  id: string;
  userId: string;
  points: number;
  reason: string;
  metadata?: Record<string, unknown>;
}) {
  const payload = {
    id,
    userId,
    points,
    reason,
    orderId: null as string | null,
    expiresAt: null as string | null,
    createdAt: new Date().toISOString(),
  };

  if (metadata && loyaltyMetadataSupported) {
    const { error } = await supabase.from('loyalty_points').insert({ ...payload, metadata });
    if (error) {
      if (error.message?.includes('metadata')) {
        loyaltyMetadataSupported = false;
        console.warn(
          "Columna 'metadata' ausente en loyalty_points. Reintentando inserciones sin metadata."
        );
        const fallback = await supabase.from('loyalty_points').insert(payload);
        if (fallback.error) {
          console.error('Error registrando historial de lealtad:', fallback.error);
        }
      } else {
        console.error('Error registrando historial de lealtad:', error);
      }
    }
    return;
  }

  const { error } = await supabase.from('loyalty_points').insert(payload);
  if (error) {
    console.error('Error registrando historial de lealtad:', error);
  }
}

// Endpoint para resetear el contador semanal (se puede llamar cada lunes)
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token no proporcionado' },
        { status: 401 }
      );
    }

    // Verificar token
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('weeklyCoffeeCount')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    const previousCount = user?.weeklyCoffeeCount ?? 0;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        weeklyCoffeeCount: 0,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', decoded.userId)
      .select('id,weeklyCoffeeCount')
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!updatedUser) {
      throw new Error('No se pudo recuperar la actualización del usuario');
    }

    await insertLoyaltyEntry({
      id: randomUUID(),
      userId: decoded.userId,
      points: updatedUser.weeklyCoffeeCount,
      reason: 'coffee_reset',
      metadata: {
        action: 'reset',
        previousCount,
        source: 'loyalty_flip_card',
        occurredAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        weeklyCoffeeCount: updatedUser.weeklyCoffeeCount,
        message: 'Contador semanal reiniciado',
      },
    });
  } catch (error: any) {
    console.error('Error reseteando contador de cafés:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
