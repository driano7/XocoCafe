'use client';

import TypewriterText from '@/components/TypewriterText';

interface AnimatedHeadingProps {
  text: string;
  className?: string;
  startDelay?: number;
  showCursor?: boolean;
}

export default function AnimatedHeading({
  text,
  className,
  startDelay = 200,
  showCursor = true,
}: AnimatedHeadingProps) {
  return (
    <TypewriterText
      segments={[{ text }]}
      className={className}
      startDelay={startDelay}
      showCursor={showCursor}
    />
  );
}
