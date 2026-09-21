import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCurrentUser, login as requestLogin, register as requestRegister, type CurrentUser } from '../../api/auth';
import { clearAccessToken, getAccessToken, saveAccessToken } from '../../api/auth-token';

type AuthenticationStatus = 'loading' | 'anonymous' | 'authenticated';

type AuthContextValue = {
  status: AuthenticationStatus;
  user: CurrentUser | null;
  login: (email: string, password: string) => Promise<CurrentUser>;
  register: (displayName: string, email: string, password: string) => Promise<CurrentUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthenticationStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      setStatus('anonymous');
      return;
    }

    void getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setStatus('authenticated');
      })
      .catch(() => {
        clearAccessToken();
        setStatus('anonymous');
      });
  }, []);

  const authenticate = (response: { accessToken: string; user: CurrentUser }) => {
    saveAccessToken(response.accessToken);
    setUser(response.user);
    setStatus('authenticated');
    return response.user;
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login: async (email, password) => authenticate(await requestLogin(email, password)),
      register: async (displayName, email, password) =>
        authenticate(await requestRegister(displayName, email, password)),
      logout: () => {
        clearAccessToken();
        setUser(null);
        setStatus('anonymous');
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
