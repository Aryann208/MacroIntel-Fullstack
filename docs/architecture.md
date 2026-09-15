# Architecture

MacroIntel is a pnpm workspace. Applications run as separate OS processes; Docker owns only MongoDB, Redis and Qdrant.

- `apps/web` owns the responsive Next.js App Router shell and browser state. A client-scoped TanStack Query provider calls the typed API client, which validates responses against the shared Zod contract.
- `apps/api` owns HTTP boundaries, validated configuration, request IDs, CORS, security headers and JSON Pino logs. `/api/v1/health` is process liveness; `/api/v1/health/dependencies` independently probes MongoDB, Redis and Qdrant and returns 503 when degraded.
- `apps/worker` owns background execution. It registers `system-smoke` and enqueues one uniquely identified harmless job per process startup. No ingestion or business processing exists.
- `packages/contracts` owns wire schemas and inferred types. Its compiled ESM exports are consumed by both web and API. pnpm builds it before dependent applications.

Request flow: browser → TanStack Query → typed fetch client → Express middleware → shared response schema → browser validation → health UI. Dependency probes run concurrently with short timeouts; failures do not terminate the API. API and worker handle SIGINT/SIGTERM and close their owned clients within a bounded shutdown window.

BullMQ uses at-least-once delivery. One startup enqueues one job with one attempt and a unique job ID; normal execution processes it once. A crash after side effects but before acknowledgement can repeat a job. Future business jobs must be idempotent.

Day 1 deliberately excludes auth, providers, ingestion, RAG, charts and business CRUD. MongoDB and Qdrant have health probes only; Redis additionally backs the smoke queue.
