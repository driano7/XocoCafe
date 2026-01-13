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
import { supabase } from '@/lib/supabase';
import { decryptUserData } from '@/lib/encryption';
import { decryptAddressRow, type AddressRow, type AddressPayload } from '@/lib/address-vault';

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
  userId: string | null;
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
  type?: string | null;
  order_items: DbOrderItem[];
}

const PUBLIC_MAX_RECORDS = 90;
const PUBLIC_WINDOW_HOURS = 48;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit'));
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 && limitParam <= PUBLIC_MAX_RECORDS
        ? Math.floor(limitParam)
        : 60;
    const cutoff = new Date(Date.now() - PUBLIC_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

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
        )
      `
      )
      .is('userId', null)
      .in('status', ['pending', 'in_progress', 'completed'])
      .gte('createdAt', cutoff)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    const orders = (ordersData ?? []) as DbOrder[];

    const userIds = Array.from(
      new Set(
        orders
          .map((entry) => entry.userId)
          .filter((value): value is string => Boolean(value && value.trim().length > 0))
      )
    );
    const userEmailMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: userRows, error: userError } = await supabase
        .from('users')
        .select('id,email')
        .in('id', userIds);
      if (userError) {
        console.error('Error fetching user emails for public orders:', userError);
      } else {
        (userRows ?? []).forEach((user) => {
          if (user?.id && user?.email) {
            userEmailMap.set(user.id, user.email);
          }
        });
      }
    }

    const shippingAddressIds = new Set<string>();
    orders.forEach((entry) => {
      const rawItems = entry.items;
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
          : null);
      if (shippingAddressId) {
        shippingAddressIds.add(shippingAddressId);
      }
    });

    const addressMap = new Map<string, AddressPayload>();

    if (shippingAddressIds.size > 0) {
      const { data: addressRows, error: addressesError } = await supabase
        .from('addresses')
        .select(
          'id,"userId",label,nickname,type,"isDefault","createdAt","updatedAt",payload,payload_iv,payload_tag,payload_salt'
        )
        .in('id', Array.from(shippingAddressIds));

      if (addressesError) {
        console.error('Error fetching addresses for public orders:', addressesError);
      } else {
        (addressRows ?? []).forEach((address) => {
          if (!address?.id || !address?.userId) {
            return;
          }
          const ownerEmail = userEmailMap.get(address.userId);
          if (!ownerEmail) {
            return;
          }
          const decrypted = decryptAddressRow(ownerEmail, address as AddressRow);
          if (decrypted?.id) {
            addressMap.set(decrypted.id, decrypted);
          }
        });
      }
    }

    // Collect unique handler IDs for staff name resolution
    const handlerIds = Array.from(
      new Set(
        orders.flatMap((order) =>
          (order.order_items ?? []).flatMap((item) =>
            (item.prep_queue ?? [])
              .map((task) => task.handledByStaffId)
              .filter((id): id is string => Boolean(id))
          )
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
      const tasks = (entry.order_items ?? []).flatMap((item) => item.prep_queue ?? []);
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

      const { order_items, customer_name, pos_customer_id, ...rest } = entry;

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
      const savedAddress = shippingAddressId ? addressMap.get(shippingAddressId) ?? null : null;
      const hasAddressObject =
        shippingDetails &&
        typeof shippingDetails === 'object' &&
        'address' in shippingDetails &&
        shippingDetails.address &&
        typeof shippingDetails.address === 'object';
      const resolvedAddress =
        (hasAddressObject
          ? (shippingDetails as { address: Record<string, unknown> }).address
          : null) ??
        savedAddress ??
        null;
      const resolvedContactPhone =
        (shippingDetails && typeof shippingDetails === 'object'
          ? (shippingDetails as { contactPhone?: string }).contactPhone ?? null
          : null) ??
        savedAddress?.contactPhone ??
        null;
      const resolvedIsWhatsapp =
        (shippingDetails && typeof shippingDetails === 'object'
          ? (shippingDetails as { isWhatsapp?: boolean | null }).isWhatsapp
          : null) ??
        savedAddress?.isWhatsapp ??
        null;
      const enrichedShipping =
        shippingDetails || shippingAddressId || resolvedAddress || resolvedContactPhone
          ? {
              ...(shippingDetails ?? {}),
              addressId: shippingAddressId,
              ...(resolvedAddress ? { address: resolvedAddress } : {}),
              ...(resolvedContactPhone ? { contactPhone: resolvedContactPhone } : {}),
              ...(typeof resolvedIsWhatsapp === 'boolean'
                ? { isWhatsapp: resolvedIsWhatsapp }
                : {}),
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
        shipping: enrichedShipping,
        deliveryTipAmount: entry.deliveryTipAmount ?? null,
        deliveryTipPercent: entry.deliveryTipPercent ?? null,
        type: (entry as { type?: string | null }).type ?? null,
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
    console.error('Error obteniendo pedidos públicos:', error);
    return NextResponse.json(
      { success: false, message: 'No pudimos cargar los pedidos públicos' },
      { status: 500 }
    );
  }
}
