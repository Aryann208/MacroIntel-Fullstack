import { useQuery } from '@tanstack/react-query';
import { getUpcomingEvents } from '../lib/api';

export function useUpcomingEventsQuery() {
  return useQuery({
    queryKey: ['upcoming-events'],
    queryFn: getUpcomingEvents,
  });
}
