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

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
const MAX_STAMPS = 7;
const LOYALTY_ELIGIBLE_PRODUCTS = ['beverage-cafe-mexicano'];

type OrderItemRow = {
  productId?: string | null;
  quantity?: number | string | null;
};

type WeeklyOrderRow = {
  items?: OrderItemRow[] | null;
};

const getStartOfWeek = () => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  const day = startOfWeek.getDay();
  const diff = (day + 6) % 7; // lunes como inicio
  startOfWeek.setDate(startOfWeek.getDate() - diff);
  return startOfWeek;
};

const authenticate = (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Token no proporcionado' },
        { status: 401 }
      ),
    };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return {
      error: NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 }),
    };
  }

  return { decoded, token };
};

export async function GET(request: NextRequest) {
  const auth = authenticate(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const startOfWeek = getStartOfWeek();
    const startOfWeekIso = startOfWeek.toISOString();

    const [{ data: user, error: userError }, { data: weeklyOrders, error: ordersError }] =
      await Promise.all([
        supabase
          .from('users')
          .select('weeklyCoffeeCount')
          .eq('id', auth.decoded.userId)
          .maybeSingle(),
        supabase
          .from('orders')
          .select('id,createdAt,items:order_items(productId,quantity)')
          .eq('userId', auth.decoded.userId)
          .gte('createdAt', startOfWeekIso),
      ]);

    if (userError) {
      throw new Error(userError.message);
    }

    if (ordersError) {
      throw new Error(ordersError.message);
    }

    const eligibleCoffeeCount = (weeklyOrders ?? []).reduce((orderAcc, order) => {
      const typedOrder = order as WeeklyOrderRow;
      const items = Array.isArray(typedOrder.items) ? typedOrder.items : [];
      const orderTotal = items.reduce((itemAcc, item) => {
        if (!item?.productId) return itemAcc;
        if (!LOYALTY_ELIGIBLE_PRODUCTS.includes(item.productId)) {
          return itemAcc;
        }
        const quantity =
          typeof item.quantity === 'number'
            ? item.quantity
            : Number.parseInt(String(item.quantity ?? 0), 10) || 0;
        return itemAcc + Math.max(0, quantity);
      }, 0);
      return orderAcc + orderTotal;
    }, 0);
    const normalizedCoffeeCount = Math.min(eligibleCoffeeCount, MAX_STAMPS);

    if (user && (user.weeklyCoffeeCount ?? 0) !== normalizedCoffeeCount) {
      await supabase
        .from('users')
        .update({
          weeklyCoffeeCount: normalizedCoffeeCount,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', auth.decoded.userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        weeklyCoffeeCount: normalizedCoffeeCount,
      },
    });
  } catch (error: unknown) {
    console.error('Error obteniendo contador de cafés:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticate(request);
    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();
    const { increment = 1 } = body;

    // Obtener usuario actual
    const { data: user, error } = await supabase
      .from('users')
      .select('weeklyCoffeeCount')
      .eq('id', auth.decoded.userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const previousCount = user.weeklyCoffeeCount ?? 0;
    const newCount = Math.min(previousCount + increment, MAX_STAMPS); // Máximo 7

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        weeklyCoffeeCount: newCount,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', auth.decoded.userId)
      .select('id,weeklyCoffeeCount')
      .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (!updatedUser) {
      throw new Error('No se pudo recuperar la actualización del usuario');
    }

    let rewardEarned = false;
    let finalCount = updatedUser.weeklyCoffeeCount;
    if (newCount >= MAX_STAMPS) {
      rewardEarned = true;
      const { data: resetResult, error: resetError } = await supabase
        .from('users')
        .update({
          weeklyCoffeeCount: 0,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', auth.decoded.userId)
        .select('weeklyCoffeeCount')
        .maybeSingle();

      if (resetError) {
        throw new Error(resetError.message);
      }

      finalCount = resetResult?.weeklyCoffeeCount ?? 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        weeklyCoffeeCount: finalCount,
        rewardEarned,
        message: rewardEarned
          ? '¡Felicidades! Ganaste un americano y reiniciamos tu contador.'
          : null,
      },
    });
  } catch (error: unknown) {
    console.error('Error actualizando contador de cafés:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para resetear el contador semanal (se puede llamar cada lunes)
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token no proporcionado' },
        { status: 401 }
      );
    }

    // Verificar token
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        weeklyCoffeeCount: 0,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', decoded.userId)
      .select('id,weeklyCoffeeCount')
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!updatedUser) {
      throw new Error('No se pudo recuperar la actualización del usuario');
    }

    return NextResponse.json({
      success: true,
      data: {
        weeklyCoffeeCount: updatedUser.weeklyCoffeeCount,
        message: 'Contador semanal reiniciado',
      },
    });
  } catch (error: unknown) {
    console.error('Error reseteando contador de cafés:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
