import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';
import { decryptUserData } from '@/lib/encryption';
import type { AuthUser } from './validations/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = '7d';
const nowIso = () => new Date().toISOString();

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
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: decoded.userId,
      email: decoded.email,
      clientId: decoded.clientId,
    };
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
      'id,email,passwordHash,clientId,authProvider,firstNameEncrypted,firstNameIv,firstNameTag,firstNameSalt,lastNameEncrypted,lastNameIv,lastNameTag,lastNameSalt,walletAddress,city,country,favoriteColdDrink,favoriteHotDrink,favoriteFood,termsAccepted,privacyAccepted,marketingEmail,marketingSms,marketingPush,createdAt,lastLoginAt,avatarUrl'
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
      'id,email,clientId,firstNameEncrypted,firstNameIv,firstNameTag,firstNameSalt,lastNameEncrypted,lastNameIv,lastNameTag,lastNameSalt,walletAddress,phoneEncrypted,phoneIv,phoneTag,phoneSalt,city,country,favoriteColdDrink,favoriteHotDrink,favoriteFood,termsAccepted,privacyAccepted,marketingEmail,marketingSms,marketingPush,createdAt,lastLoginAt,avatarUrl'
    )
    .eq('id', id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error al obtener usuario por ID: ${error.message}`);
  }

  if (!user) return null;

  const [
    { data: addresses, error: addressesError },
    { data: loyaltyPoints, error: loyaltyError },
    { data: orders, error: ordersError },
  ] = await Promise.all([
    supabase
      .from('addresses')
      .select('id,type,street,city,state,postalCode,country,isDefault')
      .eq('userId', id),
    supabase.from('loyalty_points').select('*').eq('userId', id),
    supabase
      .from('orders')
      .select('id,orderNumber,status,total,currency,createdAt,updatedAt,items:order_items(*)')
      .eq('userId', id),
  ]);

  if (addressesError) {
    throw new Error(`Error al obtener direcciones del usuario: ${addressesError.message}`);
  }
  if (loyaltyError) {
    throw new Error(`Error al obtener puntos de lealtad: ${loyaltyError.message}`);
  }
  if (ordersError) {
    throw new Error(`Error al obtener órdenes del usuario: ${ordersError.message}`);
  }

  // Descifrar datos sensibles
  const decryptedData = decryptUserData(user.email, user);
  const avatarSignedUrl = await getSignedAvatarUrl(user.avatarUrl as string | null);

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
    avatarUrl: avatarSignedUrl,
    avatarStoragePath: (user.avatarUrl as string | null) || null,
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
  details?: any
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
  const [userResult, addressesResult, ordersResult, loyaltyPointsResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).maybeSingle(),
    supabase.from('addresses').select('*').eq('userId', userId),
    supabase.from('orders').select('*, items:order_items(*)').eq('userId', userId),
    supabase.from('loyalty_points').select('*').eq('userId', userId),
  ]);

  if (userResult.error) throw userResult.error;
  if (addressesResult.error) throw addressesResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (loyaltyPointsResult.error) throw loyaltyPointsResult.error;

  return {
    ...userResult.data,
    addresses: addressesResult.data,
    orders: ordersResult.data,
    loyaltyPoints: loyaltyPointsResult.data,
    avatarUrl: userResult.data?.avatarUrl ?? null,
  };
}

// Eliminar datos del usuario (GDPR)
export async function deleteUserData(userId: string): Promise<void> {
  // Eliminar en cascada debido a las relaciones definidas
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) {
    throw new Error(`Error al eliminar usuario: ${error.message}`);
  }
}
