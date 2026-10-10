import React from 'react';

const SIZES = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-9 w-9 border-[3px]' } as const;

export const Spinner: React.FC<{ size?: keyof typeof SIZES; className?: string }> = ({
  size = 'md',
  className = '',
}) => (
  <span
    role="status"
    aria-label="Loading"
    className={`inline-block rounded-full border-current border-t-transparent animate-spin ${SIZES[size]} ${className}`}
  />
);
