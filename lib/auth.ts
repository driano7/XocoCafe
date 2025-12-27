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

import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';
import { decryptUserData } from '@/lib/encryption';
import { decryptAddressRow, type AddressRow } from '@/lib/address-vault';
import type { AuthUser } from './validations/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = '7d';
const COLUMN_MISSING_REGEX = /column .* does not exist/i;
const ADDRESS_ENCRYPTED_FIELDS_CAMEL =
  'id,"userId",label,nickname,type,"isDefault",payload,payloadIv,payloadTag,payloadSalt,street,city,state,"postalCode",country,reference,additionalInfo,"createdAt","updatedAt"';
const ADDRESS_ENCRYPTED_FIELDS_SNAKE =
  'id,"userId",label,nickname,type,"isDefault",payload,payload_iv,payload_tag,payload_salt,street,city,state,"postalCode",country,reference,additionalInfo,"createdAt","updatedAt"';
const ADDRESS_LEGACY_FIELDS =
  'id,"userId",type,street,city,state,"postalCode",country,reference,additionalInfo,"isDefault","createdAt","updatedAt"';
const nowIso = () => new Date().toISOString();

const ADDRESS_SELECT_VARIANTS = [
  '*',
  ADDRESS_ENCRYPTED_FIELDS_CAMEL,
  ADDRESS_ENCRYPTED_FIELDS_SNAKE,
  ADDRESS_LEGACY_FIELDS,
];

const fetchAddressRows = async (userId: string): Promise<AddressRow[]> => {
  let lastError: { message?: string } | null = null;
  for (const fields of ADDRESS_SELECT_VARIANTS) {
    const { data, error } = await supabase.from('addresses').select(fields).eq('userId', userId);
    if (!error) {
      return (data ?? []) as unknown as AddressRow[];
    }
    lastError = error;
    if (!COLUMN_MISSING_REGEX.test(error.message ?? '')) {
      throw new Error(`Error al obtener direcciones del usuario: ${error.message}`);
    }
  }
  throw new Error(
    `Error al obtener direcciones del usuario: ${
      lastError?.message ?? 'columnas incompatibles en la tabla addresses'
    }`
  );
};

async function getSignedAvatarUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(path, 60 * 60 * 24);
    if (error) {
      console.error('Error creando URL firmada de avatar:', error);
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (error) {
    console.error('Error generando URL firmada de avatar:', error);
    return null;
  }
}

// Hash de contraseña
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Verificar contraseña
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generar JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      clientId: user.clientId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verificar JWT token
export function verifyToken(
  token: string
): { userId: string; email: string; clientId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload | string;
    if (!decoded || typeof decoded === 'string') {
      return null;
    }
    const { userId, email, clientId } = decoded as Partial<JwtPayload> & {
      userId?: string;
      email?: string;
      clientId?: string;
    };
    if (!userId || !email || !clientId) {
      return null;
    }
    return { userId, email, clientId };
  } catch (error) {
    return null;
  }
}

// Crear sesión en base de datos
export async function createSession(userId: string, token: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 días
  const { error } = await supabase.from('sessions').insert({
    id: randomUUID(),
    userId,
    token,
    expiresAt: expiresAt.toISOString(),
  });
  if (error) {
    throw new Error(`Error al crear sesión: ${error.message}`);
  }
}

// Eliminar sesión
export async function deleteSession(token: string): Promise<void> {
  const { error } = await supabase.from('sessions').delete().eq('token', token);
  if (error) {
    throw new Error(`Error al eliminar sesión: ${error.message}`);
  }
}

// Limpiar sesiones expiradas
export async function cleanExpiredSessions(): Promise<void> {
  const { error } = await supabase.from('sessions').delete().lt('expiresAt', nowIso());
  if (error) {
    throw new Error(`Error al limpiar sesiones expiradas: ${error.message}`);
  }
}

