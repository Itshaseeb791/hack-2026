import React, { type ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState: React.FC<Props> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center gap-2 py-12 px-4">
    {icon && <div className="text-slate-300 mb-1">{icon}</div>}
    <p className="text-sm font-medium text-slate-700">{title}</p>
    {description && <p className="text-xs text-slate-500 max-w-xs">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
