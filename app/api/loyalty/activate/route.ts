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
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
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

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const { count, error } = await supabase
      .from('loyalty_points')
      .select('id', { count: 'exact', head: true })
      .eq('userId', decoded.userId)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    const activationTimestamp = new Date().toISOString();

    if ((count ?? 0) > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ loyaltyActivatedAt: activationTimestamp })
        .eq('id', decoded.userId);
      if (updateError) {
        console.error('No pudimos actualizar loyaltyActivatedAt:', updateError);
      }
      return NextResponse.json({
        success: true,
        message: 'Tu programa de lealtad ya estaba activo.',
        alreadyActive: true,
      });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ loyaltyActivatedAt: activationTimestamp })
      .eq('id', decoded.userId);
    if (updateError) {
      console.error('No pudimos actualizar loyaltyActivatedAt:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: '¡Listo! Activamos tu programa de lealtad.',
      alreadyActive: false,
    });
  } catch (error: unknown) {
    console.error('Error activando programa de lealtad:', error);
    return NextResponse.json(
      { success: false, message: 'No pudimos activar tu programa de lealtad.' },
      { status: 500 }
    );
  }
}
