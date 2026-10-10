import React from 'react';
import { ShoppingBag, HeartHandshake, Store, Gift } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import type { Role } from '../../types';
import { Card } from '../common/Card';

export const RoleSelector: React.FC = () => {
  const { setRole } = useRole();

  const roles: { value: Role; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'buyer', label: 'Buyer', desc: 'Get discounted food', icon: ShoppingBag },
    { value: 'org', label: 'Organization', desc: 'Claim free/subsidized food', icon: HeartHandshake },
    { value: 'vendor', label: 'Vendor', desc: 'Post surplus food', icon: Store },
    { value: 'donor', label: 'Donor', desc: 'Sponsor or donate food', icon: Gift },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-center mb-2 text-brand-600">SaveFood</h1>
        <p className="text-center text-slate-500 mb-8">Select your role to continue</p>

        <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-4">
          {roles.map(({ value, label, desc, icon: Icon }) => (
            <Card
              key={value}
              interactive
              onClick={() => setRole(value)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setRole(value);
              }}
              className="text-left border-2 border-transparent hover:border-brand-500"
            >
              <Icon className="w-6 h-6 text-brand-600 mb-2" />
              <h3 className="text-lg font-semibold mb-1 text-slate-900">{label}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
