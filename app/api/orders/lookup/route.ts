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

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawOrderId = searchParams.get('orderId')?.trim();

    if (!rawOrderId) {
      return NextResponse.json(
        { success: false, message: 'Debes proporcionar el ID del pedido.' },
        { status: 400 }
      );
    }

    const normalized = rawOrderId.replace(/^#/, '').toUpperCase();

    const query = supabase
      .from('orders')
      .select('id,orderNumber,status,total,currency,items')
      .eq('userId', decoded.userId)
      .limit(1);

    const isOrderNumber = normalized.includes('-');
    if (isOrderNumber) {
      query.eq('orderNumber', normalized);
    } else {
      query.eq('id', normalized);
    }

    const { data: order, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error consultando pedido vinculado:', error);
      return NextResponse.json(
        { success: false, message: 'No pudimos validar el pedido vinculado.' },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'No encontramos un pedido con ese ID en tu cuenta.' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Ese pedido ya fue atendido o cancelado.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Error buscando pedido vinculado:', error);
    return NextResponse.json(
      { success: false, message: 'No pudimos validar el pedido vinculado.' },
      { status: 500 }
    );
  }
}
