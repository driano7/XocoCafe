import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, exportUserData, logDataRetentionAction } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Exportar datos del usuario
    const userData = await exportUserData(decoded.userId);

    if (!userData) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Log de exportación de datos
    await logDataRetentionAction(decoded.userId, 'data_export', {
      timestamp: new Date().toISOString(),
      dataTypes: ['profile', 'addresses', 'orders', 'loyalty_points'],
    });

    // Remover información sensible
    const safeUserData = { ...userData };
    delete (safeUserData as Record<string, unknown>).passwordHash;

    return NextResponse.json({
      success: true,
      data: safeUserData,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en exportación de datos:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
