import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface AnalyticsPayload {
  eventType: string;
  sessionId: string;
  userId?: string;
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
  timestamp: string;
  url: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: AnalyticsPayload = await request.json();

    // Verificar conexión a la base de datos
    const connectivityAttempt = await safeSupabase(() =>
      supabase.from('sessions').select('id').limit(1).maybeSingle()
    );
    if (connectivityAttempt.skip) {
      return connectivityAttempt.skip;
    }
    const connectivityResult = connectivityAttempt.result!;
    const { error: connectivityError } = connectivityResult;
    const connectivitySkip = maybeSkipDueToDb(connectivityError);
    if (connectivitySkip) {
      return connectivitySkip;
    }
    if (connectivityError) {
      throw new Error(connectivityError.message);
    }

    // Extraer IP del request
    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Determinar tipo de dispositivo y navegador
    const userAgent = payload.userAgent || '';
    const deviceType = getDeviceType(userAgent);
    const browser = getBrowser(userAgent);
    const os = getOS(userAgent);

    // Buscar o crear sesión
    let sessionId: string | null = null;
    let sessionCreatedAt: string | null = null;
    let sessionPageViews = 0;

    const existingSessionAttempt = await safeSupabase(() =>
      supabase
        .from('sessions')
        .select('id,createdAt,pageViews')
        .eq('token', payload.sessionId)
        .maybeSingle()
    );
    if (existingSessionAttempt.skip) {
      return existingSessionAttempt.skip;
    }
    const { data: existingSession, error: sessionFetchError } = existingSessionAttempt.result!;

    if (sessionFetchError && sessionFetchError.code !== 'PGRST116') {
      const skip = maybeSkipDueToDb(sessionFetchError);
      if (skip) {
        return skip;
      }
      throw new Error(sessionFetchError.message);
    }

    if (!existingSession) {
      // Crear nueva sesión
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const insertSessionAttempt = await safeSupabase(() =>
        supabase
          .from('sessions')
          .insert({
            id: randomUUID(),
            token: payload.sessionId,
            userId: payload.userId || null,
            expiresAt,
            ipAddress,
            userAgent,
            deviceType,
            browser,
            os,
            country: 'unknown',
            city: 'unknown',
          })
          .select('id,createdAt,pageViews')
          .maybeSingle()
      );
      if (insertSessionAttempt.skip) {
        return insertSessionAttempt.skip;
      }
      const { data: newSession, error: insertSessionError } = insertSessionAttempt.result!;

      if (insertSessionError) {
        const skip = maybeSkipDueToDb(insertSessionError);
        if (skip) {
          return skip;
        }
        throw new Error(insertSessionError.message);
      }

      sessionId = newSession?.id ?? null;
      sessionCreatedAt = newSession?.createdAt ?? new Date().toISOString();
      sessionPageViews = newSession?.pageViews ?? 0;
    } else {
      sessionId = existingSession.id;
      sessionCreatedAt = existingSession.createdAt;
      sessionPageViews = existingSession.pageViews ?? 0;

      // Actualizar sesión existente
      const sessionDuration = sessionCreatedAt
        ? Math.floor((Date.now() - new Date(sessionCreatedAt).getTime()) / 1000)
        : 0;

      const updateSessionAttempt = await safeSupabase(() =>
        supabase
          .from('sessions')
          .update({
            lastActivityAt: new Date().toISOString(),
            pageViews: sessionPageViews + 1,
            sessionDuration,
          })
          .eq('id', sessionId)
          .select('pageViews')
      );
      if (updateSessionAttempt.skip) {
        return updateSessionAttempt.skip;
      }
      const { error: updateSessionError, data: updatedSession } = updateSessionAttempt.result!;

      if (updateSessionError) {
        const skip = maybeSkipDueToDb(updateSessionError);
        if (skip) {
          return skip;
        }
        throw new Error(updateSessionError.message);
      }

      if (updatedSession && updatedSession.length > 0) {
        sessionPageViews = updatedSession[0].pageViews ?? sessionPageViews + 1;
      } else {
        sessionPageViews += 1;
      }
    }

    if (!sessionId) {
      throw new Error('No se pudo determinar la sesión para registrar la analítica');
    }

    // Guardar analítica de página
    const insertAnalyticsAttempt = await safeSupabase(() =>
      supabase.from('page_analytics').insert({
        id: randomUUID(),
        userId: payload.userId || null,
        sessionId,
        pagePath: payload.pagePath,
        pageTitle: payload.pageTitle,
        pageCategory: payload.pageCategory,
        timeOnPage: payload.timeOnPage,
        scrollDepth: payload.scrollDepth,
        bounce: payload.bounce,
        exitPage: payload.exitPage,
        ipAddress,
        userAgent,
        referrerUrl: payload.referrerUrl,
        conversionEvent: payload.conversionEvent,
        conversionValue: payload.conversionValue ?? null,
      })
    );
    if (insertAnalyticsAttempt.skip) {
      return insertAnalyticsAttempt.skip;
    }
    const { error: analyticsError } = insertAnalyticsAttempt.result!;

    if (analyticsError) {
      const skip = maybeSkipDueToDb(analyticsError);
      if (skip) {
        return skip;
      }
      throw new Error(analyticsError.message);
    }

    // Si es un evento de conversión, guardarlo también en conversion_events
    if (payload.conversionEvent) {
      const conversionEvent = payload.conversionEvent;
      const eventData = {
        pagePath: payload.pagePath,
        pageTitle: payload.pageTitle,
        utmSource: payload.utmSource,
        utmMedium: payload.utmMedium,
        utmCampaign: payload.utmCampaign,
        utmTerm: payload.utmTerm,
        utmContent: payload.utmContent,
      };

      const insertConversionAttempt = await safeSupabase(() =>
        supabase.from('conversion_events').insert({
          id: randomUUID(),
          userId: payload.userId || null,
          sessionId,
          eventType: conversionEvent,
          eventCategory: getEventCategory(conversionEvent),
          eventValue: payload.conversionValue ?? null,
          eventData,
          ipAddress,
          userAgent,
          pagePath: payload.pagePath,
        })
      );
      if (insertConversionAttempt.skip) {
        return insertConversionAttempt.skip;
      }
      const { error: conversionError } = insertConversionAttempt.result!;

      if (conversionError) {
        const skip = maybeSkipDueToDb(conversionError);
        if (skip) {
          return skip;
        }
        throw new Error(conversionError.message);
      }
    }

    // Actualizar métricas del usuario si está autenticado
    if (payload.userId) {
      await updateUserMetrics(payload.userId, payload);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    // En caso de error, retornar éxito para no bloquear la aplicación
    return NextResponse.json({
      success: true,
      message: 'Analytics tracking failed but application continues',
    });
  }
}

