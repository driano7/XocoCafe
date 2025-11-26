import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getMenuItemById, isValidMenuItem } from '@/lib/menuData';

type FavoritePayload = {
  favoriteBeverageId?: unknown;
  favoriteFoodId?: unknown;
};

function normalizeFavorite(value: unknown): string | null | undefined {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapCategoryToLabel(category: 'beverage' | 'food' | 'package'): string {
  if (category === 'package') return 'paquetes';
  return category === 'beverage' ? 'bebidas' : 'alimentos';
}

function resolveProductPayload(menuItemId: string) {
  const menuItem = getMenuItemById(menuItemId);
  if (!menuItem) {
    throw new Error(`No existe un producto en el menú con id ${menuItemId}`);
  }

  const categoryLabel = mapCategoryToLabel(menuItem.category);

  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    productId: menuItem.id,
    name: menuItem.label,
    category: categoryLabel,
    subcategory: menuItem.subcategory ?? null,
    price: menuItem.price ?? 0,
    cost: menuItem.price ?? null,
    totalSales: 0,
    totalRevenue: 0,
    avgRating: 0,
    reviewCount: 0,
    stockQuantity: 0,
    lowStockThreshold: 10,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };
}

async function ensureProductExists(menuItemId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('productId', menuItemId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error consultando productos: ${error.message}`);
  }

  const payload = resolveProductPayload(menuItemId);

  if (!data) {
    const { error: insertError } = await supabase.from('products').insert(payload);
    if (insertError) {
      throw new Error(`No se pudo registrar el producto favorito: ${insertError.message}`);
    }
    return;
  }

  const { error: updateError } = await supabase
    .from('products')
    .update({
      name: payload.name,
      category: payload.category,
      subcategory: payload.subcategory,
      price: payload.price,
      updatedAt: payload.updatedAt,
      isActive: true,
    })
    .eq('id', data.id);

  if (updateError) {
    throw new Error(`No se pudo actualizar el producto favorito: ${updateError.message}`);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token no proporcionado' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body: FavoritePayload = await request.json();
    const favoriteBeverageId = normalizeFavorite(body.favoriteBeverageId);
    const favoriteFoodId = normalizeFavorite(body.favoriteFoodId);

    if (favoriteBeverageId === undefined || favoriteFoodId === undefined) {
      return NextResponse.json(
        { success: false, message: 'Datos de favoritos inválidos' },
        { status: 400 }
      );
    }

    if (favoriteBeverageId && !isValidMenuItem(favoriteBeverageId, 'beverage')) {
      return NextResponse.json(
        { success: false, message: 'La bebida seleccionada no es válida.' },
        { status: 400 }
      );
    }

    if (favoriteFoodId && !isValidMenuItem(favoriteFoodId, 'food')) {
      return NextResponse.json(
        { success: false, message: 'El alimento seleccionado no es válido.' },
        { status: 400 }
      );
    }

    const operations: Promise<unknown>[] = [];

    if (favoriteBeverageId) {
      operations.push(ensureProductExists(favoriteBeverageId));
    }
    if (favoriteFoodId) {
      operations.push(ensureProductExists(favoriteFoodId));
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        favoriteColdDrink: favoriteBeverageId,
        favoriteHotDrink: null,
        favoriteFood: favoriteFoodId,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', decoded.userId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const updatedUser = await getUserById(decoded.userId);
    if (!updatedUser) {
      throw new Error('No se pudo recuperar el perfil actualizado');
    }

    return NextResponse.json({
      success: true,
      message: 'Favoritos actualizados exitosamente',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error actualizando favoritos:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
