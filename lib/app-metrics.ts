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

const COUNTERS_TABLE = 'app_counters';

export async function incrementAppCounter(key: string, amount = 1): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from(COUNTERS_TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error && !['PGRST116', 'PGRST205'].includes(error.code ?? '')) {
      console.error(`Error obteniendo contador ${key}:`, error);
      return null;
    }

    const currentValue = typeof data?.value === 'number' ? data.value : 0;
    const newValue = currentValue + amount;

    const { error: upsertError } = await supabase.from(COUNTERS_TABLE).upsert(
      {
        key,
        value: newValue,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    if (upsertError && !['PGRST205'].includes(upsertError.code ?? '')) {
      console.error(`Error actualizando contador ${key}:`, upsertError);
      return null;
    }
    if (upsertError && upsertError.code === 'PGRST205') {
      console.warn('Tabla app_counters no disponible; omitiendo contador');
    }

    return newValue;
  } catch (error) {
    console.error(`Error general incrementando contador ${key}:`, error);
    return null;
  }
}
