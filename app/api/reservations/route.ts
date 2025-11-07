import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken } from '@/lib/auth';
import { normalizeDateOnly, isDateWithinRange, DEFAULT_BRANCH_ID } from '@/lib/reservations';
import {
  archiveExpiredReservations,
  cleanupFailedReservations,
  isMissingReservationFailuresTableError,
} from '@/lib/reservations-server';
import { supabase } from '@/lib/supabase';

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

const ReservationPayloadSchema = z.object({
  numPeople: z.coerce.number().int().min(1).max(15),
  reservationDate: z.string().min(1),
  reservationTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido. Usa HH:MM'),
  branchId: z.string().min(1),
  branchNumber: z
    .string()
    .trim()
    .max(8, 'El número de sucursal es demasiado largo')
    .optional()
    .nullable(),
  message: z.string().trim().max(500, 'Mensaje demasiado largo').optional().nullable(),
  preOrderItems: z
    .string()
    .trim()
    .max(1000, 'Lista de alimentos/bebidas demasiado larga')
    .optional()
    .nullable(),
  linkedOrderId: z
    .string()
    .trim()
    .max(64, 'El ID del pedido es demasiado largo')
    .optional()
    .nullable(),
});

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MAX_CODE_ATTEMPTS = 25;

const generateReservationCode = async (): Promise<string> => {
  const buildCode = () =>
    Array.from({ length: 3 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = buildCode();

    const { data: existing, error } = await supabase
      .from('reservations')
      .select('id')
      .eq('reservationCode', code)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new HttpError(500, 'No pudimos validar el código de reserva.');
    }

    if (!existing) {
      const { data: archived, error: archivedError } = await supabase
        .from('reservation_failures')
        .select('id')
        .eq('reservationCode', code)
        .maybeSingle();

      if (archivedError && archivedError.code !== 'PGRST116') {
        throw new HttpError(500, 'No pudimos validar el código de reserva.');
      }

      if (!archived) {
        return code;
      }
    }
  }

  throw new HttpError(500, 'No pudimos generar un código de reserva único. Intenta de nuevo.');
};

export async function GET(request: NextRequest) {
  try {
    const { decoded } = authenticateRequest(request);
    await archiveExpiredReservations();
    await cleanupFailedReservations();

    const { data, error } = await supabase
      .from('reservations')
      .select(
        'id,reservationCode,reservationDate,reservationTime,branchId,branchNumber,peopleCount,message,preOrderItems,linkedOrderId,status,createdAt,updatedAt'
      )
      .eq('userId', decoded.userId)
      .order('reservationDate', { ascending: true })
      .order('reservationTime', { ascending: true });

    if (error) {
      console.error('Error obteniendo reservaciones:', error);
      throw new HttpError(500, 'No pudimos cargar tus reservaciones.');
    }

    const { data: failed, error: failedError } = await supabase
      .from('reservation_failures')
      .select(
        'id,originalReservationId,userId,reservationCode,reservationDate,reservationTime,branchId,branchNumber,peopleCount,message,preOrderItems,linkedOrderId,status,archivedAt,cleanupAt'
      )
      .eq('userId', decoded.userId)
      .order('archivedAt', { ascending: false });

    if (failedError) {
      if (!isMissingReservationFailuresTableError(failedError)) {
        console.error('Error obteniendo reservaciones fallidas:', failedError);
        throw new HttpError(500, 'No pudimos cargar las reservas no completadas.');
      }
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      failed: failedError ? [] : failed ?? [],
    });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }
    console.error('Error listando reservaciones:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { decoded } = authenticateRequest(request);

    const body = await request.json();
    const parsed = ReservationPayloadSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues?.[0]?.message ?? 'Datos de reservación inválidos';
      return NextResponse.json(
        {
          success: false,
          message: firstError,
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const branchId = payload.branchId || DEFAULT_BRANCH_ID;
    const reservationDate = normalizeDateOnly(payload.reservationDate);

    if (!isDateWithinRange(reservationDate)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Selecciona una fecha válida dentro del rango permitido.',
        },
        { status: 400 }
      );
    }

    const slotTime = payload.reservationTime;

    const { data: existingReservation, error: reservationLookupError } = await supabase
      .from('reservations')
      .select('id')
      .eq('branchId', branchId)
      .eq('reservationDate', reservationDate)
      .eq('reservationTime', slotTime)
      .maybeSingle();

    if (reservationLookupError && reservationLookupError.code !== 'PGRST116') {
      console.error('Error consultando disponibilidad:', reservationLookupError);
      return NextResponse.json(
        { success: false, message: 'No pudimos confirmar la disponibilidad.' },
        { status: 500 }
      );
    }

    if (existingReservation) {
      return NextResponse.json(
        { success: false, message: 'Ese horario ya fue reservado. Elige otro.' },
        { status: 409 }
      );
    }

    if (payload.linkedOrderId) {
      const { data: linkedOrder, error: linkedOrderError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', payload.linkedOrderId)
        .eq('userId', decoded.userId)
        .maybeSingle();

      if (linkedOrderError && linkedOrderError.code !== 'PGRST116') {
        console.error('Error validando pedido vinculado:', linkedOrderError);
        return NextResponse.json(
          { success: false, message: 'No pudimos validar el pedido vinculado.' },
          { status: 500 }
        );
      }

      if (!linkedOrder) {
        return NextResponse.json(
          { success: false, message: 'No encontramos un pedido con ese ID en tu cuenta.' },
          { status: 400 }
        );
      }
    }

    const reservationCode = await generateReservationCode();

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        id: randomUUID(),
        userId: decoded.userId,
        peopleCount: payload.numPeople,
        reservationDate,
        reservationTime: slotTime,
        branchId,
        branchNumber: payload.branchNumber || null,
        message: payload.message ?? null,
        preOrderItems: payload.preOrderItems ?? null,
        linkedOrderId: payload.linkedOrderId ?? null,
        reservationCode,
        status: 'pending',
      })
      .select('id, reservationCode')
      .single();

    if (error) {
      console.error('Error guardando reservación:', error);
      return NextResponse.json(
        { success: false, message: 'No pudimos crear tu reservación' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reservationId: data.id,
        reservationCode: data.reservationCode,
      },
    });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }
    console.error('Error creando reservación:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
