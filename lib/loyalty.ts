import { supabase } from '@/lib/supabase';

let loyaltyMetadataSupported = true;

interface LoyaltyEntryPayload {
  id: string;
  userId: string;
  points: number;
  reason: string;
  orderId?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Inserta una entrada en el historial del programa de lealtad y detecta si la
 * columna `metadata` está disponible para guardar contexto adicional.
 */
export async function insertLoyaltyEntry({
  id,
  userId,
  points,
  reason,
  orderId = null,
  expiresAt = null,
  metadata,
}: LoyaltyEntryPayload) {
  const payload = {
    id,
    userId,
    points,
    reason,
    orderId,
    expiresAt,
    createdAt: new Date().toISOString(),
  };

  if (metadata && loyaltyMetadataSupported) {
    const { error } = await supabase.from('loyalty_points').insert({ ...payload, metadata });
    if (error) {
      if (error.message?.includes('metadata')) {
        loyaltyMetadataSupported = false;
        console.warn(
          "Columna 'metadata' ausente en loyalty_points. Reintentando inserciones sin metadata."
        );
        const fallback = await supabase.from('loyalty_points').insert(payload);
        if (fallback.error) {
          console.error('Error registrando historial de lealtad:', fallback.error);
        }
      } else {
        console.error('Error registrando historial de lealtad:', error);
      }
    }
    return;
  }

  const { error } = await supabase.from('loyalty_points').insert(payload);
  if (error) {
    console.error('Error registrando historial de lealtad:', error);
  }
}
