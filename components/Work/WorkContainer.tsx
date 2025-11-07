import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function WorkContainer({ children }: Props) {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 gap-8 px-4 lg:grid-cols-2 lg:px-0">
      {children}
    </div>
  );
}
