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
import { FaWhatsapp, FaInstagram, FaTiktok } from 'react-icons/fa';
import { PiTrayBold } from 'react-icons/pi';
import { useAuth } from '@/components/Auth/AuthProvider';

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

const EXTRA_LINKS_AUTH: DockLink[] = [
  {
    href: '/blog/facturacion',
    icon: FiFileText,
    label: 'Facturación',
    startsWith: '/blog/facturacion',
  },
  LOCATION_LINK,
  { href: '/blog', icon: FiCoffee, label: 'Blog', startsWith: '/blog' },
];

const EXTRA_LINKS_PUBLIC: DockLink[] = [
  {
    href: '/blog/facturacion',
    icon: FiFileText,
    label: 'Facturación',
    startsWith: '/blog/facturacion',
  },
  { href: '/blog', icon: FiCoffee, label: 'Blog', startsWith: '/blog' },
];

const SOCIAL_LINKS: Array<
  DockLink & {
    accentClass: string;
  }
> = [
  {
    href: 'https://wa.me/5215512345678',
    icon: FaWhatsapp,
    label: 'WhatsApp',
    accentClass: 'bg-[#25D366] text-white shadow-[#25D366]/40',
  },
  {
    href: 'https://instagram.com/xococafe',
    icon: FaInstagram,
    label: 'Instagram',
    accentClass: 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#962fbf] text-white',
  },
  {
    href: 'https://tiktok.com/@xococafe',
    icon: FaTiktok,
    label: 'TikTok',
    accentClass: 'bg-black text-white shadow-lg shadow-black/20',
  },
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
  const extraLinks = useMemo(() => (user ? EXTRA_LINKS_AUTH : EXTRA_LINKS_PUBLIC), [user]);

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
          {extraLinks.map((link) => {
            const Icon = link.icon;
            const active = isActiveRoute(pathname ?? '', link);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className={classNames(
                  DOCK_BUTTON_BASE,
                  active ? DOCK_BUTTON_ACTIVE : DOCK_BUTTON_INACTIVE
                )}
                aria-label={link.label}
              >
                <Icon />
              </Link>
            );
          })}
          <div className="mt-1 border-t border-black/10 pt-3 dark:border-white/10">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Conéctate
            </p>
            <div className="flex items-center justify-between space-x-2">
              {SOCIAL_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-label={link.label}
                    onClick={handleLinkClick}
                    className={classNames(
                      DOCK_BUTTON_BASE,
                      'flex-1 shadow-lg hover:scale-105 transition',
                      link.accentClass
                    )}
                  >
                    <Icon />
                  </Link>
                );
              })}
            </div>
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
