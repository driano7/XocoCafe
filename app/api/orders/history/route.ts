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
import { decryptUserData } from '@/lib/encryption';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const STAFF_ID_DISPLAY_OVERRIDES: Record<string, string> = {
  'barista-demo': 'Demo Barista',
  'manager-demo': 'Demo Barista',
  'socio-demo': 'Socio demo',
  'socio-cots': 'Socio cots',
  'socio-ale': 'Socio Ale',
  'socio-jhon': 'Socio Jhon',
  'super-criptec': 'Super Donovan',
  'super-demo': 'Super demo',
  'socio-donovan': 'Socio Donovan',
};

const normalizeStaffName = (staffId?: string | null) => {
  if (!staffId) return null;
  const trimmed = staffId.trim();
  if (!trimmed) return null;
  const override = STAFF_ID_DISPLAY_OVERRIDES[trimmed.toLowerCase()];
  if (override) {
    const token = override.trim().split(/\s+/)[0];
    return token || override;
  }
  if (trimmed.includes('@')) {
    return trimmed.split('@')[0];
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
};

interface DbOrderItem {
  id: string;
  orderId: string;
  name?: string;
  productName?: string;
  displayName?: string;
  title?: string;
  productId?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  unitPrice?: number;
  amount?: number;
  category?: string;
  type?: string;
  size?: string | null;
  packageItems?: string[];
  metadata?: {
    items?: string[];
  };
  prep_queue?: {
    status: string | null;
    handledByStaffId: string | null;
  }[];
  product?: {
    name: string;
  };
}

interface DbOrder {
  id: string;
  status: string | null;
  createdAt: string;
  userId: string;
  items: unknown;
  customer_name: string | null;
  pos_customer_id: string | null;
  deliveryTipAmount: number | null;
  deliveryTipPercent: number | null;
  shipping: unknown;
  shipping_address_id: string | null;
  orderNumber: string | null;
  ticketId?: string;
  ticketCode?: string;
  order_items: DbOrderItem[];
  tickets?: {
    qrPayload: unknown;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        order_items (
          *,
          prep_queue (
            status,
            handledByStaffId
          )
        ),
        tickets (
          qrPayload
        )
      `
      )
      .eq('userId', decoded.userId)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const orders = (ordersData ?? []) as DbOrder[];

    // Collect unique handler IDs for staff name resolution
    const handlerIds = Array.from(
      new Set(
        orders.flatMap((order) =>
          (order.order_items ?? []).flatMap((item) => {
            const queue = Array.isArray(item.prep_queue)
              ? item.prep_queue
              : item.prep_queue
              ? [item.prep_queue]
              : [];
            return queue
              .map((task) => task.handledByStaffId)
              .filter((id): id is string => Boolean(id));
          })
        )
      )
    );

    const staffNames = new Map<string, string>();
    if (handlerIds.length) {
      const { data: staffRecords, error: staffError } = await supabase
        .from('users')
        .select(
          'id,email,firstNameEncrypted,firstNameIv,firstNameTag,firstNameSalt,lastNameEncrypted,lastNameIv,lastNameTag,lastNameSalt'
        )
        .in('id', handlerIds);

      if (staffError) {
        console.error('Error fetching staff names:', staffError);
        // We continue with null names if this fails
      } else {
        (staffRecords ?? []).forEach((record) => {
          if (!record?.id || !record.email) return;
          const decrypted = decryptUserData(record.email, record);
          const displayName = [decrypted.firstName, decrypted.lastName]
            .filter((value): value is string => Boolean(value && value.trim().length > 0))
            .join(' ')
            .trim();
          const fallback = normalizeStaffName(record.email) ?? record.email;
          staffNames.set(record.id, displayName || fallback);
        });
      }
    }

    const payload = orders.map((entry) => {
      const baseStatus = (entry.status ?? 'pending').toLowerCase();

      // Extract all prep tasks from nested order_items
      const tasks = (entry.order_items ?? []).flatMap((item) => {
        return Array.isArray(item.prep_queue)
          ? item.prep_queue
          : item.prep_queue
          ? [item.prep_queue]
          : [];
      });
      const taskStatuses = tasks.map((task) => (task.status ?? '').toLowerCase()).filter(Boolean);

      const hasInProgress =
        taskStatuses.includes('in_progress') ||
        tasks.some((task) => Boolean(task.handledByStaffId));

      const allCompleted =
        tasks.length > 0 && taskStatuses.every((status) => status === 'completed');

      let prepStatus: 'pending' | 'in_progress' | 'completed' | null = null;
      if (baseStatus === 'completed' || allCompleted) {
        prepStatus = 'completed';
      } else if (hasInProgress) {
        prepStatus = 'in_progress';
      } else if (tasks.length > 0) {
        prepStatus = 'pending';
      }

      const handlerId =
        tasks.find((task) => Boolean(task.handledByStaffId))?.handledByStaffId ?? null;
      const handlerName =
        (handlerId ? staffNames.get(handlerId) : null) ?? normalizeStaffName(handlerId);

      const { order_items, customer_name, pos_customer_id, tickets, ...rest } = entry;

      const fallbackItems = Array.isArray(order_items)
        ? order_items.map((item) => ({
            name: String(
              item.name ??
                item.productName ??
                item.displayName ??
                item.title ??
                item.product?.name ??
                item.productId ??
                'Producto'
            ),
            quantity: Number.isFinite(Number(item.quantity ?? item.qty))
              ? Number(item.quantity ?? item.qty)
              : 1,
            price: Number.isFinite(Number(item.price ?? item.unitPrice ?? item.amount))
              ? Number(item.price ?? item.unitPrice ?? item.amount)
              : 0,
            category: String(item.category ?? item.type ?? 'other'),
            size: typeof item.size === 'string' ? item.size : null,
            packageItems: Array.isArray(item.packageItems)
              ? item.packageItems.map((value: unknown) => String(value))
              : Array.isArray(item.metadata?.items)
              ? item.metadata?.items.map((value: unknown) => String(value))
              : null,
          }))
        : [];

      const rawItems = entry.items;
      const normalizedItems = Array.isArray(rawItems)
        ? rawItems
        : rawItems &&
          typeof rawItems === 'object' &&
          Array.isArray((rawItems as { list?: unknown[] }).list)
        ? (rawItems as { list: unknown[] }).list
        : fallbackItems;

      const shippingFromColumn = (entry as { shipping?: unknown }).shipping ?? null;
      const shippingDetails =
        shippingFromColumn ??
        (rawItems && typeof rawItems === 'object' && !Array.isArray(rawItems)
          ? (rawItems as { shipping?: unknown }).shipping ?? null
          : null);

      const shippingAddressId =
        (entry as { shipping_address_id?: string | null }).shipping_address_id ??
        (shippingDetails && typeof shippingDetails === 'object' && 'addressId' in shippingDetails
          ? (shippingDetails as { addressId?: string | null }).addressId
          : null) ??
        null;

      const enrichedShipping =
        shippingDetails || shippingAddressId
          ? {
              ...(shippingDetails ?? {}),
              addressId: shippingAddressId,
            }
          : null;

      const normalizedItemsPayload =
        rawItems && typeof rawItems === 'object' && !Array.isArray(rawItems)
          ? { ...rawItems, list: normalizedItems }
          : normalizedItems;

      // tickets is an array from the joined query
      const ticket = Array.isArray(tickets) ? tickets[0] : null;

      return {
        ...rest,
        customerName: customer_name ?? null,
        posCustomerId: pos_customer_id ?? null,
        items: normalizedItemsPayload,
        qrPayload: ticket?.qrPayload ?? null,
        shipping: enrichedShipping,
        deliveryTipAmount: entry.deliveryTipAmount ?? null,
        deliveryTipPercent: entry.deliveryTipPercent ?? null,
        ticketId:
          (entry as { ticketId?: string }).ticketId ??
          (entry as { ticketCode?: string }).ticketCode ??
          entry.orderNumber ??
          entry.id,
        prepStatus,
        prepHandlerName: handlerName,
      };
    });

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    return NextResponse.json(
      { success: false, message: 'No pudimos cargar tus pedidos' },
      { status: 500 }
    );
  }
}
