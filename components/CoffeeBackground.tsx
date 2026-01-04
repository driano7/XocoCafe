'use client';

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

import classNames from 'classnames';
import { useEffect, type ReactNode } from 'react';

interface CoffeeBackgroundProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

const BODY_GRADIENT_CLASS = 'coffee-page-bg--body';

export default function CoffeeBackground({
  children,
  className,
  contentClassName,
}: CoffeeBackgroundProps) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const target = document.body;
    if (!target) {
      return undefined;
    }
    target.classList.add(BODY_GRADIENT_CLASS);
    return () => {
      target.classList.remove(BODY_GRADIENT_CLASS);
    };
  }, []);

  return (
    <div className={classNames('coffee-page-bg', className)}>
      <div className={classNames('coffee-page-bg__content', contentClassName)}>{children}</div>
    </div>
  );
}
