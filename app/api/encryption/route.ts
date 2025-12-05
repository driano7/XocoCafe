/*
 * --------------------------------------------------------------------
 *  Xoco Café — Software Property
 *  Copyright (c) 2025 Xoco Café
 *  Principal Developer: Donovan Riaño
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at:
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  --------------------------------------------------------------------
 *  PROPIEDAD DEL SOFTWARE — XOCO CAFÉ.
 *  Copyright (c) 2025 Xoco Café.
 *  Desarrollador Principal: Donovan Riaño.
 *
 *  Este archivo está licenciado bajo la Apache License 2.0.
 *  Consulta el archivo LICENSE en la raíz del proyecto para más detalles.
 * --------------------------------------------------------------------
 */

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