function getDeviceType(userAgent: string): string {
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    if (/iPad/.test(userAgent)) return 'tablet';
    return 'mobile';
  }
  return 'desktop';
}

function getBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Other';
}

function getOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Other';
}

function getEventCategory(eventType: string): string {
  const conversionEvents = ['signup', 'login', 'purchase', 'newsletter_signup'];
  const engagementEvents = ['page_view', 'scroll', 'click', 'download'];
  const retentionEvents = ['return_visit', 'repeat_purchase'];

  if (conversionEvents.includes(eventType)) return 'conversion';
  if (engagementEvents.includes(eventType)) return 'engagement';
  if (retentionEvents.includes(eventType)) return 'retention';

  return 'other';
}

async function updateUserMetrics(userId: string, payload: AnalyticsPayload) {
  try {
    const userAttempt = await safeSupabaseForMetrics(() =>
      supabase
        .from('users')
        .select('id,lastLoginAt,totalPageViews,lifetimeValue')
        .eq('id', userId)
        .maybeSingle()
    );
    if (!userAttempt) {
      return;
    }

    const { data: user, error } = userAttempt;

    if (error) {
      if (isDatabaseConnectionIssue(error)) {
        console.warn(
          'Database connection issue while fetching user metrics:',
          normalizeError(error)
        );
        return;
      }
      throw new Error(error.message);
    }

    if (!user) return;

    // Actualizar métricas básicas
    const newTotalPageViews = (user.totalPageViews ?? 0) + 1;

    const metricsAttempt = await safeSupabaseForMetrics(() =>
      supabase
        .from('users')
        .update({
          lastActivityAt: new Date().toISOString(),
          totalPageViews: newTotalPageViews,
          userSegment: calculateUserSegment(user.lastLoginAt),
        })
        .eq('id', userId)
    );
    if (metricsAttempt && metricsAttempt.error) {
      if (isDatabaseConnectionIssue(metricsAttempt.error)) {
        console.warn(
          'Database connection issue while updating user metrics:',
          normalizeError(metricsAttempt.error)
        );
        return;
      }
      throw new Error(metricsAttempt.error.message);
    }

    // Si es un evento de conversión importante, actualizar lifetime value
    if (payload.conversionEvent === 'purchase' && typeof payload.conversionValue === 'number') {
      const conversionValue = payload.conversionValue;
      const currentLtv = Number(user.lifetimeValue ?? 0);
      const ltvAttempt = await safeSupabaseForMetrics(() =>
        supabase
          .from('users')
          .update({
            lifetimeValue: currentLtv + conversionValue,
          })
          .eq('id', userId)
      );

      if (ltvAttempt && ltvAttempt.error) {
        if (isDatabaseConnectionIssue(ltvAttempt.error)) {
          console.warn(
            'Database connection issue while updating lifetime value:',
            normalizeError(ltvAttempt.error)
          );
          return;
        }
        throw new Error(ltvAttempt.error.message);
      }
    }
  } catch (error) {
    console.error('Error updating user metrics:', error);
  }
}

