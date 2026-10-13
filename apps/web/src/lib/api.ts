import {
  currentUserResponseSchema,
  latestMacroObservationResponseSchema,
  loginResponseSchema,
  macroSeriesListResponseSchema,
  upcomingEventsResponseSchema,
  watchlistResponseSchema,
  watchlistChangesResponseSchema,
  type CurrentUserResponse,
  type LoginRequest,
  type LoginResponse,
  type MacroSeriesListResponse,
  type UpcomingEventsResponse,
  type LatestMacroObservationResponse,
  type WatchlistResponse,
  type WatchlistChangesResponse,
  macroSeriesHistoryResponseSchema,
  MacroSeriesHistoryResponse,
  RegisterResponse,
  RegisterRequest,
  registerResponseSchema,
  sharedSnapshotResponseSchema,
  historicalPositionsResponseSchema,
  type HistoricalPositions,
} from '@macrointel/contracts';
import { localMidnightAsIso, midnightAfterDateAsISO } from '../utils/helper';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function getLatestMacroObservation(
  providerSeriesId: string,
): Promise<LatestMacroObservationResponse> {
  const response = await fetch(
    `${baseUrl}/api/v1/macro/series/${providerSeriesId}/latest`,
  );

  if (!response.ok) {
    throw new Error(`API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  return latestMacroObservationResponseSchema.parse(data);
}

export async function getUpcomingEvents(): Promise<UpcomingEventsResponse> {
  const response = await fetch(`${baseUrl}/api/v1/macro/events/upcoming`);

  if (!response.ok) {
    throw new Error(`API returned HTTP ${response.status}`);
  }
  const data = await response.json();
  return upcomingEventsResponseSchema.parse(data);
}

export async function getMacroSeries(): Promise<MacroSeriesListResponse> {
  const response = await fetch(`${baseUrl}/api/v1/macro/series?limit=50`);

  if (!response.ok) {
    throw new Error(`API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  return macroSeriesListResponseSchema.parse(data);
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    throw new Error(`Login failed with HTTP ${response.status}`);
  }
  const data = await response.json();
  return loginResponseSchema.parse(data);
}

export async function getCurrentUser(
  token: string,
): Promise<CurrentUserResponse> {
  const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new ApiError(
      `Current user request failed with HTTP ${response.status}`,
      response.status,
    );
  }

  const data = await response.json();
  return currentUserResponseSchema.parse(data);
}

export async function getWatchlist(token: string): Promise<WatchlistResponse> {
  const response = await fetch(`${baseUrl}/api/v1/watchlist`, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new ApiError(
      `Watchlist fetch failed with HTTP ${response.status}`,
      response.status,
    );
  }
  const data = await response.json();
  return watchlistResponseSchema.parse(data);
}

export async function getWatchlistChanges(
  token: string,
): Promise<WatchlistChangesResponse> {
  const response = await fetch(`${baseUrl}/api/v1/watchlist/changes`, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new ApiError(
      `Watchlist changes fetch failed with HTTP ${response.status}`,
      response.status,
    );
  }

  const data = await response.json();
  return watchlistChangesResponseSchema.parse(data);
}

export async function startWatchlistChanges(asOf: string, token: string) {
  const response = await fetch(`${baseUrl}/api/v1/watchlist/changes/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ asOf }),
  });

  if (!response.ok) {
    throw new ApiError(
      `Starting change tracking failed with HTTP ${response.status}`,
      response.status,
    );
  }
}

export async function markWatchlistChangesSeen(asOf: string, token: string) {
  const response = await fetch(`${baseUrl}/api/v1/watchlist/changes/seen`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ asOf }),
  });

  if (!response.ok) {
    throw new ApiError(
      `Marking changes seen failed with HTTP ${response.status}`,
      response.status,
    );
  }
}

export async function addToWatchlist(
  providerSeriesId: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${baseUrl}/api/v1/watchlist/${encodeURIComponent(providerSeriesId)}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  );
  if (!response.ok) {
    throw new ApiError(
      `Adding the series to watchlist failed with HTTP ${response.status}`,
      response.status,
    );
  }
}

export async function removeFromWatchlist(
  providerSeriesId: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${baseUrl}/api/v1/watchlist/${encodeURIComponent(providerSeriesId)}`,
    {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new ApiError(
      `Removing the series failed with HTTP ${response.status}`,
      response.status,
    );
  }
}

export async function getMacroSeriesHistory(
  providerSeriesId: string,
  limit?: number,
): Promise<MacroSeriesHistoryResponse> {
  const response = await fetch(
    `${baseUrl}/api/v1/macro/series/${encodeURIComponent(providerSeriesId)}/history?limit=${limit || 12}`,
  );
  if (!response.ok) {
    throw new Error(
      `Fetching series historical data failed with HTTP ${response.status}`,
    );
  }
  const data = await response.json();
  return macroSeriesHistoryResponseSchema.parse(data);
}

export async function register(
  credentials: RegisterRequest,
): Promise<RegisterResponse> {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok && response.status === 409) {
    throw new Error(`Account already exists`);
  }
  if (!response.ok) {
    throw new Error(`Failed to register with HTTP ${response.status}`);
  }
  const data = await response.json();
  const validatedData = registerResponseSchema.parse(data);
  return validatedData;
}

export async function getCalendarEvents(from: string, to: string) {
  const response = await fetch(
    `${baseUrl}/api/v1/macro/events?from=${from}&to=${to}`,
  );
  if (!response.ok) {
    throw new Error(
      `Fetching calendar events failed with HTTP ${response.status}`,
    );
  }
  const data = await response.json();
  const validatedData = upcomingEventsResponseSchema.parse(data);
  return validatedData;
}

export async function getLatestSnapshot() {
  const response = await fetch(`${baseUrl}/api/v1/integrations/mt5/snapshot`);
  if (!response.ok) {
    throw new Error(
      `Error fetching latest MT5 snapshot with HTTP ${response.status}`,
    );
  }
  const data = await response.json();
  const validatedData = sharedSnapshotResponseSchema.parse(data);
  return validatedData;
}

export async function getHistoricalPositions(
  login: string,
  server: string,
  fromDate?: string,
  toDate?: string,
  magicNumber?: string,
  direction?: string,
  outcome?: string,
  symbol?: string,
  cursor?: string | null,
): Promise<HistoricalPositions> {
  const query = new URLSearchParams({ login, server });

  if (fromDate && toDate) {
    query.set('from', localMidnightAsIso(fromDate));
    query.set('to', midnightAfterDateAsISO(toDate));
  }
  if (direction) {
    query.set('direction', direction);
  }
  if (magicNumber) {
    query.set('magicNumber', magicNumber);
  }
  if (outcome) {
    query.set('outcome', outcome);
  }
  if (symbol) {
    query.set('symbol', symbol);
  }
  if (cursor) {
    query.set('cursor', cursor);
  }

  const response = await fetch(
    `${baseUrl}/api/v1/integrations/mt5/getHistory?${query}`,
  );

  if (!response.ok) {
    throw new Error(
      `Error fetching historical positions with HTTP ${response.status}`,
    );
  }
  const data = await response.json();
  const validatedData = historicalPositionsResponseSchema.parse(data);
  return validatedData;
}