// Obtener usuario por email
export async function getUserByEmail(email: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select(
      'id,email,passwordHash,clientId,authProvider,firstNameEncrypted,firstNameIv,firstNameTag,firstNameSalt,lastNameEncrypted,lastNameIv,lastNameTag,lastNameSalt,phoneEncrypted,phoneIv,phoneTag,phoneSalt,walletAddress,city,country,favoriteColdDrink,favoriteHotDrink,favoriteFood,weeklyCoffeeCount,termsAccepted,privacyAccepted,marketingEmail,marketingSms,marketingPush,createdAt,lastLoginAt,avatarUrl'
    )
    .eq('email', email)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error al obtener usuario por email: ${error.message}`);
  }

  if (!user) return null;

  const decryptedData = decryptUserData(email, user);
  const { passwordHash, ...userWithoutPassword } = user;
  const avatarSignedUrl = await getSignedAvatarUrl(user.avatarUrl as string | null);

  return {
    ...userWithoutPassword,
    firstName: decryptedData.firstName || undefined,
    lastName: decryptedData.lastName || undefined,
    walletAddress: user.walletAddress || undefined,
    phone: decryptedData.phone || undefined,
    favoriteColdDrink: user.favoriteColdDrink || undefined,
    favoriteHotDrink: user.favoriteHotDrink || undefined,
    favoriteFood: user.favoriteFood || undefined,
    weeklyCoffeeCount: user.weeklyCoffeeCount ?? 0,
    avatarUrl: avatarSignedUrl,
    avatarStoragePath: (user.avatarUrl as string | null) || null,
    passwordHash,
  };
}

// Obtener usuario por ID
export async function getUserById(id: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select(
      'id,email,clientId,firstNameEncrypted,firstNameIv,firstNameTag,firstNameSalt,lastNameEncrypted,lastNameIv,lastNameTag,lastNameSalt,phoneEncrypted,phoneIv,phoneTag,phoneSalt,walletAddress,city,country,favoriteColdDrink,favoriteHotDrink,favoriteFood,weeklyCoffeeCount,termsAccepted,privacyAccepted,marketingEmail,marketingSms,marketingPush,createdAt,lastLoginAt,avatarUrl,loyaltyActivatedAt'
    )
    .eq('id', id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error al obtener usuario por ID: ${error.message}`);
  }

  if (!user) return null;

  const [{ data: loyaltyPoints, error: loyaltyError }, { data: orders, error: ordersError }] =
    await Promise.all([
      supabase.from('loyalty_points').select('*').eq('userId', id),
      supabase
        .from('orders')
        .select('id,orderNumber,status,total,currency,createdAt,updatedAt,items:order_items(*)')
        .eq('userId', id),
    ]);

  const addressRows = await fetchAddressRows(id);

  if (loyaltyError) {
    throw new Error(`Error al obtener puntos de lealtad: ${loyaltyError.message}`);
  }
  if (ordersError) {
    throw new Error(`Error al obtener órdenes del usuario: ${ordersError.message}`);
  }

  // Descifrar datos sensibles
  const decryptedData = decryptUserData(user.email, user);
  const avatarSignedUrl = await getSignedAvatarUrl(user.avatarUrl as string | null);
  const addresses = addressRows.map((row) => decryptAddressRow(user.email, row));

  // Convertir null a undefined para campos opcionales
  return {
    ...user,
    firstName: decryptedData.firstName || undefined,
    lastName: decryptedData.lastName || undefined,
    walletAddress: user.walletAddress || undefined,
    phone: decryptedData.phone || undefined,
    city: user.city || undefined,
    country: user.country || undefined,
    favoriteColdDrink: user.favoriteColdDrink || undefined,
    favoriteHotDrink: user.favoriteHotDrink || undefined,
    favoriteFood: user.favoriteFood || undefined,
    weeklyCoffeeCount: user.weeklyCoffeeCount ?? 0,
    avatarUrl: avatarSignedUrl,
    avatarStoragePath: (user.avatarUrl as string | null) || null,
    loyaltyActivatedAt: user.loyaltyActivatedAt || null,
    addresses,
    loyaltyPoints,
    orders,
  };
}
// Actualizar último login
export async function updateLastLogin(userId: string): Promise<void> {
  const { error } = await supabase.from('users').update({ lastLoginAt: nowIso() }).eq('id', userId);
  if (error) {
    throw new Error(`Error al actualizar último login: ${error.message}`);
  }
}

// Registrar log de retención de datos (GDPR)
export async function logDataRetentionAction(
  userId: string,
  action: string,
  details?: Record<string, unknown> | null
): Promise<void> {
  const { error } = await supabase.from('data_retention_logs').insert({
    id: randomUUID(),
    userId,
    action,
    details: details ? JSON.stringify(details) : null,
    createdAt: nowIso(),
  });
  if (error) {
    throw new Error(`Error al registrar acción de retención: ${error.message}`);
  }
}

// Exportar datos del usuario (GDPR)
export async function exportUserData(userId: string) {
  const [userResult, ordersResult, loyaltyPointsResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).maybeSingle(),
    supabase.from('orders').select('*, items:order_items(*)').eq('userId', userId),
    supabase.from('loyalty_points').select('*').eq('userId', userId),
  ]);

  if (userResult.error) throw userResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (loyaltyPointsResult.error) throw loyaltyPointsResult.error;

  const addressRows: AddressRow[] = userResult.data ? await fetchAddressRows(userId) : [];
  const decryptedAddresses = userResult.data?.email
    ? addressRows.map((row) => decryptAddressRow(userResult.data!.email, row))
    : addressRows;

  return {
    ...userResult.data,
    addresses: decryptedAddresses,
    orders: ordersResult.data,
    loyaltyPoints: loyaltyPointsResult.data,
    avatarUrl: userResult.data?.avatarUrl ?? null,
  };
}

