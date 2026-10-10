import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />
);

export const ListingCardSkeleton: React.FC = () => (
  <div className="bg-surface border border-border rounded-lg shadow-card p-4 space-y-3">
    <Skeleton className="w-full h-40" />
    <Skeleton className="h-5 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="min-h-touch-target w-full" />
  </div>
);
