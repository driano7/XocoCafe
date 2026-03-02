/*
 * --------------------------------------------------------------------
 * Xoco Café — Software Property
 * Copyright (c) 2025 Xoco Café
 * Principal Developer: Donovan Riaño
 * Licensed under the Apache License, Version 2.0
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
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google' && profile) {
        const p = profile as Record<string, unknown>;
        if (typeof p['given_name'] === 'string') token.givenName = p['given_name'];
        if (typeof p['family_name'] === 'string') token.familyName = p['family_name'];
        if (typeof p['picture'] === 'string') token.picture = p['picture'];
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
          if (error && error.code !== 'PGRST116') throw new Error(error.message);
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
            if (insertError) throw new Error(insertError.message);
          } else if (existingUser.authProvider === 'email') {
            const { error: updateError } = await supabase
              .from('users')
              .update({ authProvider: 'both', googleId: user.id })
              .eq('id', existingUser.id);
            if (updateError) throw new Error(updateError.message);
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
          const u = session.user as Record<string, unknown>;
          u['id'] = dbUser.id;
          u['clientId'] = dbUser.clientId;
          u['firstName'] = decryptedData.firstName;
          u['lastName'] = decryptedData.lastName;
          u['authProvider'] = dbUser.authProvider;
          u['profileComplete'] = dbUser.termsAccepted && dbUser.privacyAccepted;
          if (token.givenName) u['givenName'] = token.givenName;
          if (token.familyName) u['familyName'] = token.familyName;
          if (token.picture && !session.user.image) u['image'] = token.picture;
        }
      }
      (session as Record<string, unknown>)['amplitudeApiUrl'] =
        process.env.NEXT_PUBLIC_AMPLITUDE_HTTP_API_URL || 'https://api2.amplitude.com/2/httpapi';
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
});

export { handlers as authOptions };
