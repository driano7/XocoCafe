import { NextRequest, NextResponse } from 'next/server';
import { encryptUserData, decryptUserData } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const { action, email, data } = await request.json();

    if (!email || !data) {
      return NextResponse.json({ error: 'Email y datos son requeridos' }, { status: 400 });
    }

    switch (action) {
      case 'encrypt': {
        const encryptedData = encryptUserData(email, data);
        return NextResponse.json({
          success: true,
          encryptedData,
        });
      }

      case 'decrypt': {
        const decryptedData = decryptUserData(email, data);
        return NextResponse.json({
          success: true,
          decryptedData,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Acción no válida. Use "encrypt" o "decrypt"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error en API de cifrado:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
