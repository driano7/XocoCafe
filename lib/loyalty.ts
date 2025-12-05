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
