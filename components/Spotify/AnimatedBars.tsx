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

import { motion } from 'framer-motion';

export default function AnimatedBars() {
  return (
    <div className="flex w-auto items-end overflow-hidden">
      <motion.span
        className="mr-[3px] h-2 w-1 bg-gray-300 opacity-75 dark:bg-gray-500"
        animate={{
          transform: [
            'scaleY(1.0) translateY(0rem)',
            'scaleY(1.5) translateY(-0.082rem)',
            'scaleY(1.0) translateY(0rem)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.span
        animate={{
          transform: [
            'scaleY(1.0) translateY(0rem)',
            'scaleY(3) translateY(-0.083rem)',
            'scaleY(1.0) translateY(0rem)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="mr-[3px] h-1 w-1 bg-gray-300 dark:bg-gray-500"
      />
      <motion.span
        animate={{
          transform: [
            'scaleY(1.0)  translateY(0rem)',
            'scaleY(0.5) translateY(0.37rem)',
            'scaleY(1.0)  translateY(0rem)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="h-3 w-1 bg-gray-300 opacity-80 dark:bg-gray-500"
      />
    </div>
  );
}
