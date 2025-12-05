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
import { useState } from 'react';
import useBreakpoint from 'use-breakpoint';
import ProjectItem from './ProjectItem';
import ProjectPreview from './ProjectPreview';
import { projects } from './constants';
import { ProjectModal } from './types';

const BREAKPOINTS = { mobile: 0, tablet: 768, desktop: 1280 };

export default function Projects() {
  const { breakpoint } = useBreakpoint(BREAKPOINTS);
  const [modal, setModal] = useState<ProjectModal>({ active: false, index: 0 });

  return (
    <>
      {projects.map((project, index) => (
        <motion.div
          key={project.title}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: index / 10 }}
        >
          <ProjectItem
            index={index}
            title={project.title}
            url={project.url}
            role={project.role}
            setModal={setModal}
          />
        </motion.div>
      ))}
      {breakpoint === 'desktop' && <ProjectPreview modal={modal} projects={projects} />}
    </>
  );
}
