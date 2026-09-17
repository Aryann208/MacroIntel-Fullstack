'use client';

import { useMutation } from '@tanstack/react-query';
import { type SubmitEvent, useEffect, useState } from 'react';
import { getCurrentUser, login } from '../lib/api';

export function AuthPanel() {
  const [userEmail, setUserEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const token = sessionStorage.getItem('macrointel_token');
      if (!token) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const user = await getCurrentUser(token);
        setUserEmail(user.email);
      } catch {
        sessionStorage.removeItem('macrointel_token');
      } finally {
        setIsCheckingSession(false);
      }
    }
    void restoreSession();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const result = await login({ email, password });
      sessionStorage.setItem('macrointel_token', result.token);
      return getCurrentUser(result.token);
    },

    onSuccess: (user) => {
      setUserEmail(user.email);
      setPassword('');
    },
    onError: () => {
      sessionStorage.removeItem('macrointel_token');
    },
  });
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate();
  }
  function handleLogout() {
    sessionStorage.removeItem('macrointel_token');
    setUserEmail('');
    setEmail('');
    setPassword('');
    loginMutation.reset();
  }

  if (isCheckingSession) {
    return (
      <div className="flex  items-center gap-2 rounded-full border border-yellow-900 bg-yellow-950/40 px-3 py-2 text-sm text-yellow-200">
        <span
          className="h-2 w-2 rounded-full bg-yellow-300"
          aria-hidden="true"
        />
        <span className="max-w-64 truncate">Checking...</span>
      </div>
    );
  }

  if (userEmail) {
    return (
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2 rounded-full border border-teal-900 bg-teal-950/40 px-3 py-2 text-sm text-teal-200">
          <span
            className="h-2 w-2 rounded-full bg-teal-300"
            aria-hidden="true"
          />
          <span className="max-w-64 truncate">Signed in as {userEmail}</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form
      aria-label="Sign in"
      className="grid w-full gap-2 sm:grid-cols-[minmax(0,13rem)_minmax(0,11rem)_auto] sm:items-end"
      onSubmit={handleSubmit}
    >
      <label htmlFor="auth-email" className="text-xs text-slate-400">
        Email
        <input
          id="auth-email"
          name="email"
          className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          required
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          type="email"
          value={email}
          disabled={loginMutation.isPending}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label htmlFor="auth-password" className="text-xs text-slate-400">
        Password
        <input
          id="auth-password"
          name="password"
          className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          required
          autoComplete="current-password"
          type="password"
          value={password}
          disabled={loginMutation.isPending}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <button
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
      </button>

      {loginMutation.isError && (
        <p className="text-xs text-amber-300 sm:col-span-3" role="alert">
          Login failed. Check your email and password.
        </p>
      )}
    </form>
  );
}
