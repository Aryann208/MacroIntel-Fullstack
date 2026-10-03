'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CurrentUserResponse, LoginRequest } from '@macrointel/contracts';
import { ApiError, getCurrentUser, login } from '../lib/api';

type AuthContextValue = {
  token: string | null;
  user: CurrentUserResponse | null;
  isCheckingSession: boolean;
  signIn: (credentials: LoginRequest) => Promise<void>;
  signOut: () => void;
  restoreError: boolean;
  retrySession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);
  const [restoreError, setRestoreError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  function retrySession() {
    setRestoreError(false);
    setIsCheckingSession(true);
    setRetryAttempt((attempt) => attempt + 1);
  }

  useEffect(() => {
    async function restoreSession() {
      const storedToken = sessionStorage.getItem('macrointel_token');

      if (!storedToken) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(storedToken);
        setToken(storedToken);
        setUser(currentUser);
        setRestoreError(false);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          sessionStorage.removeItem('macrointel_token');
          setToken(null);
          setUser(null);
        } else {
          setRestoreError(true);
        }
      } finally {
        setIsCheckingSession(false);
      }
    }
    void restoreSession();
  }, [retryAttempt]);

  async function signIn(credentials: LoginRequest) {
    const response = await login(credentials);
    sessionStorage.setItem('macrointel_token', response.token);
    setToken(response.token);
    setUser({ id: response.id, email: response.email });
    setRestoreError(false);
  }

  function signOut() {
    sessionStorage.removeItem('macrointel_token');
    setToken(null);
    setUser(null);
    setRestoreError(false);

    queryClient.removeQueries({ queryKey: ['watchlist'] });
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isCheckingSession,
        signIn,
        signOut,
        restoreError,
        retrySession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be inside AuthProvider');
  }
  return context;
}
