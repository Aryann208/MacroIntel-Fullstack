'use client';

import { useMutation } from '@tanstack/react-query';
import { type SubmitEvent, useState } from 'react';

import { useAuth } from './auth-provider';
import { register } from '../lib/api';

export function AuthPanel() {
  const [email, setEmail] = useState('');
  const [toggleRegister, setToggleRegister] = useState<boolean>(false);
  const [password, setPassword] = useState('');

  const {
    user,
    isCheckingSession,
    signIn,
    signOut,
    restoreError,
    retrySession,
  } = useAuth();

  const registerMutation = useMutation({
    mutationFn: async () => {
      await register({ email, password });
    },
    onSuccess: () => {
      setPassword('');
      setToggleRegister(false);
    },
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      await signIn({ email, password });
    },

    onSuccess: () => {
      setPassword('');
    },
  });

  function handleToggleRegister() {
    registerMutation.reset();
    loginMutation.reset();
    setToggleRegister((prev) => !prev);
  }
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (toggleRegister) {
      registerMutation.mutate();
      return;
    }
    loginMutation.mutate();
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

  if (restoreError) {
    return (
      <div
        className="flex items-center gap-3 text-sm text-amber-200"
        role="alert"
      >
        <span>Couldn{`'`}t verify your session.</span>
        <button
          type="button"
          onClick={retrySession}
          className="rounded-lg border border-amber-700 px-3 py-2 font-medium hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          Retry
        </button>
      </div>
    );
  }

  if (user && user.email) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-teal-900 bg-teal-950/40 px-3 py-2 text-sm text-teal-200">
          <span
            className="h-2 w-2 rounded-full bg-teal-300"
            aria-hidden="true"
          />
          <span className="min-w-0 max-w-64 truncate">
            Signed in as {user.email}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            signOut();
            setEmail('');
            setPassword('');
            loginMutation.reset();
            registerMutation.reset();
          }}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end justify-end gap-2">
      {' '}
      <form
        aria-label={toggleRegister ? 'Sign Up' : 'Sign in'}
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
            disabled={
              toggleRegister
                ? registerMutation.isPending
                : loginMutation.isPending
            }
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
            disabled={
              toggleRegister
                ? registerMutation.isPending
                : loginMutation.isPending
            }
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <button
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={
            toggleRegister
              ? registerMutation.isPending
              : loginMutation.isPending
          }
        >
          {!toggleRegister &&
            (loginMutation.isPending ? 'Signing in...' : 'Sign in')}

          {toggleRegister &&
            (registerMutation.isPending ? 'Signing up...' : 'Sign up')}
        </button>

        {!toggleRegister && loginMutation.isError && (
          <p className="text-xs text-amber-300 sm:col-span-3" role="alert">
            Login failed. Check your email and password.
          </p>
        )}
        {!toggleRegister && registerMutation.isSuccess && (
          <p className="text-sm text-teal-300">
            Account created. Please sign in
          </p>
        )}
        {toggleRegister && registerMutation.isError && (
          <p className="text-xs text-amber-300 sm:col-span-3" role="alert">
            {registerMutation.error.message}
          </p>
        )}
      </form>
      <button
        type="button"
        disabled={
          toggleRegister ? registerMutation.isPending : loginMutation.isPending
        }
        onClick={handleToggleRegister}
        className="text-sm text-teal-300 cursor-pointer"
      >
        {toggleRegister ? 'Already have an account' : 'Create Account?'}
      </button>
    </div>
  );
}
