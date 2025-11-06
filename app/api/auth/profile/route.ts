import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById, logDataRetentionAction } from '@/lib/auth';
import { updateProfileSchema } from '@/lib/validations/auth';
import { encryptUserData, mapEncryptedDataToColumnNames } from '@/lib/encryption';
import { supabase } from '@/lib/supabase';
import { normalizeWalletAddress } from '@/lib/wallet';

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
    const validatedData = updateProfileSchema.parse(body);

    const sensitivePayload = {
      firstName: validatedData.firstName || null,
      lastName: validatedData.lastName || null,
      phone: validatedData.phone || null,
    };
    const encryptedData = mapEncryptedDataToColumnNames(
      encryptUserData(decoded.email, sensitivePayload)
    );

    const updatePayload = {
      ...encryptedData,
      city: validatedData.city || null,
      country: validatedData.country || null,
      walletAddress: normalizeWalletAddress(validatedData.walletAddress),
      avatarUrl: validatedData.avatarUrl || null,
      updatedAt: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', decoded.userId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const updatedUser = await getUserById(decoded.userId);
    if (!updatedUser) {
      throw new Error('No se pudo recuperar el perfil actualizado');
    }

    // Log de actualización de perfil
    await logDataRetentionAction(decoded.userId, 'profile_update', {
      timestamp: new Date().toISOString(),
      fieldsUpdated: Object.keys(validatedData),
    });

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error actualizando perfil:', error);

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
