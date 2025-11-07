import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('addresses')
      .select(
        'id,label,type,street,city,state,postalCode,country,reference,additionalInfo,isDefault'
      )
      .eq('userId', decoded.userId)
      .order('isDefault', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error obteniendo direcciones:', error);
    return NextResponse.json(
      { success: false, message: 'No pudimos cargar tus direcciones guardadas' },
      { status: 500 }
    );
  }
}
