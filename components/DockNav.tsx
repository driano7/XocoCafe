'use client';

import classNames from 'classnames';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ComponentType, useEffect, useMemo, useState } from 'react';
import {
  FiCalendar,
  FiCoffee,
  FiFileText,
  FiHome,
  FiInfo,
  FiMenu,
  FiMoreHorizontal,
  FiPackage,
} from 'react-icons/fi';

type DockLink = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  startsWith?: string;
};

const PRIMARY_LINKS: DockLink[] = [
  { href: '/', icon: FiHome, label: 'Inicio' },
  {
    href: '/dashboard/pedidos',
    icon: FiPackage,
    label: 'Pedidos',
    startsWith: '/dashboard/pedidos',
  },
  { href: '/reserve', icon: FiCalendar, label: 'Reservas', startsWith: '/reserve' },
  { href: '/uses', icon: FiMenu, label: 'Menú', startsWith: '/uses' },
];

const EXTRA_LINKS: DockLink[] = [
  { href: '/about', icon: FiInfo, label: 'About', startsWith: '/about' },
  {
    href: '/blog/facturacion',
    icon: FiFileText,
    label: 'Facturación',
    startsWith: '/blog/facturacion',
  },
  { href: '/blog', icon: FiCoffee, label: 'Blog', startsWith: '/blog' },
];

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
  const [showExtras, setShowExtras] = useState(false);
  const links = useMemo(() => PRIMARY_LINKS, []);
  const extraLinks = useMemo(() => EXTRA_LINKS, []);

  useEffect(() => {
    // Close the extra drawer whenever the route changes
    setShowExtras(false);
  }, [pathname]);

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4 sm:hidden">
      {showExtras && (
        <div className="absolute bottom-24 right-6 flex flex-col space-y-3 rounded-3xl border border-white/20 bg-black/90 p-4 text-white shadow-2xl backdrop-blur-2xl dark:border-black/10 dark:bg-white dark:text-gray-900">
          {extraLinks.map((link) => {
            const Icon = link.icon;
            const active = isActiveRoute(pathname ?? '', link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={classNames(
                  'flex h-12 w-12 items-center justify-center rounded-2xl text-xl transition',
                  active
                    ? 'bg-white/90 text-gray-900 dark:bg-gray-900 dark:text-white'
                    : 'bg-white/10 text-white hover:bg-white/20 dark:bg-gray-900/10 dark:text-gray-800 dark:hover:bg-gray-900/20'
                )}
                aria-label={link.label}
              >
                <Icon />
              </Link>
            );
          })}
        </div>
      )}
      <nav className="flex items-center justify-between rounded-full border border-white/40 bg-white/90 px-4 py-3 text-gray-900 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/90 dark:text-white">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isActiveRoute(pathname ?? '', link);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-label={link.label}
              className={classNames(
                'flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition',
                active
                  ? 'bg-black text-white shadow-lg dark:bg-white dark:text-gray-900'
                  : 'bg-white text-gray-900 shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
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
            'flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition',
            showExtras
              ? 'bg-black text-white shadow-lg dark:bg-white dark:text-gray-900'
              : 'bg-white text-gray-900 shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
          )}
          onClick={() => setShowExtras((prev) => !prev)}
        >
          <FiMoreHorizontal />
        </button>
      </nav>
    </div>
  );
}
