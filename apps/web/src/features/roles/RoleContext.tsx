import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type DemoRole = 'CANDIDATE' | 'ADMIN';

type RoleContextValue = {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<DemoRole>(() =>
    localStorage.getItem('codegauge-demo-role') === 'ADMIN' ? 'ADMIN' : 'CANDIDATE',
  );
  const value = useMemo(
    () => ({
      role,
      setRole: (nextRole: DemoRole) => {
        localStorage.setItem('codegauge-demo-role', nextRole);
        setRole(nextRole);
      },
    }),
    [role],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useDemoRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useDemoRole must be used inside RoleProvider.');
  return context;
}
