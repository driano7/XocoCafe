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
import { verifyToken, getUserById } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
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

    // Obtener resumen de compras del último mes
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select(
        `
        id,
        userId,
        orderNumber,
        status,
        total,
        currency,
        createdAt,
        items:order_items(
          id,
          quantity,
          price,
          product:products(
            id,
            name
          )
        )
      `
      )
      .eq('userId', decoded.userId)
      .gte('createdAt', oneMonthAgo.toISOString())
      .order('createdAt', { ascending: false })
      .limit(10);

    if (ordersError) {
      throw new Error(ordersError.message);
    }

    // Calcular métricas del último mes
    const monthlyMetrics = {
      totalOrders: recentOrders?.length || 0,
      totalSpent: recentOrders?.reduce((sum, order) => sum + Number(order.total ?? 0), 0) ?? 0,
      favoriteProducts: {} as Record<string, number>,
      ordersByDay: {} as Record<string, number>,
    };

    // Contar productos favoritos
    recentOrders?.forEach((order) => {
      (order.items ?? []).forEach((item) => {
        const productRelation = item.product as
          | { name?: string | null }[]
          | { name?: string | null }
          | null
          | undefined;
        const productName = Array.isArray(productRelation)
          ? productRelation[0]?.name ?? 'Producto'
          : productRelation?.name ?? 'Producto';
        monthlyMetrics.favoriteProducts[productName] =
          (monthlyMetrics.favoriteProducts[productName] || 0) + item.quantity;
      });

      // Contar órdenes por día
      const dayKey = new Date(order.createdAt).toISOString().split('T')[0];
      monthlyMetrics.ordersByDay[dayKey] = (monthlyMetrics.ordersByDay[dayKey] || 0) + 1;
    });

    // Obtener datos del usuario
    const user = await getUserById(decoded.userId);

    return NextResponse.json({
      success: true,
      data: {
        user,
        recentOrders,
        monthlyMetrics,
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo resumen de usuario:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
export const dynamic = 'force-dynamic';
