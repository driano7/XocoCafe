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
import { loginSchema } from '@/lib/validations/auth';
import {
  verifyPassword,
  generateToken,
  createSession,
  getUserByEmail,
  updateLastLogin,
  logDataRetentionAction,
} from '@/lib/auth';
import { decryptUserData } from '@/lib/encryption';
import { incrementAppCounter } from '@/lib/app-metrics';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos de entrada
    const validatedData = loginSchema.parse(body);

    // Buscar usuario
    const user = await getUserByEmail(validatedData.email);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Esta cuenta se creó con Google. Usa "Continuar con Google" o restablece tu contraseña.',
        },
        { status: 400 }
      );
    }

    // Verificar contraseña
    const isValidPassword = await verifyPassword(validatedData.password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Generar token
    const token = generateToken(user);

    // Crear sesión
    await createSession(user.id, token);

    // Actualizar último login
    await updateLastLogin(user.id);

    // Log de login
    await logDataRetentionAction(user.id, 'login', {
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    // Incrementar contador global de logins
    const loginCount = await incrementAppCounter('login_successes');
    const showFeedbackPrompt =
      typeof loginCount === 'number' && loginCount >= 50 && loginCount % 50 === 0;

    // Descifrar datos sensibles
    const decryptedData = decryptUserData(user.email, user);

    return NextResponse.json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: user.id,
        email: user.email,
        clientId: user.clientId,
        firstName: decryptedData.firstName || undefined,
        lastName: decryptedData.lastName || undefined,
        phone: decryptedData.phone || undefined,
        city: user.city || undefined,
        country: user.country || undefined,
        walletAddress: user.walletAddress || undefined,
        avatarUrl: user.avatarUrl || undefined,
        avatarStoragePath: user.avatarStoragePath || undefined,
      },
      token,
      loginCount,
      showFeedbackPrompt,
    });
  } catch (error: any) {
    console.error('Error en login:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Datos inválidos', errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
