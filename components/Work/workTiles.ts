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

export type WorkTile = {
  title: string;
  description: string;
  image: {
    src: string;
    width: number;
    height: number;
  };
};

export const workTiles: WorkTile[] = [
  {
    description: `Intencional`,
    title: `Nada en Xoco es casual. Desde su menú compacto hasta la disposición del local`,
    image: {
      src: '/static/images/imgsCafe/cripto.jpg',
      width: 600,
      height: 770,
    },
  },
  {
    description: 'todo responde a una intención clara:',
    title: 'facilitar una experiencia rápida, funcional y estética para el usuario.',
    image: {
      src: '/static/images/imgsCafe/idiomas.png',
      width: 600,
      height: 554,
    },
  },
  {
    description: `Vanguardista`,
    title: 'Xoco rompe con el molde tradicional de las cafeterías.',
    image: {
      src: '/static/images/imgsCafe/portavoz.jpeg',
      width: 600,
      height: 717,
    },
  },
  {
    description: `Su propuesta minimalista y centrada en el “grab & go”`,
    title:
      'nos posiciona a la vanguardia de los nuevos hábitos de consumo, conectando con generaciones digitales y prácticas.',
    image: {
      src: '/static/images/imgsCafe/arte.jpeg',
      width: 600,
      height: 717,
    },
  },
];
