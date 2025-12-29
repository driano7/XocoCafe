'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import type { MenuItem } from '@/data/menuItems';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

type ReelCarouselProps = {
  items: MenuItem[];
  variant?: 'light' | 'dark';
};

const SWIPE_THRESHOLD = 50;
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=900&h=1100&fit=crop';

export default function ReelCarousel({ items, variant = 'dark' }: ReelCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const touchStartRef = useRef(0);
  const lastInteractionRef = useRef<number>(Date.now());
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleNext = useCallback(() => {
    setDirection('next');
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setShowSwipeHint(false);
    lastInteractionRef.current = Date.now();
  }, [items.length]);

  const handlePrev = useCallback(() => {
    setDirection('prev');
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setShowSwipeHint(false);
    lastInteractionRef.current = Date.now();
  }, [items.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartRef.current = event.touches[0].clientX;
    setShowSwipeHint(false);
    lastInteractionRef.current = Date.now();
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const diff = touchStartRef.current - event.changedTouches[0].clientX;
    if (diff > SWIPE_THRESHOLD) {
      handleNext();
    } else if (diff < -SWIPE_THRESHOLD) {
      handlePrev();
    }
    touchStartRef.current = 0;
  };

  useEffect(() => {
    if (!showSwipeHint) return undefined;
    const timer = window.setTimeout(() => setShowSwipeHint(false), 6000);
    return () => window.clearTimeout(timer);
  }, [showSwipeHint]);

  useEffect(() => {
    const INTERVAL = 3500;
    autoPlayTimerRef.current = setInterval(() => {
      if (Date.now() - lastInteractionRef.current >= INTERVAL) {
        handleNext();
      }
    }, INTERVAL);
    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [handleNext]);

  const currentItem = items[currentIndex];
  const safeImage = currentItem.image || FALLBACK_IMAGE;
  const motionDirection = direction === 'next' ? 1 : -1;

  const isDark = variant === 'dark';

  return (
    <div
      className={`relative flex min-h-[560px] w-full items-center justify-center overflow-hidden rounded-3xl border px-6 py-10 md:min-h-[640px] ${
        isDark
          ? 'border-white/10 bg-gradient-to-b from-[#0b0f1c] via-[#101425] to-[#070911] text-white'
          : 'border-gray-200 bg-gradient-to-b from-white via-gray-50 to-gray-100 text-gray-900'
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex w-full max-w-4xl flex-col items-center gap-6 md:flex-row md:gap-10">
        <div className="relative w-full max-w-sm flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={`visual-${currentItem.id}`}
              initial={{ opacity: 0, x: 60 * motionDirection }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 * motionDirection }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
              className={`relative h-[460px] overflow-hidden rounded-[36px] shadow-2xl ${
                isDark ? 'bg-white/10' : 'bg-gray-200'
              }`}
            >
              <img src={safeImage} alt={currentItem.name} className="h-full w-full object-cover" />

              <span
                className={`absolute left-4 top-4 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur ${
                  isDark ? 'bg-black/40 text-white' : 'bg-black/10 text-gray-900'
                }`}
              >
                {currentItem.category}
              </span>
            </motion.div>
          </AnimatePresence>

          <button
            type="button"
            className={`absolute left-0 top-1/2 hidden -translate-y-1/2 rounded-full border p-3 transition md:block ${
              isDark
                ? 'border-white/10 bg-black/50 text-white hover:bg-black/70'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={handlePrev}
            aria-label="Anterior"
          >
            <FiChevronLeft size={22} />
          </button>
          <button
            type="button"
            className={`absolute right-0 top-1/2 hidden -translate-y-1/2 rounded-full border p-3 transition md:block ${
              isDark
                ? 'border-white/10 bg-black/50 text-white hover:bg-black/70'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={handleNext}
            aria-label="Siguiente"
          >
            <FiChevronRight size={22} />
          </button>
        </div>

        <div className="flex w-full max-w-md flex-col items-center text-center md:items-start md:text-left">
          <AnimatePresence mode="wait">
            <motion.div
              key={`details-${currentItem.id}`}
              initial={{ opacity: 0, y: 30 * motionDirection }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 * motionDirection }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex w-full flex-col items-center text-center md:items-start md:text-left"
            >
              <div
                className={`inline-flex gap-1 rounded-full px-4 py-1 text-xs uppercase tracking-[0.3em] ${
                  isDark ? 'bg-white/10 text-white/70' : 'bg-gray-200 text-gray-700'
                }`}
              >
                <span>{currentIndex + 1}</span>
                <span className={isDark ? 'text-white/40' : 'text-gray-500'}>/</span>
                <span>{items.length}</span>
              </div>
              <h2 className="mt-4 text-4xl font-black">{currentItem.name}</h2>
              <p
                className={`mt-2 text-lg font-semibold ${
                  isDark ? 'text-[#ffb4a2]' : 'text-primary-600'
                }`}
              >
                {currentItem.price}
                {currentItem.priceGrande ? ` · ${currentItem.priceGrande}` : ''}
              </p>
              <p className={`mt-4 text-base ${isDark ? 'text-white/80' : 'text-gray-600'}`}>
                {currentItem.description}
              </p>
              {currentItem.calories ? (
                <span
                  className={`mt-4 rounded-full px-4 py-1 text-xs font-semibold ${
                    isDark ? 'bg-white/10 text-white/70' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {currentItem.calories}
                </span>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {showSwipeHint && (
        <div
          className={`pointer-events-none absolute top-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] shadow-lg md:hidden ${
            isDark ? 'bg-black/50 text-white/80' : 'bg-black/10 text-gray-700'
          }`}
        >
          <FiChevronLeft size={14} />
          <span>Desliza</span>
          <FiChevronRight size={14} />
        </div>
      )}

      <div className="absolute bottom-6 flex gap-2">
        {items.map((item, index) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex
                ? isDark
                  ? 'w-10 bg-white'
                  : 'w-10 bg-gray-900'
                : isDark
                ? 'w-4 bg-white/30'
                : 'w-4 bg-gray-400'
            }`}
            aria-label={`Ir a ${item.name}`}
          />
        ))}
      </div>
    </div>
  );
}
