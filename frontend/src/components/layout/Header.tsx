import React from 'react';
import { useRole } from '../../context/RoleContext';

export const Header: React.FC = () => {
  const { role, setRole } = useRole();

  return (
    <header className="bg-green-600 text-white p-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">SaveFood</h1>
        {role && (
          <span className="bg-white text-green-600 px-3 py-1 rounded-full text-sm font-medium capitalize">
            {role}
          </span>
        )}
      </div>
      
      {role && (
        <button
          onClick={() => setRole(null)}
          className="bg-white text-green-600 px-4 py-2 rounded hover:bg-gray-100 transition"
        >
          Change Role
        </button>
      )}
    </header>
  );
};
