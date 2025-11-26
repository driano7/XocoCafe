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
      .select('id,orderNumber,status,total,items,tipAmount,tipPercent,createdAt,updatedAt')
      .eq('userId', decoded.userId)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const orders = data ?? [];
    const orderIds = orders
      .map((order) => order.id)
      .filter((value): value is string => Boolean(value));

    let orderItems: Array<{ id: string; orderId: string }> = [];
    if (orderIds.length) {
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select('id,orderId')
        .in('orderId', orderIds);
      if (orderItemsError) {
        throw new Error(orderItemsError.message);
      }
      orderItems = (orderItemsData ?? []).filter((item): item is { id: string; orderId: string } =>
        Boolean(item.id && item.orderId)
      );
    }

    const orderItemsMap = new Map(orderItems.map((entry) => [entry.id, entry.orderId]));
    const orderItemIds = orderItems.map((item) => item.id);

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
      const orderId = orderItemsMap.get(orderItemId);
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
      return {
        ...entry,
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