function calculateUserSegment(lastLoginAt: string | null): string {
  const now = new Date();
  const lastLogin = lastLoginAt ? new Date(lastLoginAt) : null;
  const daysSinceLastLogin = lastLogin
    ? Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Lógica de segmentación
  if (daysSinceLastLogin === null || daysSinceLastLogin <= 7) {
    return 'active';
  } else if (daysSinceLastLogin <= 30) {
    return 'engaged';
  } else if (daysSinceLastLogin <= 90) {
    return 'at_risk';
  } else {
    return 'churned';
  }
}

async function safeSupabase<T>(
  operation: () => PromiseLike<T>
): Promise<{ result?: T; skip?: NextResponse }> {
  try {
    const result = await operation();
    return { result };
  } catch (error) {
    const skip = maybeSkipDueToDb(error);
    if (skip) {
      return { skip };
    }
    throw error;
  }
}

async function safeSupabaseForMetrics<T>(operation: () => PromiseLike<T>): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (isDatabaseConnectionIssue(error)) {
      console.warn('Database connection issue while updating user metrics:', normalizeError(error));
      return null;
    }
    throw error;
  }
}

function maybeSkipDueToDb(error: unknown): NextResponse | null {
  if (!error) {
    return null;
  }

  if (isDatabaseConnectionIssue(error)) {
    return databaseUnavailableResponse(error);
  }

  return null;
}

function databaseUnavailableResponse(reason: unknown): NextResponse {
  console.warn('Database connection failed, analytics will be skipped:', normalizeError(reason));
  return NextResponse.json({
    success: true,
    message: 'Analytics skipped due to database connection issue',
  });
}

function isDatabaseConnectionIssue(error: unknown): boolean {
  if (!error) return false;

  const message =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';

  if (!message) {
    return false;
  }

  return /fetch failed|failed to fetch|ECONNREFUSED|network|timeout|ENOTFOUND|EAI_AGAIN/i.test(
    message
  );
}

function normalizeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    return error;
  }

  return { message: String(error) };
}
export const dynamic = 'force-dynamic';
