type ReservationStatus = 'completed' | 'cancelled';

async function updateReservationStatus(
  token: string,
  reservationId: string,
  status: ReservationStatus
): Promise<void> {
  const response = await fetch(`/api/reservations/${reservationId}/status`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'No pudimos actualizar la reservación.');
  }
}

export function cancelReservation(token: string, reservationId: string) {
  return updateReservationStatus(token, reservationId, 'cancelled');
}

export function confirmReservation(token: string, reservationId: string) {
  return updateReservationStatus(token, reservationId, 'completed');
}
