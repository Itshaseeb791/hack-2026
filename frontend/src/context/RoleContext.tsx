import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Role } from '../types';

interface RoleState {
  role: Role | null;
  setRole: (role: Role | null) => void;
}

const RoleContext = createContext<RoleState | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<Role | null>(() => {
    const saved = sessionStorage.getItem('savefood_role');
    return saved as Role | null;
  });

  const setRole = (newRole: Role | null) => {
    setRoleState(newRole);
    if (newRole) {
      sessionStorage.setItem('savefood_role', newRole);
    } else {
      sessionStorage.removeItem('savefood_role');
    }
  };

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within RoleProvider');
  return context;
};
