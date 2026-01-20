/*
 * --------------------------------------------------------------------
 *  Xoco Café — Software Property
 *  Copyright (c) 2025 Xoco Café
 *  Principal Developer: Donovan Riaño
 * --------------------------------------------------------------------
 */

'use client';

import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { FaInstagram, FaSpotify, FaTiktok, FaTwitter, FaWhatsapp } from 'react-icons/fa';

const SOCIAL_ICON_CLASSES =
  'group relative flex h-10 w-10 items-center justify-center rounded-full text-base text-current transition-all duration-300 ease-out hover:-translate-y-1 hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:hover:text-primary-200 sm:h-10 sm:w-10 sm:text-lg';

const SOCIAL_ICON_GLOW =
  'pointer-events-none absolute inset-0 rounded-full bg-primary-500/15 opacity-0 transition-opacity duration-300 group-hover:opacity-100';

type IconKey = 'tiktok' | 'instagram' | 'twitter' | 'spotify' | 'whatsapp';

const ICON_MAP: Record<IconKey, React.ComponentType> = {
  tiktok: FaTiktok,
  instagram: FaInstagram,
  twitter: FaTwitter,
  spotify: FaSpotify,
  whatsapp: FaWhatsapp,
};

type Props = {
  links: Array<{ label: string; href: string; icon: IconKey }>;
};

export default function FooterSocials({ links }: Props) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const target = listRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <ul ref={listRef} className="flex cursor-pointer items-center space-x-3 sm:space-x-5">
      {links.map(({ label, href, icon }, index) => {
        const IconComponent = ICON_MAP[icon];
        if (!IconComponent) return null;
        const visibleClass =
          hasBeenVisible && isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0';
        return (
          <li
            key={label}
            className={classNames('transform transition-all duration-500', visibleClass)}
            style={{ transitionDelay: `${index * 120}ms` }}
          >
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className={SOCIAL_ICON_CLASSES}
            >
              <span className={SOCIAL_ICON_GLOW} />
              <IconComponent />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
