import { useQuery } from '@tanstack/react-query';
import { getHistoricalPositions } from '../lib/api';

export function useFetchHistoricalPositions(
  login?: string,
  server?: string,
  fromDate?: string,
  toDate?: string,
  magicNumber?: string,
  direction?: string,
  outcome?: string,
  symbol?: string,
  cursor?: string | null,
) {
  return useQuery({
    queryKey: [
      'get-historical-positions',
      login,
      server,
      fromDate,
      toDate,
      magicNumber,
      direction,
      outcome,
      symbol,
      cursor,
    ],
    queryFn: () => {
      if (!login || !server) {
        throw new Error('Account details are not available');
      }
      return getHistoricalPositions(
        login,
        server,
        fromDate,
        toDate,
        magicNumber,
        direction,
        outcome,
        symbol,
        cursor,
      );
    },
    refetchInterval: 60_000,
    enabled: Boolean(login && server),
  });
}
