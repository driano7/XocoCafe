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
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import { supabase } from '@/lib/supabase';
import { encryptUserData, decryptUserData, mapEncryptedDataToColumnNames } from '@/lib/encryption';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google' && profile) {
        const p: any = profile;
        if (p.given_name) token.givenName = p.given_name;
        if (p.family_name) token.familyName = p.family_name;
        if (p.picture) token.picture = p.picture;
      }
      return token;
    },
    async signIn({ user, account }) {
      try {
        if (account?.provider === 'google') {
          const { data: existingUser, error } = await supabase
            .from('users')
            .select('id,email,authProvider,googleId')
            .eq('email', user.email!)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            throw new Error(`Error verificando usuario: ${error.message}`);
          }

          if (!existingUser) {
            // Crear nuevo usuario con Google
            const userData = {
              id: randomUUID(),
              email: user.email!,
              clientId: randomUUID(),
              firstName: user.name?.split(' ')[0] || null,
              lastName: user.name?.split(' ').slice(1).join(' ') || null,
              authProvider: 'google',
              googleId: user.id,
              termsAccepted: false, // Necesitará completar el perfil
              privacyAccepted: false,
              marketingEmail: false,
              marketingSms: false,
              marketingPush: false,
              createdAt: new Date().toISOString(),
              consentUpdatedAt: new Date().toISOString(),
            };

            // Cifrar datos sensibles
            const encryptedData = encryptUserData(user.email!, userData);
            const mappedData = mapEncryptedDataToColumnNames(encryptedData);

            const { error: insertError } = await supabase.from('users').insert({
              ...mappedData,
              authProvider: 'google',
              googleId: user.id,
            });

            if (insertError) {
              throw new Error(`Error creando usuario con Google: ${insertError.message}`);
            }
          } else if (existingUser.authProvider === 'email') {
            // Usuario existente con email, agregar Google
            const { error: updateError } = await supabase
              .from('users')
              .update({
                authProvider: 'both',
                googleId: user.id,
              })
              .eq('id', existingUser.id);
            if (updateError) {
              throw new Error(`Error actualizando usuario existente: ${updateError.message}`);
            }
          }
        }
        return true;
      } catch (error) {
        console.error('Error en signIn callback:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user) {
        type MutableSessionUser = typeof session.user & {
          id?: string;
          clientId?: string | null;
          firstName?: string | null;
          lastName?: string | null;
          authProvider?: string | null;
          profileComplete?: boolean;
        };
        const sessionUser = session.user as MutableSessionUser;

        const { data: dbUser, error } = await supabase
          .from('users')
          .select(
            'id,email,clientId,firstNameEncrypted,firstNameIv,firstNameTag,firstNameSalt,lastNameEncrypted,lastNameIv,lastNameTag,lastNameSalt,authProvider,termsAccepted,privacyAccepted'
          )
          .eq('email', session.user.email!)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error obteniendo datos de sesión:', error);
          return session;
        }

        if (dbUser) {
          // Descifrar datos sensibles
          const decryptedData = decryptUserData(session.user.email!, dbUser);

          sessionUser.id = dbUser.id;
          sessionUser.clientId = dbUser.clientId;
          sessionUser.firstName = decryptedData.firstName;
          sessionUser.lastName = decryptedData.lastName;
          sessionUser.authProvider = dbUser.authProvider;
          sessionUser.profileComplete = dbUser.termsAccepted && dbUser.privacyAccepted;
          // Enriquecer con datos del token (Google profile)
          if (token && typeof token === 'object') {
            const extendedSessionUser = session.user as unknown as Record<string, unknown>;
            if ((token as any).givenName) {
              extendedSessionUser.givenName = (token as any).givenName;
            }
            if ((token as any).familyName) {
              extendedSessionUser.familyName = (token as any).familyName;
            }
            if ((token as any).picture && !session.user.image) {
              extendedSessionUser.image = (token as any).picture as string;
            }
          }
        }
      }
      // Exponer URL de Amplitude para debug/cliente
      // @ts-expect-error campo extendido en session
      session.amplitudeApiUrl =
        process.env.NEXT_PUBLIC_AMPLITUDE_HTTP_API_URL || 'https://api2.amplitude.com/2/httpapi';
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(...args: unknown[]) {
      console.error('NextAuth Error:', ...args);
    },
    warn(...args: unknown[]) {
      console.warn('NextAuth Warning:', ...args);
    },
    debug(...args: unknown[]) {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth Debug:', ...args);
      }
    },
  },
});
