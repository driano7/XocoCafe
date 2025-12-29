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

import { useContext, useEffect, useRef } from 'react';
import { ScrollContext } from '@/components/Providers/ScrollProvider';

const WORDS = [
  { text: 'Minimalista.', offset: 0 },
  { text: 'Intencional.', offset: 0.45 },
  { text: 'Vanguardista.', offset: 0.9 },
  { text: 'Sensorial.', offset: 1.35 },
];

function blockAnimation(sectionProgress: number, blockNumber: number) {
  const offset = WORDS[blockNumber]?.offset ?? blockNumber * 0.5;
  const relativeProgress = sectionProgress - offset - 0.2;
  const clamped = Math.max(0, Math.min(1, relativeProgress));
  const opacity = Math.max(0.15, clamped);
  const blur = (1 - clamped) * 10;
  const translateY = (1 - clamped) * 18;
  return {
    opacity,
    filter: `blur(${blur}px)`,
    transform: `translateY(${translateY}px)`,
    transition: 'opacity 0.6s ease-out, filter 0.6s ease-out, transform 0.6s ease-out',
  };
}

export default function Intro() {
  const { scrollY } = useContext(ScrollContext);
  const refContainer = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const attemptPlay = async () => {
      try {
        await video.play();
      } catch (error) {
        console.warn('No pudimos auto reproducir el video del home:', error);
      }
    };
    attemptPlay();
  }, []);

  return (
    <div
      ref={refContainer}
      className="relative z-10 bg-black text-white dark:bg-white  dark:text-black"
      id="intro"
    >
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-3xl font-semibold tracking-tight sm:px-8 sm:py-20 sm:text-4xl md:py-24 md:text-5xl lg:px-20 lg:py-28 lg:text-6xl">
        <div className="w-full space-y-4 text-center leading-tight sm:text-left sm:leading-[1.15]">
          {WORDS.map(({ text }, index) => (
            <span
              key={text}
              className="introText inline-flex items-baseline gap-3 pr-3 text-balance"
              style={blockAnimation(progress, index)}
            >
              <span className="whitespace-nowrap">{text}</span>
            </span>
          ))}
        </div>

        <div className="mt-12 w-full">
          <div className="rounded-[32px] border border-white/15 bg-white/5 p-2 shadow-2xl backdrop-blur-2xl dark:border-black/20 dark:bg-black/20">
            <div className="relative overflow-hidden rounded-[28px] bg-black/70">
              <video
                ref={videoRef}
                className="aspect-[4/5] w-full object-cover sm:aspect-video"
                autoPlay
                muted
                loop
                playsInline
              >
                <source src="/static/images/video.mp4" type="video/mp4" />
                Tu navegador no soporta video HTML5.
              </video>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
