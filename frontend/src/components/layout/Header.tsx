import React from 'react';
import { useRole } from '../../context/RoleContext';
import { Button } from '../common/Button';

export const Header: React.FC = () => {
  const { role, setRole } = useRole();

  return (
    <header className="bg-brand-600 text-white px-4 py-3 flex justify-between items-center shadow-card">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">SaveFood</h1>
        {role && (
          <span className="bg-white text-brand-700 px-3 py-1 rounded-full text-xs font-semibold capitalize">
            {role}
          </span>
        )}
      </div>

      {role && (
        <Button variant="secondary" size="sm" onClick={() => setRole(null)}>
          Change Role
        </Button>
      )}
    </header>
  );
};
