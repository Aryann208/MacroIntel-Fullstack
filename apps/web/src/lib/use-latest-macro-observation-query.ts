'use client';

import { useQuery } from '@tanstack/react-query';
import { getLatestMacroObservation } from './api';

export function useLatestMacroObservationQuery(providerSeriesId: string) {
  return useQuery({
    queryKey: ['latest-macro-observation', providerSeriesId],
    queryFn: () => getLatestMacroObservation(providerSeriesId),
  });
}
