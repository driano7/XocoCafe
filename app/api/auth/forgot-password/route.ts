import { randomUUID, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordResetSchema } from '@/lib/validations/auth';
import { getUserByEmail } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  invalidateResetRecordsForUser,
  isResetTableAvailable,
  markResetTableUnavailable,
  upsertResetRecord,
  type PasswordResetRecord,
} from '@/lib/passwordResetStore';

const RESET_CODE_LENGTH = 6;
const RESET_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function isMissingTableError(error: { message?: string }) {
  return Boolean(error?.message && /password_reset_codes/.test(error.message));
}

function generateResetCode() {
  const bytes = randomBytes(RESET_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < RESET_CODE_LENGTH; i += 1) {
    const index = bytes[i] % RESET_CODE_ALPHABET.length;
    code += RESET_CODE_ALPHABET[index];
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = requestPasswordResetSchema.parse(body);

    // Verificar si el usuario existe
    const user = await getUserByEmail(validatedData.email);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No existe una cuenta con este email' },
        { status: 404 }
      );
    }

    // Verificar si el usuario se registró con Google
    if (user.authProvider === 'google' || user.authProvider === 'both') {
      return NextResponse.json(
        {
          success: false,
          message:
            'Esta cuenta se registró con Google. Usa "Continuar con Google" para iniciar sesión.',
        },
        { status: 400 }
      );
    }

    const resetCode = generateResetCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const requestId = randomUUID();

    // Invalidar códigos previos sin consumir
    const timestamp = new Date().toISOString();
    if (isResetTableAvailable()) {
      const { error: invalidateError } = await supabase
        .from('password_reset_codes')
        .update({ consumedAt: timestamp })
        .eq('userId', user.id)
        .is('consumedAt', null);

      if (invalidateError) {
        if (isMissingTableError(invalidateError)) {
          markResetTableUnavailable();
          console.warn(
            'Tabla password_reset_codes no disponible. Usando almacenamiento en memoria.'
          );
        } else {
          console.warn('Error invalidando códigos previos:', invalidateError.message);
        }
      }
    }

    if (!isResetTableAvailable()) {
      invalidateResetRecordsForUser(user.id, timestamp);
    }

    const metadata = {
      userAgent: request.headers.get('user-agent') || null,
      ip: request.headers.get('x-forwarded-for') || null,
    };

    const record: PasswordResetRecord = {
      id: requestId,
      userId: user.id,
      email: validatedData.email,
      code: resetCode,
      expiresAt: expiresAt.toISOString(),
      metadata,
    };

    if (isResetTableAvailable()) {
      const { error: insertError } = await supabase.from('password_reset_codes').insert(record);

      if (insertError) {
        if (isMissingTableError(insertError)) {
          markResetTableUnavailable();
        } else {
          throw new Error(insertError.message);
        }
      }
    }

    upsertResetRecord(record);

    console.log(
      `Código de recuperación para ${
        validatedData.email
      }: ${resetCode} (expira a ${expiresAt.toISOString()})`
    );

    return NextResponse.json({
      success: true,
      message: 'Te enviamos un código de verificación para restablecer tu contraseña.',
      requestId,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Error en recuperación de contraseña:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Email inválido', errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
