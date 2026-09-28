'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  ApiError,
} from './api';
import { useAuth } from '../components/auth-provider';

export function useWatchlist(token: string) {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();

  function handleAuthError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      signOut();
    }
  }
  const watchlistQuery = useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      try {
        return await getWatchlist(token);
      } catch (error) {
        handleAuthError(error);
        throw error;
      }
    },
  });
  const addMutation = useMutation({
    mutationFn: (providerSeriesId: string) =>
      addToWatchlist(providerSeriesId, token),

    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: ['watchlist'],
      });
    },
    onError: (error) => {
      handleAuthError(error);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (providerSeriesId: string) =>
      removeFromWatchlist(providerSeriesId, token),

    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
    onError: (error) => {
      handleAuthError(error);
    },
  });

  return { watchlistQuery, addMutation, removeMutation };
}
