# Architecture

MacroIntel is a pnpm workspace with two application processes. `apps/web` is a Next.js frontend, `apps/api` is an Express API, and `packages/contracts` holds the Zod response schemas imported by both. Docker Compose runs only MongoDB for local development.

The browser uses TanStack Query hooks and the typed fetch client to call `/api/v1` routes. Express validates requests, reads or writes Mongoose models, and returns responses checked against shared contracts. `GET /api/v1/health` reports API liveness; `GET /api/v1/health/dependencies` pings MongoDB and returns 503 if it is unavailable. The API closes its HTTP server and MongoDB connection on SIGINT/SIGTERM.

Registration and login live in the API's auth module. Protected watchlist routes use the authenticated user ID to read or update that user's saved series. The frontend keeps the login token in session storage and React Query refreshes affected data after watchlist changes.

FRED ingestion is a separate, manual command: `pnpm --filter @macrointel/api ingest:fred`. The FRED client validates provider responses; `syncFred` updates series metadata, observations and release dates in MongoDB. The API serves the stored data, so normal page requests do not call FRED. There is no automatic refresh: data remains at its last successful sync until the command runs again.

`MacroSeries` holds indicator metadata, while `MacroObservation` holds values for observed periods and vintages. Ingestion skips unchanged values and records changed values as new vintages. `EconomicEvent` stores release dates; calendar ingestion upserts each provider release/date and removes stale future dates for that release. FRED date-only releases are stored at UTC midnight but are not presented as having an exact release time. The Daily Brief remains a labelled placeholder; AI features are not implemented.
