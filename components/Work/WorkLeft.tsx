import { WorkProps } from './WorkRight';

export function WorkLeft({ children, progress }: WorkProps) {
  let translateY = Math.max(0, 50 - progress * 3 * 50);

  if (progress > 0.85) {
    translateY = Math.max(-50, -(progress - 0.85) * 2 * 50);
  }

  return (
    <div
      className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4 px-6 text-center text-2xl text-white sm:text-3xl md:items-start md:px-10 md:text-left lg:min-h-[30vh]"
      style={{ transform: `translateY(${translateY}px)` }}
    >
      <div className="space-y-3 leading-tight text-white/90">{children}</div>
    </div>
  );
}
