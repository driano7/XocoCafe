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
import { verifyToken, hashPassword, verifyPassword, logDataRetentionAction } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { changePasswordSchema } from '@/lib/validations/auth';

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

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = changePasswordSchema.parse(body);

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id,email,authProvider,passwordHash')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (userError) {
      throw new Error(userError.message);
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (user.authProvider === 'google') {
      return NextResponse.json(
        {
          success: false,
          message:
            'Esta cuenta se administra con Google. Usa "Continuar con Google" para gestionar tu contraseña.',
        },
        { status: 400 }
      );
    }

    if (user.passwordHash) {
      if (!validatedData.currentPassword) {
        return NextResponse.json(
          { success: false, message: 'Debes proporcionar tu contraseña actual' },
          { status: 400 }
        );
      }

      const isValid = await verifyPassword(validatedData.currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'La contraseña actual es incorrecta' },
          { status: 400 }
        );
      }
    }

    const newPasswordHash = await hashPassword(validatedData.newPassword);
    const nextAuthProvider = user.authProvider && user.authProvider !== 'email' ? 'both' : 'email';

    const { error: updateError } = await supabase
      .from('users')
      .update({
        passwordHash: newPasswordHash,
        authProvider: nextAuthProvider,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await logDataRetentionAction(user.id, 'password_change', {
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error: any) {
    console.error('Error cambiando contraseña:', error);

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
