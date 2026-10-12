'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/auth-provider';
import {
  ApiError,
  getWatchlistChanges,
  markWatchlistChangesSeen,
  startWatchlistChanges,
} from './api';

export function useWatchlistChanges(token: string) {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const queryKey = ['watchlist', 'changes', token];

  function handleAuthError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      signOut();
    }
  }

  const changesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await getWatchlistChanges(token);
      } catch (error) {
        handleAuthError(error);
        throw error;
      }
    },
  });

  const startMutation = useMutation({
    mutationFn: (asOf: string) => startWatchlistChanges(asOf, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: handleAuthError,
  });
  const startTracking = startMutation.mutate;
  const canStart = startMutation.isIdle;

  useEffect(() => {
    if (changesQuery.data?.needsBaseline && canStart) {
      startTracking(changesQuery.data.asOf);
    }
  }, [changesQuery.data, canStart, startTracking]);

  const markSeenMutation = useMutation({
    mutationFn: (asOf: string) => markWatchlistChangesSeen(asOf, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: handleAuthError,
  });

  return { changesQuery, startMutation, markSeenMutation };
}
