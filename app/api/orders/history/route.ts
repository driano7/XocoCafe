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
  'manager-demo': 'Demo Gerente',
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

type PrepTaskRecord = {
  orderItemId?: string | null;
  status?: string | null;
  handledByStaffId?: string | null;
};

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

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
          *,
          order_items(*)
        `
      )
      .eq('userId', decoded.userId)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const orders = data ?? [];
    const orderIds = orders
      .map((entry: any) => (typeof entry?.id === 'string' ? entry.id : null))
      .filter((value): value is string => Boolean(value));
    const ticketQrMap = new Map<string, unknown>();
    if (orderIds.length > 0) {
      const { data: ticketRows, error: ticketError } = await supabase
        .from('tickets')
        .select('orderId,qrPayload')
        .in('orderId', orderIds);
      if (ticketError) {
        throw new Error(ticketError.message);
      }
      (ticketRows ?? []).forEach((row) => {
        if (row?.orderId) {
          ticketQrMap.set(row.orderId, row.qrPayload ?? null);
        }
      });
    }
    const orderItemIds = orders
      .flatMap((order: any) => (order.order_items ?? []).map((item: any) => item.id))
      .filter((value): value is string => Boolean(value));
    const orderIdByItemId = new Map<string, string>();
    orders.forEach((order: any) => {
      (order.order_items ?? []).forEach((item: any) => {
        if (item?.id) {
          orderIdByItemId.set(item.id, order.id);
        }
      });
    });

    let prepTasks: PrepTaskRecord[] = [];
    if (orderItemIds.length) {
      const { data: prepTasksData, error: prepTasksError } = await supabase
        .from('prep_queue')
        .select('orderItemId,status,handledByStaffId')
        .in('orderItemId', orderItemIds);
      if (prepTasksError) {
        throw new Error(prepTasksError.message);
      }
      prepTasks = prepTasksData ?? [];
    }

    const tasksByOrder = new Map<string, PrepTaskRecord[]>();
    prepTasks.forEach((task) => {
      const orderItemId = task.orderItemId ?? undefined;
      if (!orderItemId) return;
      const orderId = orderIdByItemId.get(orderItemId);
      if (!orderId) return;
      const collection = tasksByOrder.get(orderId) ?? [];
      collection.push(task);
      tasksByOrder.set(orderId, collection);
    });

    const handlerIds = Array.from(
      new Set(
        prepTasks
          .map((task) => (typeof task.handledByStaffId === 'string' ? task.handledByStaffId : null))
          .filter((value): value is string => Boolean(value))
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
        throw new Error(staffError.message);
      }
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

    const payload = orders.map((entry) => {
      const baseStatus = (entry.status ?? 'pending').toLowerCase();
      const tasks = tasksByOrder.get(entry.id) ?? [];
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
      const { order_items, customer_name, pos_customer_id, ...rest } = entry as any;
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
              ? item.packageItems.map((value: any) => String(value))
              : Array.isArray(item.metadata?.items)
              ? item.metadata.items.map((value: any) => String(value))
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
      const shippingFromColumn = (entry as { shipping?: any }).shipping ?? null;
      const shippingDetails =
        shippingFromColumn ??
        (rawItems && typeof rawItems === 'object' && !Array.isArray(rawItems)
          ? (rawItems as { shipping?: any }).shipping ?? null
          : null);
      const shippingAddressId =
        (entry as { shipping_address_id?: string | null }).shipping_address_id ??
        shippingDetails?.addressId ??
        null;
      const enrichedShipping =
        shippingDetails || shippingAddressId
          ? {
              ...(shippingDetails ?? {}),
              addressId: shippingAddressId ?? shippingDetails?.addressId ?? null,
            }
          : null;
      const normalizedItemsPayload =
        rawItems && typeof rawItems === 'object' && !Array.isArray(rawItems)
          ? { ...rawItems, list: normalizedItems }
          : normalizedItems;

      return {
        ...rest,
        customerName: customer_name ?? null,
        posCustomerId: pos_customer_id ?? null,
        items: normalizedItemsPayload,
        qrPayload: ticketQrMap.get(entry.id) ?? null,
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
  } catch (error: any) {
    console.error('Error obteniendo pedidos:', error);
    return NextResponse.json(
      { success: false, message: 'No pudimos cargar tus pedidos' },
      { status: 500 }
    );
  }
}
