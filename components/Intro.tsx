'use client';

import { useLenis } from '@studio-freight/react-lenis';
import { useRef, useState } from 'react';

function opacityForBlock(sectionProgress: number, blockNumber: number) {
  const progress = sectionProgress - blockNumber;

  if (progress >= 0 && progress < 1) {
    return 1;
  }

  return 0.2;
}

export default function Intro() {
  const [scrollY, setScrollY] = useState(0);

  useLenis(({ scroll }: any) => {
    setScrollY(scroll);
  });

  const refContainer = useRef<HTMLDivElement>(null);
  const numOfPages = 4;
  let progress = 0;
  const { current: elContainer } = refContainer;

  if (elContainer) {
    const { clientHeight, offsetTop } = elContainer;
    const screenH = window.innerHeight;
    const halfH = screenH / 2;

    const percentY =
      Math.min(clientHeight + halfH, Math.max(-screenH, scrollY - offsetTop) + halfH) /
      clientHeight;

    progress = Math.min(numOfPages - 0.5, Math.max(0.5, percentY * numOfPages));
  }

  return (
    <div
      ref={refContainer}
      className="relative z-10 bg-black text-white dark:bg-white  dark:text-black"
      id="intro"
    >
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-3xl font-semibold tracking-tight sm:px-8 sm:py-20 sm:text-4xl md:py-24 md:text-5xl lg:px-20 lg:py-28 lg:text-6xl">
        <div className="text-center leading-tight sm:text-left sm:leading-[1.15]">
          <div className="introText" style={{ opacity: opacityForBlock(progress, 0) }}>
            Minimalista.
          </div>
          <span
            className="introText inline-block after:content-['_']"
            style={{ opacity: opacityForBlock(progress, 1) }}
          >
            Intencional.
          </span>
          <span
            className="introText inline-block after:content-['_']"
            style={{ opacity: opacityForBlock(progress, 2) }}
          >
            Vanguardista.
          </span>
          <span
            className="introText inline-block"
            style={{ opacity: opacityForBlock(progress, 3) }}
          >
            Sensorial.
          </span>
        </div>
      </div>
    </div>
  );
}
