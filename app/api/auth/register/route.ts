import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { registerSchema } from '@/lib/validations/auth';
import {
  hashPassword,
  generateToken,
  createSession,
  getUserByEmail,
  logDataRetentionAction,
} from '@/lib/auth';
import { encryptUserData, mapEncryptedDataToColumnNames } from '@/lib/encryption';
import { supabase } from '@/lib/supabase';
import type { AuthUser } from '@/lib/validations/auth';
import { normalizeWalletAddress } from '@/lib/wallet';

function generateClientIdCode(): string {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  const numbers = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${letters}-${numbers}`;
}

async function generateUniqueClientId(): Promise<string> {
  const maxAttempts = 15;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateClientIdCode();
    const { data, error } = await supabase
      .from('users')
      .select('clientId')
      .eq('clientId', candidate)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Error verificando clientId: ${error.message}`);
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error('No se pudo generar un ID de cliente único. Inténtalo nuevamente.');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validar datos de entrada
    const validatedData = registerSchema.parse(body);
    const passwordHash = await hashPassword(password);
    const sensitiveData = {
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      phone: validatedData.phone,
    };
    const encryptedData = encryptUserData(email, sensitiveData);
    const mappedEncryptedData = mapEncryptedDataToColumnNames(encryptedData);

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'El usuario ya existe', code: 'USER_EXISTS' },
        { status: 400 }
      );
    }

    // Crear usuario
    const now = new Date().toISOString();
    const clientId = await generateUniqueClientId();
    const newUser = {
      id: crypto.randomUUID(),
      clientId,
      email: validatedData.email,
      passwordHash,
      walletAddress: normalizeWalletAddress(validatedData.walletAddress),
      city: validatedData.city,
      country: validatedData.country,
      termsAccepted: validatedData.termsAndPrivacyAccepted,
      privacyAccepted: validatedData.termsAndPrivacyAccepted,
      marketingEmail: validatedData.marketingEmail || false,
      marketingSms: false, // SMS removido
      marketingPush: validatedData.marketingPush || false,
      consentUpdatedAt: now,
      createdAt: now,
      ...mappedEncryptedData,
    };

    const { error: insertError } = await supabase.from('users').insert(newUser);
    if (insertError) {
      throw new Error(insertError.message);
    }

    const createdUser = await getUserByEmail(email);
    if (!createdUser) {
      throw new Error('No se pudo recuperar el usuario recién creado');
    }

    const userForToken: AuthUser = {
      id: createdUser.id,
      email: createdUser.email,
      clientId: createdUser.clientId,
      firstName: createdUser.firstName || undefined,
      lastName: createdUser.lastName || undefined,
      walletAddress: createdUser.walletAddress || undefined,
      termsAccepted: createdUser.termsAccepted,
      privacyAccepted: createdUser.privacyAccepted,
      marketingEmail: createdUser.marketingEmail,
      marketingSms: createdUser.marketingSms,
      marketingPush: createdUser.marketingPush,
    };

    const token = generateToken(userForToken);
    await createSession(createdUser.id, token);
    await logDataRetentionAction(createdUser.id, 'account_created', {
      email: createdUser.email,
      consentGiven: {
        terms: createdUser.termsAccepted,
        privacy: createdUser.privacyAccepted,
        marketing: {
          email: createdUser.marketingEmail,
          sms: false,
          push: createdUser.marketingPush,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Cuenta creada exitosamente',
      storage: 'database',
      user: {
        id: createdUser.id,
        email: createdUser.email,
        clientId: createdUser.clientId,
        firstName: createdUser.firstName || undefined,
        lastName: createdUser.lastName || undefined,
        phone: createdUser.phone || undefined,
        walletAddress: createdUser.walletAddress || undefined,
        avatarUrl: createdUser.avatarUrl || undefined,
        avatarStoragePath: createdUser.avatarStoragePath || undefined,
      },
      token,
    });
  } catch (error: any) {
    console.error('Error en registro:', error);

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
