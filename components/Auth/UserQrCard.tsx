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

'use client';

import { useMemo, useState } from 'react';
import { useAuth } from './AuthProvider';

export default function UserQrCard() {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);

  const qrUrl = useMemo(() => {
    if (!user?.clientId) return null;

    const favoriteBeverage =
      user.favoriteColdDrink ?? user.favoriteHotDrink ?? user.favoriteFood ?? 'No registrado';
    const favoriteFood = user.favoriteFood ?? 'No registrado';

    const qrPayload = {
      'Id cliente': user.clientId,
      'Nombre del cliente': user.firstName ?? 'No registrado',
      Apellido: user.lastName ?? 'No registrado',
      'Bebida favorita': favoriteBeverage,
      'Alimento favorito': favoriteFood,
      Número: user.phone ?? 'No registrado',
      Mail: user.email ?? 'Sin correo',
    };

    const encoded = encodeURIComponent(JSON.stringify(qrPayload, null, 2));
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`;
  }, [
    user?.clientId,
    user?.email,
    user?.firstName,
    user?.lastName,
    user?.phone,
    user?.favoriteColdDrink,
    user?.favoriteHotDrink,
    user?.favoriteFood,
  ]);

  if (!user?.clientId || !qrUrl) {
    return null;
  }

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xoco-qr-${user.clientId}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando QR:', error);
      alert('No se pudo descargar tu QR. Inténtalo nuevamente.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl bg-white p-6 text-center shadow dark:bg-gray-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mi QR de Cliente</h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Escanea este código para identificar tu cuenta rápidamente en sucursal.
      </p>
      <div className="mt-4 flex justify-center">
        <img
          src={qrUrl}
          alt={`QR del cliente ${user.clientId}`}
          className="h-48 w-48 rounded-lg border border-gray-200 bg-white object-contain p-2 dark:border-gray-700"
        />
      </div>
      <p className="mt-4 text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
        ID · {user.clientId}
      </p>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading || !qrUrl}
        className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isDownloading ? 'Generando…' : 'Descargar QR (JPG)'}
      </button>
    </div>
  );
}
