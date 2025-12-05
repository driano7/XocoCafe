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

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeDateOnly,
  trimTimeToMinutes,
  isDateWithinRange,
  DEFAULT_BRANCH_ID,
} from '@/lib/reservations';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const branchId = searchParams.get('branchId') ?? DEFAULT_BRANCH_ID;

    if (!dateParam) {
      return NextResponse.json(
        { success: false, message: 'Debes indicar una fecha (YYYY-MM-DD).' },
        { status: 400 }
      );
    }

    const reservationDate = normalizeDateOnly(dateParam);
    if (!isDateWithinRange(reservationDate)) {
      return NextResponse.json(
        { success: false, message: 'Fecha fuera del rango permitido.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('reservations')
      .select('reservationTime')
      .eq('branchId', branchId)
      .eq('reservationDate', reservationDate);

    if (error) {
      console.error('Error obteniendo horarios ocupados:', error);
      return NextResponse.json(
        { success: false, message: 'No pudimos obtener la disponibilidad.' },
        { status: 500 }
      );
    }

    const slots =
      data
        ?.map((entry) => trimTimeToMinutes(entry.reservationTime))
        .filter((value): value is string => Boolean(value)) ?? [];

    return NextResponse.json({ success: true, slots });
  } catch (error: any) {
    console.error('Error consultando disponibilidad:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
