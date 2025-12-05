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

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface AnalyticsData {
  pagePath: string;
  pageTitle?: string;
  pageCategory?: string;
  timeOnPage: number;
  scrollDepth: number;
  bounce: boolean;
  exitPage: boolean;
  userAgent?: string;
  referrerUrl?: string;
  conversionEvent?: string;
  conversionValue?: number;
}

interface UseAnalyticsOptions {
  trackPageViews?: boolean;
  trackScrollDepth?: boolean;
  trackTimeOnPage?: boolean;
  trackBounce?: boolean;
  trackExitPage?: boolean;
  debug?: boolean;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const {
    trackPageViews = true,
    trackScrollDepth = true,
    trackBounce = true,
    trackExitPage = true,
    debug = false,
  } = options;

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const scrollDepthRef = useRef<number>(0);
  const maxScrollDepthRef = useRef<number>(0);
  const hasTrackedPageRef = useRef<boolean>(false);
  const bounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generar o recuperar sessionId
  useEffect(() => {
    let existingSessionId = sessionStorage.getItem('analytics_session_id');
    if (!existingSessionId) {
      existingSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', existingSessionId);
    }
    setSessionId(existingSessionId);

    // Recuperar userId si está disponible
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  // Track scroll depth
  useEffect(() => {
    if (!trackScrollDepth) return;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollDepth = Math.round((scrollTop / scrollHeight) * 100);

      maxScrollDepthRef.current = Math.max(maxScrollDepthRef.current, scrollDepth);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackScrollDepth]);

  // Track bounce (salida rápida)
  useEffect(() => {
    if (!trackBounce) return;

    bounceTimeoutRef.current = setTimeout(() => {
      if (!hasTrackedPageRef.current) {
        trackEvent('page_view', {
          bounce: true,
          timeOnPage: Date.now() - startTimeRef.current,
        });
      }
    }, 3000); // 3 segundos para considerar bounce

    return () => {
      if (bounceTimeoutRef.current) {
        clearTimeout(bounceTimeoutRef.current);
      }
    };
  }, [pathname, trackBounce]);

  // Track exit page
  useEffect(() => {
    if (!trackExitPage) return;

    const handleBeforeUnload = () => {
      trackEvent('page_exit', {
        exitPage: true,
        timeOnPage: Date.now() - startTimeRef.current,
        scrollDepth: maxScrollDepthRef.current,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [trackExitPage]);

  // Track page view cuando cambia la ruta
  useEffect(() => {
    if (!trackPageViews || !sessionId) return;

    // Resetear métricas para la nueva página
    startTimeRef.current = Date.now();
    scrollDepthRef.current = 0;
    maxScrollDepthRef.current = 0;
    hasTrackedPageRef.current = false;

    // Track page view después de un pequeño delay para asegurar que la página está cargada
    const timeoutId = setTimeout(() => {
      trackPageView();
    }, 200); // Delay duplicado para reducir a la mitad los envíos automáticos

    return () => clearTimeout(timeoutId);
  }, [pathname, searchParams, sessionId, trackPageViews]);

  const trackPageView = async () => {
    if (!sessionId || hasTrackedPageRef.current) return;

    const analyticsData: AnalyticsData = {
      pagePath: pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''),
      pageTitle: document.title,
      pageCategory: getPageCategory(pathname),
      timeOnPage: 0,
      scrollDepth: maxScrollDepthRef.current,
      bounce: false,
      exitPage: false,
      userAgent: navigator.userAgent,
      referrerUrl: document.referrer || undefined,
    };

    try {
      await sendAnalyticsData('page_view', analyticsData);
      hasTrackedPageRef.current = true;

      if (debug) {
        console.log('Analytics: Page view tracked', analyticsData);
      }
    } catch (error) {
      if (debug) {
        console.error('Analytics: Error tracking page view', error);
      }
    }
  };

  const trackEvent = async (eventType: string, eventData: Partial<AnalyticsData> = {}) => {
    if (!sessionId) return;

    const analyticsData: AnalyticsData = {
      pagePath: pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''),
      pageTitle: document.title,
      pageCategory: getPageCategory(pathname),
      timeOnPage: Date.now() - startTimeRef.current,
      scrollDepth: maxScrollDepthRef.current,
      bounce: false,
      exitPage: false,
      userAgent: navigator.userAgent,
      referrerUrl: document.referrer || undefined,
      ...eventData,
    };

    try {
      await sendAnalyticsData(eventType, analyticsData);

      if (debug) {
        console.log('Analytics: Event tracked', eventType, analyticsData);
      }
    } catch (error) {
      if (debug) {
        console.error('Analytics: Error tracking event', error);
      }
    }
  };

  const trackConversion = async (
    eventType: string,
    value?: number,
    eventData: Record<string, any> = {}
  ) => {
    await trackEvent(eventType, {
      conversionEvent: eventType,
      conversionValue: value,
      ...eventData,
    });
  };

  const sendAnalyticsData = async (eventType: string, data: AnalyticsData) => {
    const payload = {
      eventType,
      sessionId,
      userId,
      ...data,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      utmSource: getUrlParameter('utm_source'),
      utmMedium: getUrlParameter('utm_medium'),
      utmCampaign: getUrlParameter('utm_campaign'),
      utmTerm: getUrlParameter('utm_term'),
      utmContent: getUrlParameter('utm_content'),
    };

    // Enviar a la API
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  };

  const getPageCategory = (path: string): string => {
    if (path === '/') return 'home';
    if (path.startsWith('/blog')) return 'blog';
    if (path.startsWith('/login')) return 'auth';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/projects')) return 'projects';
    if (path.startsWith('/about')) return 'about';
    if (path.startsWith('/uses')) return 'uses';
    return 'other';
  };

  const getUrlParameter = (name: string): string | undefined => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || undefined;
  };

  return {
    trackEvent,
    trackConversion,
    sessionId,
    userId,
    setUserId,
  };
}

// Hook específico para tracking de conversiones
export function useConversionTracking() {
  const { trackConversion } = useAnalytics();

  const trackSignup = (method: string = 'email') => {
    trackConversion('signup', undefined, { method });
  };

  const trackLogin = (method: string = 'email') => {
    trackConversion('login', undefined, { method });
  };

  const trackPurchase = (value: number, orderId?: string) => {
    trackConversion('purchase', value, { orderId });
  };

  const trackNewsletterSignup = () => {
    trackConversion('newsletter_signup');
  };

  const trackContactForm = () => {
    trackConversion('contact_form');
  };

  const trackDownload = (fileName: string) => {
    trackConversion('download', undefined, { fileName });
  };

  return {
    trackSignup,
    trackLogin,
    trackPurchase,
    trackNewsletterSignup,
    trackContactForm,
    trackDownload,
  };
}
