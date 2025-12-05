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
import { completeProfileSchema } from '@/lib/validations/auth';
import { auth } from '@/lib/auth-config';
import { encryptUserData, mapEncryptedDataToColumnNames } from '@/lib/encryption';
import { getUserByEmail } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = completeProfileSchema.parse(body);

    const encryptedData = mapEncryptedDataToColumnNames(
      encryptUserData(session.user.email, {
        phone: validatedData.phone || null,
      })
    );

    const updatePayload = {
      ...encryptedData,
      walletAddress: validatedData.walletAddress || null,
      city: validatedData.city || null,
      country: validatedData.country || null,
      termsAccepted: validatedData.termsAndPrivacyAccepted,
      privacyAccepted: validatedData.termsAndPrivacyAccepted,
      marketingEmail: validatedData.marketingEmail || false,
      marketingPush: validatedData.marketingPush || false,
      consentUpdatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('email', session.user.email);

    if (error) {
      throw new Error(error.message);
    }

    const updatedUser = await getUserByEmail(session.user.email);

    return NextResponse.json({
      success: true,
      message: 'Perfil completado exitosamente',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error completando perfil:', error);

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
