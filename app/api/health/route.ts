import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Probar conexión a la base de datos realizando una consulta ligera
    const { error } = await supabase.from('users').select('id', { head: true, count: 'exact' });
    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
