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
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { addressSchema } from '@/lib/validations/auth';
import { decryptAddressRow, encryptAddressPayload, type AddressRow } from '@/lib/address-vault';
import { MAX_SAVED_ADDRESSES } from '@/lib/address-constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const idSchema = z.object({ id: z.string().uuid() });

async function requireUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return null;
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }
  return decoded;
}

async function fetchAddressRows(userId: string) {
  return supabase
    .from('addresses')
    .select(
      'id,userId,label,nickname,type,isDefault,payload,payload_iv,payload_tag,payload_salt,createdAt,updatedAt'
    )
    .eq('userId', userId)
    .order('createdAt', { ascending: true });
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await requireUser(request);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const { data, error } = await fetchAddressRows(decoded.userId);
    if (error) {
      throw new Error(error.message);
    }

    const addresses = data?.map((row) => decryptAddressRow(decoded.email, row as AddressRow)) ?? [];

    return NextResponse.json({ success: true, data: addresses });
  } catch (error: unknown) {
    console.error('Error obteniendo direcciones:', error);
    return NextResponse.json(
      { success: false, message: 'No pudimos cargar tus direcciones guardadas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await requireUser(request);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = addressSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { count, error: countError } = await supabase
      .from('addresses')
      .select('id', { count: 'exact', head: true })
      .eq('userId', decoded.userId);

    if (countError) {
      throw new Error(countError.message);
    }

    if ((count ?? 0) >= MAX_SAVED_ADDRESSES) {
      return NextResponse.json(
        {
          success: false,
          message: `Solo puedes guardar ${MAX_SAVED_ADDRESSES} direcciones. Elimina alguna para agregar una nueva.`,
        },
        { status: 409 }
      );
    }

    const encrypted = encryptAddressPayload(decoded.email, parsed.data);

    const { data, error } = await supabase
      .from('addresses')
      .insert({
        id: randomUUID(),
        userId: decoded.userId,
        label: parsed.data.label,
        nickname: parsed.data.nickname ?? parsed.data.label,
        type: parsed.data.type,
        payload: encrypted.encryptedData,
        payload_iv: encrypted.iv,
        payload_tag: encrypted.tag,
        payload_salt: encrypted.salt,
        isDefault: parsed.data.isDefault ?? false,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      data: decryptAddressRow(decoded.email, data as AddressRow),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'No pudimos guardar tu dirección';
    console.error('Error guardando dirección:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const decoded = await requireUser(request);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = addressSchema.safeParse(payload);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json(
        { success: false, message: parsed.error?.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      );
    }

    const encrypted = encryptAddressPayload(decoded.email, parsed.data);

    const { data, error } = await supabase
      .from('addresses')
      .update({
        label: parsed.data.label,
        nickname: parsed.data.nickname ?? parsed.data.label,
        type: parsed.data.type,
        payload: encrypted.encryptedData,
        payload_iv: encrypted.iv,
        payload_tag: encrypted.tag,
        payload_salt: encrypted.salt,
        isDefault: parsed.data.isDefault ?? false,
      })
      .eq('id', parsed.data.id)
      .eq('userId', decoded.userId)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, message: 'Dirección no encontrada' },
          { status: 404 }
        );
      }
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      data: decryptAddressRow(decoded.email, data as AddressRow),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'No pudimos actualizar la dirección';
    console.error('Error actualizando dirección:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const decoded = await requireUser(request);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    if (!idParam) {
      return NextResponse.json(
        { success: false, message: 'Falta el identificador de la dirección' },
        { status: 400 }
      );
    }

    const parsedId = idSchema.safeParse({ id: idParam });
    if (!parsedId.success) {
      return NextResponse.json(
        { success: false, message: 'Identificador inválido' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', parsedId.data.id)
      .eq('userId', decoded.userId);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'No pudimos eliminar la dirección';
    console.error('Error eliminando dirección:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
