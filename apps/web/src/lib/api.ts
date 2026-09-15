import { healthSchema, type HealthResponse } from '@macrointel/contracts';
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(new URL('/api/v1/health', baseUrl), { signal });
  if (!response.ok) throw new Error('API returned HTTP ' + response.status);
  return healthSchema.parse(await response.json());
}
