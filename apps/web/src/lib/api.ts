import {
  currentUserResponseSchema,
  healthSchema,
  latestMacroObservationResponseSchema,
  loginResponseSchema,
  macroSeriesListResponseSchema,
  upcomingEventsResponseSchema,
  type CurrentUserResponse,
  type LoginRequest,
  type LoginResponse,
  type MacroSeriesListResponse,
  type UpcomingEventsResponse,
  type HealthResponse,
  type LatestMacroObservationResponse,
} from '@macrointel/contracts';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${baseUrl}/api/v1/health`);

  if (!response.ok) {
    throw new Error(`API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  return healthSchema.parse(data);
}

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
    throw new Error(`Current user request failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  return currentUserResponseSchema.parse(data);
}
