import React from 'react';
import { useRole } from '../../context/RoleContext';
import type { Role } from '../../types';

export const RoleSelector: React.FC = () => {
  const { setRole } = useRole();

  const roles: { value: Role; label: string; desc: string }[] = [
    { value: 'buyer', label: 'Buyer', desc: 'Get discounted food' },
    { value: 'org', label: 'Organization', desc: 'Claim free/subsidized food' },
    { value: 'vendor', label: 'Vendor', desc: 'Post surplus food' },
    { value: 'donor', label: 'Donor', desc: 'Sponsor or donate food' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8 text-green-600">SaveFood</h1>
        <p className="text-center text-gray-600 mb-8">Select your role to continue</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => setRole(value)}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-green-500"
            >
              <h3 className="text-xl font-semibold mb-2">{label}</h3>
              <p className="text-sm text-gray-600">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
