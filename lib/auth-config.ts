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
type NextAuthOptions = Parameters<typeof NextAuth>[0];
import type { Account, Profile, Session, User } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import type { Provider } from 'next-auth/providers';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import { supabase } from '@/lib/supabase';
import { encryptUserData, decryptUserData, mapEncryptedDataToColumnNames } from '@/lib/encryption';
import type { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    amplitudeApiUrl?: string;
  }
}

const googleProvider = GoogleProvider({
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
}) satisfies Provider;

const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [googleProvider],
  callbacks: {
    async jwt({
      token,
      account,
      profile,
    }: {
      token: JWT;
      account?: Account | null;
      profile?: Profile | null;
    }) {
      if (account?.provider === 'google' && profile) {
        const profileData = profile as Record<string, unknown>;
        const givenName = profileData['given_name'] ?? profileData['givenName'];
        const familyName = profileData['family_name'] ?? profileData['familyName'];
        const picture = profileData['picture'];
        if (typeof givenName === 'string') token.givenName = givenName;
        if (typeof familyName === 'string') token.familyName = familyName;
        if (typeof picture === 'string') token.picture = picture;
      }
      return token;
    },
    async signIn({ user, account }: { user: User; account?: Account | null }) {
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
            const userData = {
              id: randomUUID(),
              email: user.email!,
              clientId: randomUUID(),
              firstName: user.name?.split(' ')[0] || null,
              lastName: user.name?.split(' ').slice(1).join(' ') || null,
              authProvider: 'google',
              googleId: user.id,
              termsAccepted: false,
              privacyAccepted: false,
              marketingEmail: false,
              marketingSms: false,
              marketingPush: false,
              createdAt: new Date().toISOString(),
              consentUpdatedAt: new Date().toISOString(),
            };

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
      } catch (error: unknown) {
        console.error('Error en signIn callback:', error);
        return false;
      }
    },
    async session({ session, token }: { session: Session; token: JWT }) {
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
          const decryptedData = decryptUserData(session.user.email!, dbUser);

          sessionUser.id = dbUser.id;
          sessionUser.clientId = dbUser.clientId;
          sessionUser.firstName = decryptedData.firstName;
          sessionUser.lastName = decryptedData.lastName;
          sessionUser.authProvider = dbUser.authProvider;
          sessionUser.profileComplete = dbUser.termsAccepted && dbUser.privacyAccepted;
          if (token && typeof token === 'object') {
            type ExtendedJWT = JWT & {
              givenName?: string;
              familyName?: string;
              picture?: string;
            };
            const extendedToken = token as ExtendedJWT;
            const extendedSessionUser = session.user as MutableSessionUser &
              Record<string, unknown>;
            if (extendedToken.givenName) {
              extendedSessionUser.givenName = extendedToken.givenName;
            }
            if (extendedToken.familyName) {
              extendedSessionUser.familyName = extendedToken.familyName;
            }
            if (extendedToken.picture && !session.user.image) {
              extendedSessionUser.image = extendedToken.picture;
            }
          }
        }
      }
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
    maxAge: 30 * 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(...args: unknown[]) {
      console.error('NextAuth Error:', ...args);
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
export { authOptions };
