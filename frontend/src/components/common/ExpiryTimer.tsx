import React from 'react';
import { Clock } from 'lucide-react';
import { formatTimeRemaining, getUrgencyLevel } from '../../utils/timezone';

const STYLES = {
  critical: 'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
  normal: 'bg-brand-100 text-brand-700',
} as const;

export const ExpiryTimer: React.FC<{ expiryTime: string; className?: string }> = ({ expiryTime, className = '' }) => {
  const urgency = getUrgencyLevel(expiryTime);
  const remaining = formatTimeRemaining(expiryTime);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STYLES[urgency]} ${className}`}>
      <Clock className="w-3 h-3" />
      {remaining === 'Expired' ? remaining : `${remaining} left`}
    </span>
  );
};
