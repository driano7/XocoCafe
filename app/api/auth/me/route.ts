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

    const hasLoyaltyHistory = Array.isArray((user as any).loyaltyPoints)
      ? (user as any).loyaltyPoints.length > 0
      : false;
    const loyaltyEnrolled = Boolean((user as any).loyaltyActivatedAt) || hasLoyaltyHistory;

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
        loyaltyActivatedAt: user.loyaltyActivatedAt ?? null,
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
