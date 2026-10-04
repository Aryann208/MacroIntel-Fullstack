import { useQuery } from '@tanstack/react-query';
import { getCalendarEvents, getUpcomingEvents } from '../lib/api';

export function useUpcomingEventsQuery(from?: string, to?: string) {
  return useQuery({
    queryKey: ['upcoming-events', from, to],
    queryFn: () => {
      if (from && to) {
        return getCalendarEvents(from, to);
      }
      return getUpcomingEvents();
    },
  });
}
