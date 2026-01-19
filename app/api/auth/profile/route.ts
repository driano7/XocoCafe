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
  } catch (error) {
    console.error('Error actualizando perfil:', error);

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
