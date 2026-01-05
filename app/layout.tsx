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

import '../css/prism.css';
import '../css/tailwind.css';

import { Suspense } from 'react';
import { Lato } from 'next/font/google';
import Analytics from '@/components/Analytics';
import { AnalyticsProvider } from '@/components/Analytics/AnalyticsProvider';
import { AuthProvider } from '@/components/Auth/AuthProvider';
import { LanguageProvider } from '@/components/Language/LanguageProvider';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import LenisProvider from '@/components/Providers/LenisProvider';
import ThemeProvider from '@/components/Providers/ThemeProvider';
import { SessionProvider } from 'next-auth/react';
import FeedbackPromptGate from '@/components/Feedback/FeedbackPromptGate';
import DockNav from '@/components/DockNav';
import AndroidViewportFix from '@/components/Providers/AndroidViewportFix';
import PageTransition from '@/components/PageTransition';

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-lato',
  preload: true,
});

export const metadata = {
  title: 'Xoco Café',
  description: 'Sabor ancestral, placer eterno',
  metadataBase: new URL('http://localhost:8000'),
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="76x76" href="/static/favicons/CafeIcon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/static/favicons/CafeIcon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/static/favicons/CafeIcon.png" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
        <link rel="preload" as="image" href="/static/images/Xoco.jpeg" />
      </head>
      <body
        className={`${lato.className} ${lato.variable} bg-white text-black antialiased dark:bg-black dark:text-white overflow-x-hidden`}
      >
        <SessionProvider>
          <LanguageProvider fallbackLanguage="es">
            <Suspense fallback={null}>
              <AnalyticsProvider
                options={{
                  trackPageViews: true,
                  trackScrollDepth: true,
                  trackTimeOnPage: true,
                  trackBounce: true,
                  trackExitPage: true,
                  debug: process.env.NODE_ENV === 'development',
                }}
              >
                <AuthProvider>
                  <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem={false}
                    themes={['dark', 'light']}
                  >
                    <AndroidViewportFix />
                    <Header />
                    <LenisProvider>
                      <main className="pt-20 pb-4 sm:pt-20 sm:pb-10 lg:pt-24 lg:pb-16">
                        <PageTransition>{children}</PageTransition>
                      </main>
                    </LenisProvider>
                    <DockNav />
                    <Footer />
                    <Analytics />
                    <FeedbackPromptGate />
                  </ThemeProvider>
                </AuthProvider>
              </AnalyticsProvider>
            </Suspense>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
