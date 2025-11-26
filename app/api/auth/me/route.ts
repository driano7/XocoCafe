import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, deleteSession, getUserById, logDataRetentionAction } from '@/lib/auth';

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

    // Verificar token
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    // Obtener usuario
    const user = await getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const loyaltyEnrolled = Array.isArray((user as any).loyaltyPoints)
      ? (user as any).loyaltyPoints.length > 0
      : false;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        clientId: user.clientId,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: user.walletAddress,
        phone: user.phone,
        city: user.city,
        country: user.country,
        favoriteColdDrink: user.favoriteColdDrink,
        favoriteHotDrink: user.favoriteHotDrink,
        favoriteFood: user.favoriteFood,
        marketingEmail: user.marketingEmail,
        marketingSms: user.marketingSms,
        marketingPush: user.marketingPush,
        addresses: user.addresses,
        avatarUrl: user.avatarUrl,
        avatarStoragePath: user.avatarStoragePath,
        loyaltyEnrolled,
      },
    });
  } catch (error) {
    console.error('Error en verificación:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

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

    // Verificar token para obtener userId
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    // Eliminar sesión
    await deleteSession(token);

    // Log de logout
    await logDataRetentionAction(decoded.userId, 'logout', {
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Logout exitoso',
    });
  } catch (error) {
    console.error('Error en logout:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
