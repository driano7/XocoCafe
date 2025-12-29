/*
 * --------------------------------------------------------------------
 *  Xoco Café — Software Property
 * --------------------------------------------------------------------
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useRef } from 'react';

const animatedPatterns = [
  /^\/$/,
  /^\/profile(?:\/.*)?$/,
  /^\/dashboard\/pedidos(?:\/.*)?$/,
  /^\/reserve(?:\/.*)?$/,
];

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPathRef = useRef(pathname);
  const previousPath = previousPathRef.current;

  useEffect(() => {
    previousPathRef.current = pathname;
  }, [pathname]);

  const shouldAnimate =
    animatedPatterns.some((pattern) => pattern.test(pathname)) ||
    animatedPatterns.some((pattern) => pattern.test(previousPath));
  if (!shouldAnimate) {
    return <>{children}</>;
  }
  const animationProps = shouldAnimate
    ? {
        initial: { opacity: 0, filter: 'blur(12px)' },
        animate: { opacity: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, filter: 'blur(12px)' },
      }
    : {
        initial: false,
        animate: { opacity: 1 },
        exit: { opacity: 1 },
      };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        {...animationProps}
        transition={{ duration: 0.54, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
