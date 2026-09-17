import { useQuery } from '@tanstack/react-query';
import { getMacroSeries } from './api';

export function useMacroSeriesQuery() {
  return useQuery({
    queryKey: ['macro-series'],
    queryFn: getMacroSeries,
  });
}
