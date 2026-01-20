'use client';

import classNames from 'classnames';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCalendar,
  FiCoffee,
  FiFileText,
  FiEyeOff,
  FiHome,
  FiMapPin,
  FiMoreHorizontal,
  FiShoppingBag,
} from 'react-icons/fi';
import { FaInstagram, FaTiktok, FaWhatsapp } from 'react-icons/fa';
import { PiTrayBold } from 'react-icons/pi';
import { useAuth } from '@/components/Auth/AuthProvider';
import siteMetadata from 'content/siteMetadata';

type DockLink = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  startsWith?: string;
};

const LOCATION_LINK: DockLink = {
  href: '/blog/ubicacion',
  icon: FiMapPin,
  label: 'Ubicación',
  startsWith: '/blog/ubicacion',
};

const AUTH_LINKS: DockLink[] = [
  { href: '/', icon: FiHome, label: 'Inicio' },
  {
    href: '/dashboard/pedidos',
    icon: FiShoppingBag,
    label: 'Pedidos',
    startsWith: '/dashboard/pedidos',
  },
  { href: '/reserve', icon: FiCalendar, label: 'Reservas', startsWith: '/reserve' },
  { href: '/uses', icon: PiTrayBold, label: 'Menú', startsWith: '/uses' },
];

const PUBLIC_LINKS: DockLink[] = [
  { href: '/', icon: FiHome, label: 'Inicio' },
  { href: '/uses', icon: PiTrayBold, label: 'Menú', startsWith: '/uses' },
  LOCATION_LINK,
];

const FACTURACION_LINK: DockLink = {
  href: '/blog/facturacion',
  icon: FiFileText,
  label: 'Facturación',
  startsWith: '/blog/facturacion',
};

const BLOG_LINK: DockLink = { href: '/blog', icon: FiCoffee, label: 'Blog', startsWith: '/blog' };

type HiddenLink = DockLink & {
  variant: 'social' | 'internal';
  accentClass?: string;
};

const HIDDEN_DRAWER_LINKS: HiddenLink[] = [
  {
    href: siteMetadata.whats,
    icon: FaWhatsapp,
    label: 'WhatsApp',
    variant: 'social',
  },
  {
    href: siteMetadata.instagram,
    icon: FaInstagram,
    label: 'Instagram',
    variant: 'social',
  },
  {
    href: siteMetadata.tiktok,
    icon: FaTiktok,
    label: 'TikTok',
    variant: 'social',
  },
  { ...FACTURACION_LINK, variant: 'internal' },
  { ...BLOG_LINK, variant: 'internal' },
];

const DOCK_BUTTON_BASE =
  'flex h-11 w-11 items-center justify-center rounded-2xl text-xl transition';
const DOCK_BUTTON_ACTIVE = 'bg-black text-white shadow-lg dark:bg-white dark:text-gray-900';
const DOCK_BUTTON_INACTIVE =
  'bg-white text-gray-900 shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700';

const isActiveRoute = (pathname: string, link: DockLink) => {
  if (link.href === '/') {
    return pathname === '/';
  }
  if (link.startsWith) {
    return pathname.startsWith(link.startsWith);
  }
  return pathname.startsWith(link.href);
};

