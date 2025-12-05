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

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'La imagen debe ser menor a 5MB' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop() || file.type.split('/')[1] || 'jpg';
    const fileName = `${Date.now()}.${ext}`;
    const storagePath = `${decoded.userId}/${fileName}`;

    // Buscar avatar previo para eliminarlo después
    const { data: currentUser } = await supabase
      .from('users')
      .select('avatarUrl')
      .eq('id', decoded.userId)
      .maybeSingle();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Eliminar avatar anterior si existe y es distinto
    const previousPath = currentUser?.avatarUrl as string | null;
    if (previousPath && previousPath !== storagePath) {
      await supabase.storage.from('avatars').remove([previousPath]);
    }

    // Actualizar registro del usuario
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatarUrl: storagePath, updatedAt: new Date().toISOString() })
      .eq('id', decoded.userId);

    if (updateError) {
      throw updateError;
    }

    const updatedUser = await getUserById(decoded.userId);

    return NextResponse.json({
      success: true,
      data: {
        path: storagePath,
        signedUrl: updatedUser?.avatarUrl ?? null,
        user: updatedUser,
      },
    });
  } catch (error: any) {
    console.error('Error subiendo avatar:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
