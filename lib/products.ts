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
import { supabase } from '@/lib/supabase';

interface EnsureProductOptions {
  productId: string;
  name: string;
  category: string;
  subcategory?: string | null;
  price?: number;
  cost?: number | null;
  lowStockThreshold?: number;
  isActive?: boolean;
}

export async function ensureProductExists(options: EnsureProductOptions): Promise<string> {
  const {
    productId,
    name,
    category,
    subcategory = null,
    price = 0,
    cost = 0,
    lowStockThreshold = 0,
    isActive = true,
  } = options;

  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('productId', productId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error verificando producto ${productId}: ${error.message}`);
  }

  if (data?.id) {
    return data.id as string;
  }

  const now = new Date().toISOString();
  const payload = {
    id: randomUUID(),
    productId,
    name,
    category,
    subcategory,
    price,
    cost,
    totalSales: 0,
    totalRevenue: 0,
    avgRating: 0,
    reviewCount: 0,
    stockQuantity: 0,
    lowStockThreshold,
    createdAt: now,
    updatedAt: now,
    isActive,
  };

  const { error: insertError } = await supabase.from('products').insert(payload);
  if (insertError && insertError.code !== '23505') {
    throw new Error(`Error creando producto ${productId}: ${insertError.message}`);
  }

  return payload.id;
}
