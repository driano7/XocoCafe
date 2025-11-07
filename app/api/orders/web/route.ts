import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

interface OrderItemPayload {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

function generateOrderNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'WEB-';
  for (let i = 0; i < 5; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { items, totalAmount, notes, shipping } = body;

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

    const normalizedItems: OrderItemPayload[] = items.map((item: any) => ({
      productId: String(item.productId ?? ''),
      name: String(item.name ?? ''),
      price: Number(item.price ?? 0),
      quantity: Number(item.quantity ?? 0),
    }));

    if (normalizedItems.some((item) => !item.productId || item.quantity <= 0 || item.price < 0)) {
      return NextResponse.json(
        { success: false, message: 'Los artículos incluyen datos inválidos.' },
        { status: 400 }
      );
    }

    const orderPayload = {
      id: randomUUID(),
      userId: decoded.userId,
      orderNumber: generateOrderNumber(),
      status: 'pending',
      total: totalAmount,
      currency: 'MXN',
      items: {
        list: normalizedItems,
        shipping: shipping ?? null,
        notes: notes ?? null,
      },
    };

    const { data, error } = await supabase.from('orders').insert(orderPayload).select('*').single();

    if (error) {
      console.error('Error insertando pedido:', error);
      return NextResponse.json(
        { success: false, message: 'No pudimos crear tu pedido' },
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