export default function DockNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showExtras, setShowExtras] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const links = useMemo(() => (user ? AUTH_LINKS : PUBLIC_LINKS), [user]);

  const scheduleCollapse = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
    }
    collapseTimer.current = setTimeout(() => {
      setShowExtras(false);
      setIsCollapsed(true);
    }, 30_000);
  }, []);

  useEffect(() => {
    // Close the extra drawer whenever the route changes
    setShowExtras(false);
    setIsCollapsed(false);
    scheduleCollapse();
    return () => {
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
      }
    };
  }, [pathname, scheduleCollapse]);

  const handleAutoCollapse = useCallback(
    (shouldCollapse: boolean) => {
      if (shouldCollapse) {
        if (collapseTimer.current) {
          clearTimeout(collapseTimer.current);
        }
        setShowExtras(false);
        if (!isCollapsed) {
          setIsCollapsed(true);
        }
      } else if (isCollapsed) {
        setIsCollapsed(false);
        scheduleCollapse();
      }
    },
    [isCollapsed, scheduleCollapse]
  );

  const handleDockInteraction = useCallback(() => {
    setIsCollapsed(false);
    scheduleCollapse();
  }, [scheduleCollapse]);

  const handleLinkClick = useCallback(() => {
    handleDockInteraction();
    setShowExtras(false);
  }, [handleDockInteraction]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const prefersCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (prefersCoarsePointer) {
      return undefined;
    }
    const handleScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 24;
      const nearTop = window.scrollY <= 24;
      if (nearBottom) {
        handleAutoCollapse(true);
      } else if (nearTop) {
        handleAutoCollapse(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleAutoCollapse]);

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4 sm:hidden">
      {!isCollapsed && showExtras && (
        <div className="absolute bottom-24 right-6 flex flex-col space-y-3 rounded-3xl border border-white/20 bg-white/80 p-4 text-gray-900 shadow-2xl backdrop-blur-lg dark:border-black/10 dark:bg-gray-900/80 dark:text-white">
          <div className="flex flex-col items-center space-y-3">
            {HIDDEN_DRAWER_LINKS.map((link) => {
              const Icon = link.icon;
              const active = link.variant === 'internal' && isActiveRoute(pathname ?? '', link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-label={link.label}
                  onClick={handleLinkClick}
                  className={classNames(
                    DOCK_BUTTON_BASE,
                    'h-12',
                    link.variant === 'social'
                      ? classNames(
                          'w-12 border border-black/5 dark:border-white/15',
                          DOCK_BUTTON_INACTIVE
                        )
                      : classNames(
                          'w-full text-base',
                          active ? DOCK_BUTTON_ACTIVE : DOCK_BUTTON_INACTIVE
                        )
                  )}
                >
                  <Icon />
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            aria-label="Ocultar barra"
            onClick={() => handleAutoCollapse(true)}
            className={classNames('mt-1', DOCK_BUTTON_BASE, DOCK_BUTTON_INACTIVE)}
          >
            <FiEyeOff />
          </button>
        </div>
      )}
      <div className="relative flex w-full items-end justify-center">
        <nav
          className={classNames(
            'flex w-full items-center justify-between rounded-full border border-white/30 bg-white/45 px-4 py-2.5 text-gray-900 shadow-2xl backdrop-blur-lg transition-transform duration-300 ease-in-out dark:border-white/10 dark:bg-gray-900/55 dark:text-white',
            isCollapsed ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
          )}
        >
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActiveRoute(pathname ?? '', link);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                onClick={handleLinkClick}
                className={classNames(
                  DOCK_BUTTON_BASE,
                  active ? DOCK_BUTTON_ACTIVE : DOCK_BUTTON_INACTIVE
                )}
              >
                <Icon />
              </Link>
            );
          })}
          <button
            type="button"
            aria-label="Más opciones"
            className={classNames(
              DOCK_BUTTON_BASE,
              showExtras ? DOCK_BUTTON_ACTIVE : DOCK_BUTTON_INACTIVE
            )}
            onClick={() => {
              handleDockInteraction();
              setShowExtras((prev) => !prev);
            }}
          >
            <FiMoreHorizontal />
          </button>
        </nav>
        <button
          type="button"
          aria-label="Mostrar dock"
          className={classNames(
            'absolute bottom-0 right-4 flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-2xl transition-all duration-300 ease-in-out sm:right-10',
            isCollapsed
              ? 'scale-100 opacity-100 bg-[#5c3025]/90 text-white backdrop-blur-3xl dark:bg-white/90 dark:text-[#5c3025]'
              : 'scale-0 opacity-0'
          )}
          onClick={handleDockInteraction}
        >
          <FiCoffee />
        </button>
      </div>
    </div>
  );
}
