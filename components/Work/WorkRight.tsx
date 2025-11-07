import { ReactNode } from 'react';

export interface WorkProps {
  children: ReactNode;
  progress: number;
}

export function WorkRight({ children, progress }: WorkProps) {
  const translateY = Math.max(-50, -(progress - 0.5) * 50);

  return (
    <div
      className="flex min-h-[50vh] flex-1 justify-center py-8 sm:py-12 lg:min-h-screen lg:items-center"
      style={{ transform: `translateY(${translateY}px)` }}
    >
      <div className="w-full max-w-md px-6 sm:px-10 lg:px-0">{children}</div>
    </div>
  );
}
