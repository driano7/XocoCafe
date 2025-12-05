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

import slugger from 'github-slugger';
import { Heading } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { remark } from 'remark';
import { Toc } from 'types/Toc';
import { Parent } from 'unist';
import { visit } from 'unist-util-visit';
import { VFile } from 'vfile';

export function remarkTocHeadings() {
  return (tree: Parent, file: VFile) => {
    const toc: Toc = [];
    visit(tree, 'heading', (node: Heading) => {
      const textContent = toString(node);
      toc.push({
        value: textContent,
        url: '#' + slugger.slug(textContent),
        depth: node.depth,
      });
    });
    file.data.toc = toc;
  };
}

export async function extractTocHeadings(markdown: string) {
  const vfile = await remark().use(remarkTocHeadings).process(markdown);
  return vfile.data.toc;
}
