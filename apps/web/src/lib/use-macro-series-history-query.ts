import { useQuery } from '@tanstack/react-query';
import { getMacroSeriesHistory } from './api';

export function useMacroSeriesHistoryQuery(
  providerSeriesId: string,
  limit?: number,
) {
  return useQuery({
    queryKey: ['macro-series-history', providerSeriesId, limit],
    queryFn: () => getMacroSeriesHistory(providerSeriesId, limit),
  });
}
