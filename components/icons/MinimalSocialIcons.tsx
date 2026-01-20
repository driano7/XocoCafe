/*
 * --------------------------------------------------------------------
 *  Xoco Café — Software Property
 *  Copyright (c) 2025 Xoco Café
 * --------------------------------------------------------------------
 */

'use client';

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: Partial<IconProps> = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function MinimalWhatsappIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...baseProps} {...props}>
      <path d="M12 21c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8c0 1.25.29 2.43.8 3.48L4 20l3.7-1.3A7.96 7.96 0 0 0 12 21Z" />
      <path d="M9.75 11.25c0 1.66 1.34 3 3 3 .34 0 .66-.06.96-.17l1.54.88" />
      <path d="M13.5 9.5v-1" />
    </svg>
  );
}

export function MinimalInstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...baseProps} {...props}>
      <rect x={5.25} y={5.25} width={13.5} height={13.5} rx={4} />
      <circle cx={12} cy={12} r={3.25} />
      <circle cx={16.2} cy={7.8} r={0.8} fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MinimalTiktokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...baseProps} {...props}>
      <path d="M14 5v6.5a3.5 3.5 0 1 1-3.5-3.5c.5 0 1 .08 1.47.25V6.3A8.1 8.1 0 0 0 9 5.8 4.7 4.7 0 0 0 9 15.3 4.6 4.6 0 0 0 13.5 11a5.2 5.2 0 0 0 3.5 1.4V9.6a3.8 3.8 0 0 1-2.5-.96V5Z" />
    </svg>
  );
}

export type MinimalSocialIconKey = 'whatsapp' | 'instagram' | 'tiktok';

export const MINIMAL_SOCIAL_ICON_MAP: Record<
  MinimalSocialIconKey,
  (props: IconProps) => JSX.Element
> = {
  whatsapp: (props) => <MinimalWhatsappIcon {...props} />,
  instagram: (props) => <MinimalInstagramIcon {...props} />,
  tiktok: (props) => <MinimalTiktokIcon {...props} />,
};
