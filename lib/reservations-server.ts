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

import { supabase } from '@/lib/supabase';

export const RESERVATION_ARCHIVE_RETENTION_DAYS = 7;

const toDateOnlyString = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60 * 1000;
  const localMidnight = new Date(date.getTime() - tzOffset);
  return localMidnight.toISOString().split('T')[0];
};

const calculateCleanupTimestamp = (reference: Date) => {
  const cleanup = new Date(reference);
  cleanup.setDate(cleanup.getDate() + RESERVATION_ARCHIVE_RETENTION_DAYS);
  return cleanup.toISOString();
};

export const isMissingReservationFailuresTableError = (error: { message?: string } | null) =>
  Boolean(error?.message?.includes('reservation_failures'));

export const archiveExpiredReservations = async () => {
  try {
    const todayDate = toDateOnlyString(new Date());
    const { data: expired, error } = await supabase
      .from('reservations')
      .select(
        'id,userId,reservationCode,reservationDate,reservationTime,branchId,peopleCount,message,preOrderItems,linkedOrderId,status'
      )
      .lt('reservationDate', todayDate)
      .neq('status', 'completed');

    if (error) {
      if (isMissingReservationFailuresTableError(error)) {
        return;
      }
      console.error('Error buscando reservaciones vencidas:', error);
      return;
    }

    if (!expired || expired.length === 0) {
      return;
    }

    const archivedAt = new Date();
    const archivedAtIso = archivedAt.toISOString();

    const payload = expired.map((reservation) => ({
      originalReservationId: reservation.id,
      userId: reservation.userId,
      reservationCode: reservation.reservationCode,
      reservationDate: reservation.reservationDate,
      reservationTime: reservation.reservationTime,
      branchId: reservation.branchId,
      peopleCount: reservation.peopleCount,
      message: reservation.message,
      preOrderItems: reservation.preOrderItems,
      linkedOrderId: reservation.linkedOrderId,
      status: 'failed',
      archivedAt: archivedAtIso,
      cleanupAt: calculateCleanupTimestamp(archivedAt),
    }));

    const { error: insertError } = await supabase
      .from('reservation_failures')
      .upsert(payload, { onConflict: 'originalReservationId' });

    if (insertError) {
      if (isMissingReservationFailuresTableError(insertError)) {
        return;
      }
      console.error('Error archivando reservaciones vencidas:', insertError);
      return;
    }

    const idsToDelete = expired.map((reservation) => reservation.id);
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .in('id', idsToDelete);
    if (deleteError) {
      if (isMissingReservationFailuresTableError(deleteError)) {
        return;
      }
      console.error('Error eliminando reservaciones vencidas:', deleteError);
    }
  } catch (error) {
    console.error('Error general archivando reservaciones vencidas:', error);
  }
};

export const cleanupFailedReservations = async () => {
  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('reservation_failures').delete().lte('cleanupAt', nowIso);

    if (error) {
      if (isMissingReservationFailuresTableError(error)) {
        return;
      }
      console.error('Error limpiando reservaciones fallidas:', error);
    }
  } catch (error) {
    console.error('Error general limpiando reservaciones fallidas:', error);
  }
};
