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

import { WorkProps } from './WorkRight';

export function WorkLeft({ children, progress }: WorkProps) {
  let translateY = Math.max(0, 50 - progress * 3 * 50);

  if (progress > 0.85) {
    translateY = Math.max(-50, -(progress - 0.85) * 2 * 50);
  }

  return (
    <div
      className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4 px-6 text-center text-2xl text-white sm:text-3xl md:items-start md:px-10 md:text-left lg:min-h-[30vh]"
      style={{ transform: `translateY(${translateY}px)` }}
    >
      <div className="space-y-3 leading-tight text-white/90">{children}</div>
    </div>
  );
}
