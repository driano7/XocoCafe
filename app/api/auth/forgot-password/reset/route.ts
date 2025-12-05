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
import { resetPasswordWithCodeSchema } from '@/lib/validations/auth';
import { getUserByEmail, hashPassword } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  consumeResetRecord,
  getResetRecord,
  isResetTableAvailable,
  markResetTableUnavailable,
} from '@/lib/passwordResetStore';
import type { PasswordResetRecord } from '@/lib/passwordResetStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = resetPasswordWithCodeSchema.parse(body);
    const normalizedCode = validatedData.code;

    const user = await getUserByEmail(validatedData.email);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No existe una cuenta con este email' },
        { status: 404 }
      );
    }

    if (user.authProvider === 'google' || user.authProvider === 'both') {
      return NextResponse.json(
        {
          success: false,
          message:
            'Esta cuenta se registró con Google. Usa "Continuar con Google" para iniciar sesión.',
        },
        { status: 400 }
      );
    }

    let resetRequest: PasswordResetRecord | null = null;

    if (isResetTableAvailable()) {
      const { data, error } = await supabase
        .from('password_reset_codes')
        .select('id, code, expiresAt, consumedAt, verifiedAt, userId, email')
        .eq('id', validatedData.requestId)
        .eq('userId', user.id)
        .maybeSingle();

      if (error) {
        if (error.message && /password_reset_codes/.test(error.message)) {
          markResetTableUnavailable();
        } else {
          throw new Error(error.message);
        }
      } else if (data) {
        resetRequest = data as PasswordResetRecord;
      }
    }

    if (!resetRequest) {
      resetRequest = getResetRecord(validatedData.requestId) ?? null;
    }

    if (!resetRequest || resetRequest.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Solicitud de recuperación inválida' },
        { status: 404 }
      );
    }

    if (resetRequest.consumedAt) {
      return NextResponse.json(
        { success: false, message: 'Este código ya fue utilizado. Solicita uno nuevo.' },
        { status: 400 }
      );
    }

    if (resetRequest.code !== normalizedCode) {
      return NextResponse.json(
        { success: false, message: 'El código ingresado es incorrecto.' },
        { status: 400 }
      );
    }

    if (new Date(resetRequest.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, message: 'El código ha expirado. Solicita uno nuevo.' },
        { status: 400 }
      );
    }

    const newPasswordHash = await hashPassword(validatedData.newPassword);

    const { error: updatePasswordError } = await supabase
      .from('users')
      .update({
        passwordHash: newPasswordHash,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updatePasswordError) {
      throw new Error(updatePasswordError.message);
    }

    const timestamp = new Date().toISOString();

    if (isResetTableAvailable()) {
      const { error: consumeError } = await supabase
        .from('password_reset_codes')
        .update({ consumedAt: timestamp })
        .eq('id', resetRequest.id);

      if (consumeError) {
        if (consumeError.message && /password_reset_codes/.test(consumeError.message)) {
          markResetTableUnavailable();
        } else {
          throw new Error(consumeError.message);
        }
      }
    }

    consumeResetRecord(resetRequest.id, timestamp);

    return NextResponse.json({
      success: true,
      message: 'Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión.',
    });
  } catch (error: any) {
    console.error('Error restableciendo contraseña:', error);

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
