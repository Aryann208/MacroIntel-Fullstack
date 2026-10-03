# MacroIntel

MacroIntel is a personal dashboard for monitoring selected US macro indicators. It shows stored FRED observations and history, upcoming release dates, and a signed-in user's watchlist. The Daily Brief is a labelled placeholder. Data changes only when the manual FRED ingestion command runs.

## Prerequisites

- Node.js 20.19+ on the 20.x line, or Node.js 22.13+.
- pnpm 10.34.1. On Windows PowerShell, use `pnpm.cmd` if `pnpm` is blocked by script execution policy.
- Docker Desktop and Docker Compose for local MongoDB. A reachable MongoDB instance can be used instead.
- A FRED API key only when importing real data.

## Local setup

From the repository root:

```sh
pnpm install
cp .env.example .env
docker compose up -d --wait
pnpm dev
```

In PowerShell, use `Copy-Item .env.example .env` instead of `cp` if preferred. The root `.env` is ignored by Git. Replace its example `JWT_SECRET` before any public deployment. `pnpm dev` builds shared contracts, then starts the web and API processes. The frontend reads the API URL at build time; rebuild it after changing `NEXT_PUBLIC_API_URL`.

To load real indicator values and release dates, put your real 32-character `FRED_API_KEY` in `.env` and run:

```sh
pnpm --filter @macrointel/api ingest:fred
```

The command calls FRED and writes to the MongoDB named by `MONGODB_URI`. Run it again whenever you want newer data. For an Atlas database, use its `mongodb+srv://` URI and allow the machine running ingestion to connect. There is no background schedule.

## Commands

| Command               | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `pnpm dev`            | Run web and API locally                          |
| `pnpm build`          | Build contracts and both applications            |
| `pnpm typecheck`      | Typecheck the workspace                          |
| `pnpm lint`           | Run ESLint                                       |
| `pnpm test`           | Run Vitest tests                                 |
| `pnpm format:check`   | Check formatting                                 |
| `docker compose ps`   | Check local MongoDB health                       |
| `docker compose down` | Stop local MongoDB and preserve its named volume |

After `pnpm build`, `pnpm --filter @macrointel/api start` and `pnpm --filter @macrointel/web start` run the two production processes. Supply runtime variables through the host environment; the web launcher also reads the root `.env` when present locally. See `.env.example` for every variable.

## Local URLs

| URL                                              | Expected result                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| http://localhost:3000                            | MacroIntel dashboard, series explorer, calendar and watchlist                      |
| http://localhost:4000/api/v1/health              | 200 with `status`, `service`, `version` and `timestamp`                            |
| http://localhost:4000/api/v1/health/dependencies | 200 with `dependencies.mongodb: "up"`; 503 with `"down"` if MongoDB is unavailable |
| 127.0.0.1:27017                                  | Local MongoDB container, bound to loopback                                         |

The API uses `WEB_ORIGIN` as its allowed browser origin. Set it to the deployed web origin when hosting the API. The frontend's `NEXT_PUBLIC_API_URL` must point to the deployed API before building the web app.

## Troubleshooting

- MongoDB connection failure: check `docker compose ps` and `MONGODB_URI`. The API exits if it cannot connect at startup.
- Empty macro data: run `ingest:fred` with a real FRED key, then refresh the page. Without a sync, the database has no live FRED observations.
- Browser cannot reach the API: open `/api/v1/health` directly and compare `NEXT_PUBLIC_API_URL` with the API origin. Check `WEB_ORIGIN` if the browser reports a CORS error.
- Missing shared contract export: run `pnpm --filter @macrointel/contracts build` and restart development.
- Windows `EPERM` from Node: rerun the command in a terminal with filesystem access to your user directory; this is a local permission error.

See [docs/architecture.md](docs/architecture.md) for ownership and data flow, and [docs/deployment.md](docs/deployment.md) for the free Atlas and Render deployment steps. Never commit `.env`, credentials, dependency directories or build output.
