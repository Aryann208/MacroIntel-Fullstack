# Architecture

MacroIntel is a pnpm workspace. Applications run as separate OS processes; Docker owns only MongoDB, Redis and Qdrant.

- `apps/web` owns the responsive Next.js App Router shell and browser state. A client-scoped TanStack Query provider calls the typed API client, which validates responses against the shared Zod contract.
- `apps/api` owns HTTP boundaries, validated configuration, request IDs, CORS, security headers and JSON Pino logs. `/api/v1/health` is process liveness; `/api/v1/health/dependencies` independently probes MongoDB, Redis and Qdrant and returns 503 when degraded.
- `apps/worker` owns background execution. BullMQ registers an hourly `fred-sync` schedule in Redis. The worker calls the API package's shared `syncFred` function, which imports observations and refreshes upcoming release dates for the curated indicators.
- `packages/contracts` owns wire schemas and inferred types. Its compiled ESM exports are consumed by both web and API. pnpm builds it before dependent applications.

Request flow: browser → TanStack Query → typed fetch client → Express middleware → shared response schema → browser validation → health UI. Dependency probes run concurrently with short timeouts; failures do not terminate the API. API and worker handle SIGINT/SIGTERM and close their owned clients within a bounded shutdown window.

BullMQ uses at-least-once delivery. FRED jobs have three attempts with five-second retry delays. Observation ingestion skips unchanged values and upserts changed observations by series, observed period and vintage. Calendar ingestion upserts by provider plus release ID/date, allowing retries without duplicate events.

Calendar flow: FRED client validates provider JSON → `syncFredCalendar` selects today's and future dates → `EconomicEvent` stores one entry per release/date → `/api/v1/macro/events/upcoming` returns the shared contract → React Query renders the calendar. Several indicators may share a publication, so each release is synchronized once per run. Missing importance, forecasts and actual values remain null. FRED dates are stored at UTC midnight with `dateOnly: true`; this is a storage representation, not a claimed release time. The API retains today's date-only entries and the UI formats them as UTC calendar dates. Future entries removed from a publication's schedule are removed only from that FRED release's calendar records; manual seed data is preserved and excluded from the live calendar endpoint.

`apps/api/src/scripts/ingest-fred.ts` is the manual backfill/recovery entry point. It uses the same `syncFred` function as the scheduled worker. Qdrant remains health-check infrastructure; no RAG or AI brief generation is implemented.
