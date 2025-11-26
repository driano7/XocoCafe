import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { insertLoyaltyEntry } from '@/lib/loyalty';

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

    const { count, error } = await supabase
      .from('loyalty_points')
      .select('id', { count: 'exact', head: true })
      .eq('userId', decoded.userId)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json({
        success: true,
        message: 'Tu programa de lealtad ya estaba activo.',
        alreadyActive: true,
      });
    }

    await insertLoyaltyEntry({
      id: randomUUID(),
      userId: decoded.userId,
      points: 0,
      reason: 'program_activation',
      metadata: {
        action: 'activation',
        source: 'loyalty_activation_prompt',
        occurredAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: '¡Listo! Activamos tu programa de lealtad.',
      alreadyActive: false,
    });
  } catch (error: any) {
    console.error('Error activando programa de lealtad:', error);
    return NextResponse.json(
      { success: false, message: 'No pudimos activar tu programa de lealtad.' },
      { status: 500 }
    );
  }
}