async function deleteByUserId(table: string, userId: string) {
  const { error } = await supabase.from(table).delete().eq('userId', userId);
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error al eliminar registros en ${table}: ${error.message}`);
  }
}

// Eliminar datos del usuario (GDPR)
export async function deleteUserData(userId: string): Promise<void> {
  const [{ data: profile, error: profileError }, { data: orders, error: ordersLookupError }] =
    await Promise.all([
      supabase.from('users').select('avatarUrl').eq('id', userId).maybeSingle(),
      supabase.from('orders').select('id').eq('userId', userId),
    ]);

  if (profileError && profileError.code !== 'PGRST116') {
    throw new Error(`Error al consultar perfil antes de eliminar usuario: ${profileError.message}`);
  }

  if (ordersLookupError && ordersLookupError.code !== 'PGRST116') {
    throw new Error(`Error al consultar órdenes del usuario: ${ordersLookupError.message}`);
  }

  const orderIds = (orders ?? []).map((order) => order.id).filter(Boolean);
  if (orderIds.length > 0) {
    const { error: orderItemsError } = await supabase
      .from('order_items')
      .delete()
      .in('orderId', orderIds);
    if (orderItemsError && orderItemsError.code !== 'PGRST116') {
      throw new Error(`Error al eliminar artículos del pedido: ${orderItemsError.message}`);
    }
    const { error: ticketError } = await supabase.from('tickets').delete().in('orderId', orderIds);
    if (ticketError && ticketError.code !== 'PGRST116') {
      throw new Error(`Error al eliminar tickets asociados: ${ticketError.message}`);
    }
    const { error: ordersDeleteError } = await supabase.from('orders').delete().in('id', orderIds);
    if (ordersDeleteError) {
      throw new Error(`Error al eliminar órdenes del usuario: ${ordersDeleteError.message}`);
    }
  }

  const relatedTables = [
    'sessions',
    'addresses',
    'loyalty_points',
    'page_analytics',
    'conversion_events',
    'reservations',
    'reservation_failures',
  ];

  for (const table of relatedTables) {
    await deleteByUserId(table, userId);
  }

  if (profile?.avatarUrl) {
    const { error: avatarDeleteError } = await supabase.storage
      .from('avatars')
      .remove([profile.avatarUrl]);
    if (avatarDeleteError) {
      console.warn('No se pudo eliminar el avatar del usuario:', avatarDeleteError);
    }
  }

  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) {
    throw new Error(`Error al eliminar usuario: ${error.message}`);
  }
}

type CleanupOptions = {
  inactivityDays?: number;
  batchSize?: number;
};

export async function cleanupInactiveUsers({
  inactivityDays = 365,
  batchSize = 100,
}: CleanupOptions = {}) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactivityDays);
  const cutoffIso = cutoff.toISOString();

  const inactivityFilter = `lastLoginAt.lt.${cutoffIso},and(lastLoginAt.is.null,createdAt.lt.${cutoffIso})`;
  const { data: inactiveUsers, error } = await supabase
    .from('users')
    .select('id,lastLoginAt,createdAt,email')
    .or(inactivityFilter)
    .order('lastLoginAt', { ascending: true })
    .limit(batchSize);

  if (error) {
    throw new Error(`Error consultando usuarios inactivos: ${error.message}`);
  }

  const deletedUserIds: string[] = [];
  const failures: Array<{ userId: string; reason: string }> = [];

  for (const user of inactiveUsers ?? []) {
    try {
      await logDataRetentionAction(user.id, 'auto_data_deletion', {
        reason: 'inactive_over_12_months',
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      });
    } catch (logError) {
      console.warn('No pudimos registrar log de retención para el usuario', user.id, logError);
    }

    try {
      await deleteUserData(user.id);
      deletedUserIds.push(user.id);
    } catch (deletionError: unknown) {
      console.error('No pudimos eliminar datos del usuario inactivo:', user.id, deletionError);
      failures.push({
        userId: user.id,
        reason: deletionError instanceof Error ? deletionError.message : 'unknown_error',
      });
    }
  }

  return {
    cutoff: cutoffIso,
    deletedCount: deletedUserIds.length,
    deletedUserIds,
    failures,
  };
}
