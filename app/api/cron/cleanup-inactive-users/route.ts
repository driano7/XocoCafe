import { NextRequest, NextResponse } from 'next/server';
import { cleanupInactiveUsers } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(request: NextRequest) {
  if (!CRON_SECRET) {
    return true;
  }
  const headerSecret = request.headers.get('x-cron-secret');
  const bearer = request.headers.get('authorization');
  if (headerSecret && headerSecret === CRON_SECRET) {
    return true;
  }
  if (bearer && bearer === `Bearer ${CRON_SECRET}`) {
    return true;
  }
  return false;
}

function parsePositiveNumber(source: string | null | undefined): number | undefined {
  if (!source) return undefined;
  const parsed = Number(source);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

async function handleRequest(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const days = parsePositiveNumber(url.searchParams.get('days'));
    const limit = parsePositiveNumber(url.searchParams.get('limit'));

    const result = await cleanupInactiveUsers({
      inactivityDays: days,
      batchSize: limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error ejecutando limpieza automática de usuarios:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'No pudimos completar la limpieza de usuarios inactivos',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
