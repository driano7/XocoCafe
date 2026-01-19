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
import { ZodError } from 'zod';
import { verifyToken, logDataRetentionAction, getUserById } from '@/lib/auth';
import { updateConsentSchema } from '@/lib/validations/auth';
import { supabase } from '@/lib/supabase';
import { sendMarketingOptInEmail } from '@/lib/mailer';

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

    const existingUser = await getUserById(decoded.userId);
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

    if (
      existingUser &&
      !existingUser.marketingEmail &&
      updatedUser.marketingEmail &&
      updatedUser.email
    ) {
      void sendMarketingOptInEmail({
        to: updatedUser.email,
        displayName: [updatedUser.firstName, updatedUser.lastName].filter(Boolean).join(' '),
        channels: {
          email: Boolean(updatedUser.marketingEmail),
          sms: Boolean(updatedUser.marketingSms),
          push: Boolean(updatedUser.marketingPush),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Preferencias actualizadas exitosamente',
      user: updatedUser,
    });
  } catch (error: unknown) {
    console.error('Error actualizando consentimientos:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: 'Datos inválidos', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
