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

const ALLOWED_STATUSES = new Set(['completed', 'cancelled']);

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const authenticateRequest = (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new HttpError(401, 'Token requerido');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    throw new HttpError(401, 'Token inválido');
  }

  return { token, decoded };
};

export async function POST(request: NextRequest, context: { params: { reservationId?: string } }) {
  try {
    const { decoded } = authenticateRequest(request);
    const reservationId = context.params?.reservationId?.trim();

    if (!reservationId) {
      throw new HttpError(400, 'Falta el ID de la reservación');
    }

    let requestedStatus: string | null = null;
    try {
      const body = await request.json();
      if (body && typeof body.status === 'string') {
        requestedStatus = body.status.trim().toLowerCase();
      }
    } catch {
      requestedStatus = null;
    }

    const status =
      requestedStatus && ALLOWED_STATUSES.has(requestedStatus)
        ? (requestedStatus as 'completed' | 'cancelled')
        : 'completed';

    const { data, error } = await supabase
      .from('reservations')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('id', reservationId)
      .eq('userId', decoded.userId)
      .select('id,status')
      .maybeSingle();

    if (error) {
      throw new HttpError(500, 'No pudimos actualizar la reservación.');
    }

    if (!data) {
      throw new HttpError(404, 'No encontramos la reservación solicitada.');
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }
    console.error('Error actualizando reservación:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
