'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export type FeedbackHighlight = {
  id: string;
  name: string;
  rating: number;
  title: string;
  summary: string;
  createdAt: string;
};

type FeedbackCarouselProps = {
  items: FeedbackHighlight[];
};

const SWIPE_THRESHOLD = 35;
const AUTO_PLAY_INTERVAL = 4500;

const formatRelativeTime = (createdAt: string) => {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) {
    return 'Hace poco';
  }
  const diffMs = Date.now() - created;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return 'Hace unos segundos';
  }
  if (diffMs < hour) {
    return `Hace ${Math.floor(diffMs / minute)} min`;
  }
  if (diffMs < day) {
    return `Hace ${Math.floor(diffMs / hour)} h`;
  }
  const days = Math.floor(diffMs / day);
  return `Hace ${days} día${days === 1 ? '' : 's'}`;
};

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) {
    return 'X';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, index) => (
    <span
      key={`star-${index}`}
      className={`text-sm ${index < rating ? 'text-amber-300' : 'text-white/50'}`}
    >
      ★
    </span>
  ));
};

export default function FeedbackCarousel({ items }: FeedbackCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const touchStartRef = useRef(0);
  const lastInteractionRef = useRef(Date.now());
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const itemCount = items.length;

  const handleNext = useCallback(() => {
    setDirection('next');
    setCurrentIndex((prev) => (prev + 1) % Math.max(itemCount, 1));
    lastInteractionRef.current = Date.now();
  }, [itemCount]);

  const handlePrev = useCallback(() => {
    setDirection('prev');
    setCurrentIndex((prev) => (prev - 1 + Math.max(itemCount, 1)) % Math.max(itemCount, 1));
    lastInteractionRef.current = Date.now();
  }, [itemCount]);

  useEffect(() => {
    if (!itemCount) {
      return undefined;
    }
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
    }
    autoPlayTimerRef.current = setInterval(() => {
      if (Date.now() - lastInteractionRef.current >= AUTO_PLAY_INTERVAL) {
        handleNext();
      }
    }, AUTO_PLAY_INTERVAL);
    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [handleNext, itemCount]);

  if (!itemCount) {
    return null;
  }

  const safeIndex = ((currentIndex % itemCount) + itemCount) % itemCount;
  const currentItem = items[safeIndex];

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartRef.current = event.touches[0].clientX;
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

  if (!currentItem) {
    return null;
  }

  const motionDirection = direction === 'next' ? 1 : -1;

  return (
    <div
      className="relative flex flex-col gap-6 text-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`feedback-${currentItem.id}`}
          initial={{ opacity: 0, y: 35 * motionDirection }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -35 * motionDirection }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="rounded-3xl bg-gradient-to-br from-black/30 via-black/20 to-black/10 p-6 shadow-2xl shadow-black/40"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 font-semibold uppercase tracking-[0.4em] text-white">
              {getInitials(currentItem.name)}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Recomendado</p>
              <h3 className="text-2xl font-black">{currentItem.name}</h3>
              <p className="text-sm text-white/70">{currentItem.title}</p>
            </div>
          </div>
          <p className="mt-4 text-base leading-relaxed text-white/90">{currentItem.summary}</p>
          <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/70">
            <span className="flex items-center gap-1">{renderStars(currentItem.rating)}</span>
            <span>{formatRelativeTime(currentItem.createdAt)}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {items.map((item, index) => (
            <span
              key={`indicator-${item.id}`}
              className={`h-2 rounded-full transition-all ${
                index === safeIndex ? 'w-8 bg-white' : 'w-3 bg-white/30'
              }`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Anterior comentario"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20"
            onClick={handlePrev}
          >
            <FiChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Siguiente comentario"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20"
            onClick={handleNext}
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
