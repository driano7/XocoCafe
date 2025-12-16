import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { describeFavorite } from '@/lib/menuFavorites';

const MAX_STAMPS = 7;

type RouteContext = {
  params: {
    clientId: string;
  };
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: RouteContext) {
  const clientId = params.clientId?.trim();

  if (!clientId) {
    return NextResponse.json(
      { success: false, message: 'Debes proporcionar un clientId' },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select(
        'id,clientId,favoriteColdDrink,favoriteHotDrink,favoriteFood,weeklyCoffeeCount,firstNameEncrypted,lastNameEncrypted'
      )
      .eq('clientId', clientId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json(
        { success: false, message: `No encontramos al cliente ${clientId}` },
        { status: 404 }
      );
    }

    const coldFavorite = describeFavorite(data.favoriteColdDrink);
    const hotFavorite = describeFavorite(data.favoriteHotDrink);
    const foodFavorite = describeFavorite(data.favoriteFood);
    const primaryBeverage =
      coldFavorite.label || coldFavorite.value
        ? coldFavorite
        : hotFavorite.label || hotFavorite.value
        ? hotFavorite
        : describeFavorite(data.favoriteColdDrink ?? data.favoriteHotDrink);
    const weeklyCoffeeCount = Math.max(0, data.weeklyCoffeeCount ?? 0);

    return NextResponse.json({
      success: true,
      data: {
        clientId: data.clientId,
        favorites: {
          beverageCold: coldFavorite,
          beverageHot: hotFavorite,
          primaryBeverage,
          food: foodFavorite,
        },
        loyalty: {
          weeklyCoffeeCount,
          remainingForReward: Math.max(0, MAX_STAMPS - weeklyCoffeeCount),
          stampsGoal: MAX_STAMPS,
        },
      },
    });
  } catch (error) {
    console.error('Error consultando favoritos por clientId:', error);
    return NextResponse.json(
      { success: false, message: 'No pudimos recuperar la información de favoritos' },
      { status: 500 }
    );
  }
}
