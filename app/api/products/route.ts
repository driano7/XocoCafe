import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id,"productId",name,category,subcategory,price,"isActive"')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error obteniendo productos:', error);
    return NextResponse.json(
      { success: false, message: 'No pudimos cargar los productos' },
      { status: 500 }
    );
  }
}
