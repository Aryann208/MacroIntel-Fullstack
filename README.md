# MacroIntel

Day 1 foundation for a macro research terminal. Research cards are labelled sample data. Only API and infrastructure health are connected.

## Prerequisites

- Node.js 20.19+ on the 20.x line, or Node.js 22.13+ (an actively supported LTS is preferred).
- pnpm 10.34.1 (`corepack enable` and `corepack prepare pnpm@10.34.1 --activate`, or install that exact pnpm version).
- Docker Desktop with the Linux container engine running and Docker Compose available.

All application dependencies are pinned in manifests; commit the generated pnpm lockfile. No global TypeScript or task runner is needed.

## Setup

Run from the repository root:

```sh
pnpm install
cp .env.example .env
docker compose up -d --wait
pnpm dev
```

PowerShell: replace `cp` with `Copy-Item .env.example .env`. If script execution is disabled, use `pnpm.cmd` for every pnpm command. Do not change your machine execution policy just for this project.

The root development command first compiles shared contracts, then starts web, API and worker concurrently with plain pnpm. Applications load the root `.env`; Next.js receives public configuration via its Node launcher. Defaults work without secrets. Edit only the root `.env`; every supported variable and Docker port override is documented in `.env.example`.

## Commands

| Command                             | Purpose                                       |
| ----------------------------------- | --------------------------------------------- |
| `pnpm dev`                          | Start all three application processes         |
| `pnpm build`                        | Build contracts before applications           |
| `pnpm typecheck`                    | Compile contracts and check all workspaces    |
| `pnpm lint`                         | ESLint, including Next.js rules               |
| `pnpm test`                         | Vitest contract and Supertest HTTP tests      |
| `pnpm format` / `pnpm format:check` | Format / verify repository formatting         |
| `docker compose ps`                 | Inspect service health                        |
| `docker compose down`               | Stop infrastructure, preserving named volumes |

Production starts, after `pnpm build`: run `pnpm --filter @macrointel/api start`, `pnpm --filter @macrointel/worker start`, and `pnpm --filter @macrointel/web start` in separate terminals. The web build reads the root `.env`, including `NEXT_PUBLIC_API_URL`; Next.js bundles public variables at build time, so rebuild after changing the public URL.

## Ports and verification

| URL / port                                       | Expected result                                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| http://localhost:3000                            | Responsive Overview, sample cards and API loading/success/failure state                                                                           |
| http://localhost:4000/api/v1/health              | 200 JSON: `status: "ok"`, `service: "macrointel-api"`, `version: "0.1.0"`, ISO `timestamp`                                                        |
| http://localhost:4000/api/v1/health/dependencies | 200 `status: "ok"` when all up; otherwise 503 `status: "degraded"`; `dependencies` contains `mongodb`, `redis`, `qdrant`, each `"up"` or `"down"` |
| MongoDB 127.0.0.1:27017                          | Local database, no development credentials                                                                                                        |
| Redis 127.0.0.1:6379                             | Persistent BullMQ queue                                                                                                                           |
| http://localhost:6333/healthz                    | Qdrant health, HTTP 200                                                                                                                           |
| Qdrant 127.0.0.1:6334                            | gRPC port, unused by applications today                                                                                                           |

Worker logs should show `Worker ready`, `Startup smoke job queued`, `Smoke job processed` and `Job completed` for one job ID per normal startup. A watch restart is a new startup and generates a new smoke job. Ctrl+C gracefully stops the applications; infrastructure remains until `docker compose down`.

## Troubleshooting

- Docker pipe/daemon error: start Docker Desktop, wait for the Linux engine, then rerun `docker compose up -d --wait`. Installing the CLI alone is insufficient.
- Port already allocated: stop the conflicting service or change the documented Docker port variables and matching connection URLs. Web development uses port 3000 and CORS defaults to that origin.
- API unavailable: inspect the API terminal and `.env`, visit its health URL directly, then click Retry. CORS allows only `WEB_ORIGIN`; alternate browser origins need an explicit override.
- Degraded dependencies: inspect `docker compose ps` and service logs. API liveness does not imply infrastructure readiness. Dependency errors expose status only, never connection credentials.
- Redis unavailable: the worker logs connection errors and waits for Redis recovery. Start infrastructure before applications.
- Workspace import missing: run `pnpm install` and `pnpm --filter @macrointel/contracts build`. Restart development after editing shared schemas so their compiled exports update.
- Windows `EPERM` on Node resolving the user directory: run commands in a terminal with filesystem access to your project; this is an execution environment permission issue, not a successful check.

## Tests and scope

Tests cover the shared health contract and the two Express health endpoints. Dependency HTTP tests inject a probe and do not need Docker. Live connectivity and smoke execution are separate runtime checks.

The web health component stays as one readable component. Loading, success, retry and responsive visual behavior are checked manually for now instead of adding a testing abstraction solely for Day 1.

See `docs/architecture.md` for ownership, flow and queue delivery guarantees. Never commit `.env`, dependency directories or build output. This scaffold has no authentication and infrastructure binds only to loopback for local development.

Tooling compatibility: ESLint 9.39.5 is pinned because the current Next.js React/accessibility/import plugins declare support through ESLint 9. npm marks this ESLint line deprecated; upgrade it together with compatible Next.js plugins. Vitest 4 is used because Vitest 5 requires newer Node. Optional native acceleration build scripts for msgpackr-extract and unrs-resolver remain disabled; pure JavaScript/prebuilt fallbacks are sufficient for the verified checks.
