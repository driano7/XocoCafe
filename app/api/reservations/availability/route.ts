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
