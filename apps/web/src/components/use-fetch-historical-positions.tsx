import { useQuery } from '@tanstack/react-query';
import { getHistoricalPositions } from '../lib/api';

export function useFetchHistoricalPositions(login?: string, server?: string) {
  return useQuery({
    queryKey: ['get-historical-positions', login, server],
    queryFn: () => {
      if (!login || !server) {
        throw new Error('Account details are not available');
      }
      return getHistoricalPositions(login, server);
    },
    refetchInterval: 60_000,
    enabled: Boolean(login && server),
  });
}
