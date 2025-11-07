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
        'id,userId,reservationCode,reservationDate,reservationTime,branchId,peopleCount,message,status'
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
