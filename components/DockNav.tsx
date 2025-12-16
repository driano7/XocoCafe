'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiCalendar, FiHome, FiShoppingBag, FiUser } from 'react-icons/fi';
import classNames from 'classnames';
import { useAuth } from '@/components/Auth/AuthProvider';

const links = [
  { href: '/', label: 'Inicio', icon: FiHome },
  { href: '/dashboard/pedidos', label: 'Pedidos', icon: FiShoppingBag },
  { href: '/reserve', label: 'Reservas', icon: FiCalendar },
  { href: '/profile', label: 'Perfil', icon: FiUser },
];

export default function DockNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user || !isMobile) {
    return null;
  }

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-1 rounded-[24px] border border-white/30 bg-white/80 p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/50">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={classNames(
                'flex flex-1 items-center justify-center rounded-2xl p-2 transition',
                active
                  ? 'bg-black/90 text-white dark:bg-white/90 dark:text-black'
                  : 'text-gray-600 hover:bg-black/10 hover:text-black dark:text-gray-200 dark:hover:bg-white/10'
              )}
            >
              <Icon className="text-lg" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
