import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, logDataRetentionAction, getUserById } from '@/lib/auth';
import { updateConsentSchema } from '@/lib/validations/auth';
import { supabase } from '@/lib/supabase';

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

    const body = await request.json();
    const validatedData = updateConsentSchema.parse(body);

    // Actualizar consentimientos
    const { error } = await supabase
      .from('users')
      .update({
        marketingEmail: validatedData.marketingEmail,
        marketingSms: validatedData.marketingSms,
        marketingPush: validatedData.marketingPush,
        consentUpdatedAt: new Date().toISOString(),
      })
      .eq('id', decoded.userId);

    if (error) {
      throw new Error(error.message);
    }

    const updatedUser = await getUserById(decoded.userId);
    if (!updatedUser) {
      throw new Error('No se pudo recuperar el usuario actualizado');
    }

    // Log de actualización de consentimientos
    await logDataRetentionAction(decoded.userId, 'consent_update', {
      timestamp: new Date().toISOString(),
      consentChanges: {
        marketingEmail: validatedData.marketingEmail,
        marketingSms: validatedData.marketingSms,
        marketingPush: validatedData.marketingPush,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Preferencias actualizadas exitosamente',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error actualizando consentimientos:', error);

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
