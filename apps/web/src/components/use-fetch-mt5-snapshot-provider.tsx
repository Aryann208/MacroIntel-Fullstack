import { useQuery } from '@tanstack/react-query';
import { getLatestSnapshot } from '../lib/api';

export function useFetchMT5Snapshot() {
  return useQuery({
    queryKey: ['latest-snapshot'],
    queryFn: getLatestSnapshot,
    refetchInterval: 1000,
    retry: false,
  });
}
