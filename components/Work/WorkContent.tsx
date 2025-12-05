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

import Image from 'next/image';
import { WorkContainer } from './WorkContainer';
import { WorkLeft } from './WorkLeft';
import { WorkRight } from './WorkRight';
import { WorkTile } from './workTiles';

interface WorkContentProps {
  work: WorkTile;
  progress?: number;
}

export default function WorkContent({ work, progress = 0 }: WorkContentProps) {
  const { title, description, image } = work;

  return (
    <WorkContainer>
      <WorkLeft progress={progress}>
        <div className="text-xl font-medium leading-snug sm:text-2xl md:text-3xl xl:text-4xl">
          {description}
        </div>
        <span className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl xl:text-6xl">
          {title}
        </span>
      </WorkLeft>
      <WorkRight progress={progress}>
        <div className="drop-shadow-2xl sm:mt-10 md:mt-24">
          <Image
            src={image.src}
            alt={title}
            width={image.width}
            height={image.height}
            className="h-auto w-full rounded-3xl object-cover"
            sizes="(max-width: 768px) 90vw, (max-width: 1024px) 60vw, 480px"
          />
        </div>
      </WorkRight>
    </WorkContainer>
  );
}
