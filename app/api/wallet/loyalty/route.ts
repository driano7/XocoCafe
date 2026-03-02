import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabase } from '@/lib/supabase';
import {
  createLoyaltyClass,
  getAddToWalletUrl,
  upsertLoyaltyObject,
} from '@/lib/google-wallet/wallet';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, firstName, lastName')
      .eq('email', token.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { data: loyalty } = await supabase
      .from('loyalty_points')
      .select('coffees, goal, qr_url')
      .eq('user_id', user.id)
      .maybeSingle();

    const coffees = loyalty?.coffees ?? 0;
    const goal = loyalty?.goal ?? 7;
    const qrValue = loyalty?.qr_url ?? user.id;

    await createLoyaltyClass();

    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      token.name ||
      token.email ||
      'Cliente';

    await upsertLoyaltyObject({
      userId: user.id,
      name: displayName,
      coffees,
      goal,
      qrValue,
    });

    const walletUrl = getAddToWalletUrl(user.id);
    return NextResponse.json({ success: true, walletUrl, coffees, goal });
  } catch (error: unknown) {
    console.error('Wallet error:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
