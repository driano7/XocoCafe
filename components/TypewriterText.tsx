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

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type BaseSegment = {
  text: string;
  kind?: 'text';
};

type LinkSegment = {
  text: string;
  kind: 'link';
  href: string;
  className?: string;
};

type LineBreakSegment = {
  text: string;
  kind: 'lineBreak';
};

type Segment = BaseSegment | LinkSegment | LineBreakSegment;

type TypewriterTextProps = {
  segments: Segment[];
  className?: string;
  speed?: number;
  startDelay?: number;
  showCursor?: boolean;
};

export default function TypewriterText({
  segments,
  className,
  speed = 35,
  startDelay = 0,
  showCursor = true,
}: TypewriterTextProps) {
  const [visibleChars, setVisibleChars] = useState(0);

  const totalChars = useMemo(
    () => segments.reduce((acc, segment) => acc + segment.text.length, 0),
    [segments]
  );

  useEffect(() => {
    if (totalChars === 0) {
      return;
    }

    let timeoutId: NodeJS.Timeout | undefined;
    let currentChar = 0;

    const typeNextChar = () => {
      currentChar += 1;
      setVisibleChars(Math.min(currentChar, totalChars));

      if (currentChar < totalChars) {
        timeoutId = setTimeout(typeNextChar, speed);
      }
    };

    const delayId: NodeJS.Timeout | undefined = setTimeout(typeNextChar, startDelay);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (delayId) {
        clearTimeout(delayId);
      }
    };
  }, [speed, startDelay, totalChars]);

  let remainingChars = visibleChars;

  const renderedSegments = segments.map((segment, index) => {
    const available = Math.min(segment.text.length, Math.max(remainingChars, 0));
    const content = segment.text.slice(0, available);
    remainingChars -= segment.text.length;

    if (!content) {
      return <span key={`typewriter-empty-${index}`} />;
    }

    if (segment.kind === 'lineBreak') {
      return <span key={`typewriter-segment-${index}`}>{content ? <br /> : null}</span>;
    }

    if (segment.kind === 'link') {
      return (
        <Link key={`typewriter-segment-${index}`} href={segment.href} className={segment.className}>
          {content}
        </Link>
      );
    }

    return <span key={`typewriter-segment-${index}`}>{content}</span>;
  });

  const ariaLabel = useMemo(() => segments.map((segment) => segment.text).join(''), [segments]);

  return (
    <span className={className} aria-label={ariaLabel}>
      {renderedSegments}
      {showCursor && (
        <span
          className={`ml-1 inline-block align-middle typewriter-caret ${
            visibleChars >= totalChars ? 'typewriter-caret-complete' : ''
          }`}
        >
          |
        </span>
      )}
    </span>
  );
}
