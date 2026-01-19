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

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken, getUserById } from '@/lib/auth';
import { normalizeDateOnly, isDateWithinRange, DEFAULT_BRANCH_ID } from '@/lib/reservations';
import {
  archiveExpiredReservations,
  cleanupFailedReservations,
  isMissingReservationFailuresTableError,
} from '@/lib/reservations-server';
import { supabase } from '@/lib/supabase';
import { sendReservationCreatedEmail } from '@/lib/mailer';

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

      if (archivedError) {
        if (isMissingReservationFailuresTableError(archivedError)) {
          return code;
        }
        if (archivedError.code !== 'PGRST116') {
          throw new HttpError(500, 'No pudimos validar el código de reserva.');
        }
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
    // Run internal cleanup in the background to avoid blocking the user
    void archiveExpiredReservations();
    void cleanupFailedReservations();

    // Fetch active and failed reservations in parallel
    const [reservationsRes, failedRes] = await Promise.all([
      supabase
        .from('reservations')
        .select(
          'id,reservationCode,reservationDate,reservationTime,branchId,branchNumber,peopleCount,message,preOrderItems,status,createdAt,updatedAt'
        )
        .eq('userId', decoded.userId)
        .order('reservationDate', { ascending: true })
        .order('reservationTime', { ascending: true }),
      supabase
        .from('reservation_failures')
        .select(
          'id,originalReservationId,userId,reservationCode,reservationDate,reservationTime,branchId,branchNumber,peopleCount,message,preOrderItems,status,archivedAt,cleanupAt'
        )
        .eq('userId', decoded.userId)
        .order('archivedAt', { ascending: false }),
    ]);

    if (reservationsRes.error) {
      console.error('Error obteniendo reservaciones:', reservationsRes.error);
      throw new HttpError(500, 'No pudimos cargar tus reservaciones.');
    }

    if (failedRes.error) {
      if (!isMissingReservationFailuresTableError(failedRes.error)) {
        console.error('Error obteniendo reservaciones fallidas:', failedRes.error);
        throw new HttpError(500, 'No pudimos cargar las reservas no completadas.');
      }
    }

    return NextResponse.json({
      success: true,
      data: reservationsRes.data ?? [],
      failed: failedRes.error ? [] : failedRes.data ?? [],
    });
  } catch (error: unknown) {
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
    let normalizedBranchNumber = payload.branchNumber?.trim() || null;

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

    if (normalizedBranchNumber) {
      const { data: branchRecord, error: branchLookupError } = await supabase
        .from('branches')
        .select('number')
        .eq('number', normalizedBranchNumber)
        .maybeSingle();

      if (branchLookupError && branchLookupError.code !== 'PGRST116') {
        console.error('Error validando sucursal:', branchLookupError);
        normalizedBranchNumber = null;
      } else if (!branchRecord) {
        normalizedBranchNumber = null;
      } else {
        normalizedBranchNumber = branchRecord.number ?? null;
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
        branchNumber: normalizedBranchNumber,
        message: payload.message ?? null,
        preOrderItems: payload.preOrderItems ?? null,
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

    const profile = await getUserById(decoded.userId).catch(() => null);
    if (profile?.email) {
      const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
      void sendReservationCreatedEmail({
        to: profile.email,
        displayName,
        reservationCode: data.reservationCode,
        reservationDate,
        reservationTime: slotTime,
        peopleCount: payload.numPeople,
        branchLabel: normalizedBranchNumber || branchId,
        message: payload.message ?? null,
        preOrderItems: payload.preOrderItems ?? null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        reservationId: data.id,
        reservationCode: data.reservationCode,
      },
    });
  } catch (error: unknown) {
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
