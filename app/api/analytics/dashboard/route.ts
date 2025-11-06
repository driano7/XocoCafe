import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorización requerido' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    if (!decoded.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Obtener métricas básicas
    const [totalUsers, totalSessions, totalPageViews] = await Promise.all([
      getCount('users'),
      getCount('sessions'),
      getCount('page_analytics'),
    ]);

    const [
      { data: sessionDurations, error: sessionsError },
      { data: pageAnalytics, error: pageError },
    ] = await Promise.all([
      supabase.from('sessions').select('sessionDuration'),
      supabase.from('page_analytics').select('pagePath,bounce'),
    ]);

    if (sessionsError) throw new Error(sessionsError.message);
    if (pageError) throw new Error(pageError.message);

    const avgSessionDuration =
      sessionDurations && sessionDurations.length > 0
        ? sessionDurations.reduce((sum, item) => sum + (item.sessionDuration ?? 0), 0) /
          sessionDurations.length
        : 0;

    const bounceRate =
      pageAnalytics && pageAnalytics.length > 0
        ? pageAnalytics.reduce((sum, item) => sum + (item.bounce ? 1 : 0), 0) / pageAnalytics.length
        : 0;

    const pageCounts = new Map<string, number>();
    pageAnalytics?.forEach((item) => {
      const path = item.pagePath || 'unknown';
      pageCounts.set(path, (pageCounts.get(path) || 0) + 1);
    });

    const topPages = Array.from(pageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pagePath, count]) => ({ pagePath, count }));

    const { data: segmentsData, error: segmentsError } = await supabase
      .from('users')
      .select('userSegment')
      .not('userSegment', 'is', null);
    if (segmentsError) throw new Error(segmentsError.message);

    const segmentCounts = new Map<string, number>();
    segmentsData?.forEach((item) => {
      const segment = item.userSegment || 'unknown';
      segmentCounts.set(segment, (segmentCounts.get(segment) || 0) + 1);
    });

    const userSegments = Array.from(segmentCounts.entries()).map(([segment, count]) => ({
      segment,
      count,
    }));

    const { data: conversionEventsData, error: conversionsError } = await supabase
      .from('conversion_events')
      .select('eventType');
    if (conversionsError) throw new Error(conversionsError.message);

    const conversionCounts = new Map<string, number>();
    conversionEventsData?.forEach((item) => {
      const eventType = item.eventType || 'unknown';
      conversionCounts.set(eventType, (conversionCounts.get(eventType) || 0) + 1);
    });

    const conversionEvents = Array.from(conversionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([eventType, count]) => ({
        eventType,
        count,
      }));

    const { data: recentActivityData, error: recentActivityError } = await supabase
      .from('conversion_events')
      .select('id,eventType,createdAt,pagePath')
      .order('createdAt', { ascending: false })
      .limit(10);
    if (recentActivityError) throw new Error(recentActivityError.message);

    // Formatear datos para el dashboard
    const analyticsData = {
      totalUsers,
      totalSessions,
      totalPageViews,
      avgSessionDuration: Math.round(avgSessionDuration || 0),
      bounceRate: Math.round((bounceRate || 0) * 100),
      topPages: topPages.map((page) => ({
        pagePath: page.pagePath,
        views: page.count,
      })),
      userSegments: userSegments.map((segment) => ({
        segment: segment.segment || 'unknown',
        count: segment.count,
      })),
      conversionEvents,
      recentActivity:
        recentActivityData?.map((activity) => ({
          id: activity.id,
          type: activity.eventType,
          description: `${(activity.eventType || 'evento').replace('_', ' ')} en ${
            activity.pagePath || 'sin ruta'
          }`,
          timestamp: new Date(activity.createdAt).toISOString(),
        })) ?? [],
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    return NextResponse.json({ error: 'Error al obtener datos de analítica' }, { status: 500 });
  }
}

async function getCount(table: 'users' | 'sessions' | 'page_analytics'): Promise<number> {
  const { count, error } = await supabase.from(table).select('id', {
    head: true,
    count: 'exact',
  });
  if (error) throw new Error(error.message);
  return count ?? 0;
}
export const dynamic = 'force-dynamic';
