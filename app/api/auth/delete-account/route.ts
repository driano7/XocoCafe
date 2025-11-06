import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, deleteUserData, logDataRetentionAction } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
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

    // Log de eliminación de datos antes de eliminar
    await logDataRetentionAction(decoded.userId, 'data_deletion', {
      timestamp: new Date().toISOString(),
      reason: 'user_request',
      dataTypes: ['profile', 'addresses', 'orders', 'loyalty_points', 'sessions'],
    });

    // Eliminar todos los datos del usuario
    await deleteUserData(decoded.userId);

    return NextResponse.json({
      success: true,
      message: 'Datos eliminados exitosamente',
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en eliminación de datos:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
