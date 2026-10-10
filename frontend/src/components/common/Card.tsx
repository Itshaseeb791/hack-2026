import React, { type HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md';
  interactive?: boolean;
}

const PADDING = { none: '', sm: 'p-3', md: 'p-4' } as const;

export const Card: React.FC<Props> = ({ padding = 'md', interactive = false, className = '', children, ...rest }) => (
  <div
    className={`bg-surface border border-border rounded-lg shadow-card ${PADDING[padding]}
      ${interactive ? 'transition-shadow hover:shadow-modal cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600' : ''}
      ${className}`}
    {...rest}
  >
    {children}
  </div>
);
