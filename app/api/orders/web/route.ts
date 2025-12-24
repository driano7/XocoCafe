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
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { buildOrderQrPayload } from '@/lib/orderQrPayload';

interface OrderItemPayload {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string | null;
  size?: string | null;
  packageItems?: string[] | null;
}

function generateOrderNumber(source: 'client' | 'store' = 'client') {
  const prefix = source === 'client' ? 'C-' : 'S-';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < 5; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const DEFAULT_POS_CUSTOMER_ID = 'AAA-1111';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Debes iniciar sesión para crear pedidos.' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const {
      items,
      totalAmount,
      tipAmount,
      tipPercent,
      totals,
      notes,
      shipping,
      customerName,
      deliveryTip,
    } = body;

    const normalizedCustomerName =
      typeof customerName === 'string' ? customerName.trim().slice(0, 120) : '';
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Debes incluir al menos un artículo.' },
        { status: 400 }
      );
    }

    if (typeof totalAmount !== 'number' || Number.isNaN(totalAmount) || totalAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'El total del pedido es inválido.' },
        { status: 400 }
      );
    }

    if (typeof tipAmount !== 'undefined' && (Number.isNaN(tipAmount) || tipAmount < 0)) {
      return NextResponse.json(
        { success: false, message: 'La propina es inválida.' },
        { status: 400 }
      );
    }

    const normalizedItems: OrderItemPayload[] = items.map((item: any) => ({
      productId: String(item.productId ?? ''),
      name: String(item.name ?? ''),
      price: Number(item.price ?? 0),
      quantity: Number(item.quantity ?? 0),
      category: typeof item.category === 'string' ? item.category : null,
      size: typeof item.size === 'string' ? item.size : null,
      packageItems: Array.isArray(item.packageItems)
        ? item.packageItems.map((entry: any) => String(entry))
        : null,
    }));

    if (normalizedItems.some((item) => !item.productId || item.quantity <= 0 || item.price < 0)) {
      return NextResponse.json(
        { success: false, message: 'Los artículos incluyen datos inválidos.' },
        { status: 400 }
      );
    }

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const normalizedTotals =
      totals && typeof totals === 'object'
        ? {
            subtotal: Number.isFinite(totals.subtotal) ? Number(totals.subtotal) : subtotal,
            tip: Number.isFinite(totals.tip) ? Number(totals.tip) : tipAmount ?? 0,
            deliveryTip:
              Number.isFinite(totals.deliveryTip) && totals.deliveryTip >= 0
                ? Number(totals.deliveryTip)
                : 0,
            total: Number.isFinite(totals.total) ? Number(totals.total) : totalAmount,
          }
        : { subtotal, tip: tipAmount ?? 0, deliveryTip: 0, total: totalAmount };
    const normalizedTipAmount =
      typeof tipAmount === 'number' && Number.isFinite(tipAmount) && tipAmount > 0
        ? tipAmount
        : null;
    const normalizedTipPercent =
      typeof tipPercent === 'number' && Number.isFinite(tipPercent) ? tipPercent : null;
    const normalizedDeliveryTipAmount =
      deliveryTip && typeof deliveryTip.amount === 'number' && deliveryTip.amount > 0
        ? Math.round(deliveryTip.amount * 100) / 100
        : null;
    const normalizedDeliveryTipPercent =
      deliveryTip && typeof deliveryTip.percent === 'number' && Number.isFinite(deliveryTip.percent)
        ? deliveryTip.percent
        : null;

    const normalizedShipping =
      shipping && typeof shipping === 'object'
        ? {
            ...shipping,
            addressId:
              typeof shipping.addressId === 'string' && shipping.addressId.trim().length > 0
                ? shipping.addressId
                : null,
          }
        : null;
    const shippingAddressId = normalizedShipping?.addressId ?? null;

    const orderPayload = {
      id: randomUUID(),
      userId: decoded.userId ?? null,
      pos_customer_id: decoded.clientId ?? DEFAULT_POS_CUSTOMER_ID,
      orderNumber: generateOrderNumber('client'),
      status: 'pending',
      total: totalAmount,
      currency: 'MXN',
      customer_name: normalizedCustomerName || decoded.email?.split('@')[0] || 'Cliente Xoco',
      items: {
        list: normalizedItems,
        shipping: normalizedShipping ?? null,
        deliveryTip:
          normalizedDeliveryTipAmount !== null
            ? { amount: normalizedDeliveryTipAmount, percent: normalizedDeliveryTipPercent }
            : null,
        notes: notes ?? null,
        totals: normalizedTotals,
      },
      tipAmount: normalizedTipAmount,
      tipPercent: normalizedTipPercent,
      deliveryTipAmount: normalizedDeliveryTipAmount,
      deliveryTipPercent: normalizedDeliveryTipPercent,
      shipping_address_id: shippingAddressId,
    };

    const { data, error } = await supabase.from('orders').insert(orderPayload).select('*').single();

    if (error) {
      console.error('Error insertando pedido:', error);
      return NextResponse.json(
        { success: false, message: 'No pudimos crear tu pedido' },
        { status: 500 }
      );
    }

    const rollbackOrder = async () => {
      await supabase.from('order_items').delete().eq('orderId', data.id);
      await supabase.from('tickets').delete().eq('orderId', data.id);
      await supabase.from('orders').delete().eq('id', data.id);
    };

    const { error: itemsError } = await supabase.from('order_items').insert(
      normalizedItems.map((item) => ({
        orderId: data.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        discount: 0,
      }))
    );

    if (itemsError) {
      console.error('Error guardando artículos del pedido:', itemsError);
      await rollbackOrder();
      return NextResponse.json(
        { success: false, message: 'No pudimos registrar los artículos del pedido' },
        { status: 500 }
      );
    }

    const ticketCode = data.orderNumber ?? orderPayload.orderNumber;
    const qrPayload = buildOrderQrPayload({
      ticketCode,
      orderId: data.id,
      customerName: normalizedCustomerName || decoded.email || 'Cliente Xoco Café',
      customerEmail: decoded.email ?? null,
      customerClientId: decoded.clientId ?? null,
      totalAmount,
      tipAmount: normalizedTipAmount ?? 0,
      tipPercent: normalizedTipPercent ?? null,
      items: normalizedItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        category: item.category ?? 'other',
        size: item.size ?? null,
      })),
      shippingAddressId,
      deliveryTipAmount: normalizedDeliveryTipAmount ?? null,
      deliveryTipPercent: normalizedDeliveryTipPercent ?? null,
      createdAt: data.createdAt ?? null,
    });

    const { error: ticketError } = await supabase.from('tickets').insert({
      orderId: data.id,
      userId: decoded.userId ?? null,
      ticketCode,
      tipPercent: normalizedTipPercent ?? 0,
      tipAmount: normalizedTipAmount ?? 0,
      qrPayload,
    });

    if (ticketError) {
      console.error('Error creando ticket del pedido:', ticketError);
      await rollbackOrder();
      return NextResponse.json(
        { success: false, message: 'No pudimos generar el ticket del pedido' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creando pedido web:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
