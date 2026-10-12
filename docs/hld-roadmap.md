# Reliable ingestion and freshness: next learning track

MacroIntel currently imports FRED data only when `ingest:fred` is run manually. The next track makes updates automatic and teaches the operational choices behind scheduling, retries, freshness, and caching. Implement these tickets in order; each adds observable behavior and a failure scenario, not an unused pattern.

## 1. Define when an update is expected

Map each curated indicator to its actual publication or release. Store the date, a source URL, and an exact time plus IANA timezone only when an authoritative source provides them. The FRED release-dates endpoint used today supplies dates, not exact times; those dates also do not guarantee that data is already available on FRED. For date-only releases, use a bounded check window rather than inventing a 17:00 Eastern release. Test daylight-saving transitions with `America/New_York` instead of treating EST as a fixed offset.

**Done when:** the scheduler can explain why and when each check is due, and the UI never presents a date-only release as an exact appointment.

## 2. Add a durable scheduler and worker

Separate the API request path from ingestion. Locally, run a Redis-backed queue and a worker process. Schedule one job per release window, with a stable job identity so restarting the scheduler does not create duplicate work. Keep the manual import command for backfill and recovery. Choose the deployed runtime before claiming production automation: the current Render Blueprint has only two free web services, which can sleep; Render background workers and cron jobs are not Free service types. A free Key Value instance is also memory-only and can lose queued jobs on restart.

**Done when:** a due release starts a job without a browser request, restarts do not duplicate it, and the deployment documentation states the actual running scheduler and its cost/reliability limits.

## 3. Make a release check bounded and repeatable

Use the existing FRED sync as the worker's operation, but check only the relevant release/series where practical. Give every attempt a timeout. Retry transient failures and not-yet-published data with exponential backoff and jitter, under a maximum attempt count and a release-specific deadline. Stop when a meaningful observation is saved or the deadline is reached. Keep writes idempotent so a retry cannot create duplicate vintages or notifications. Record a distinct outcome for "unchanged," "not available yet," "changed," and "failed."

**Done when:** a delayed FRED release succeeds after a retry, a permanently unavailable release stops cleanly, and repeated jobs do not duplicate data.

## 4. Expose freshness and fallback honestly

Persist the last attempt, last successful sync, affected series, next expected check, and error/outcome. Add an API response that lets the web app display "Last updated," "Checking," or "Data may be stale." Continue serving the last stored observation during a provider outage; label it as old rather than fabricating a fresh value. Keep provider publication time, observation period, and ingestion time distinct.

**Done when:** a failed sync leaves the previous value visible with an accurate stale warning and a successful retry clears it.

## 5. Introduce one useful server cache

Measure a read-heavy public endpoint first, such as the indicator list or latest observation. Add Redis cache-aside for that endpoint only. MongoDB remains authoritative. Use a short, justified TTL; after a successful import, invalidate affected keys so the next read repopulates them. Keep TanStack Query's browser cache conceptually separate from the server cache. Do not cache personalized watchlists until there is a measured need and a user-safe key strategy.

**Done when:** cache hits reduce MongoDB reads, imported changes invalidate the right key, and Redis failure falls back to MongoDB.

## 6. Prove hot-key and stampede behavior

Load-test concurrent requests for one popular key. On a cold miss, coalesce the database load so many callers do not all rebuild the same value. Add TTL jitter where several keys would otherwise expire together. Warm only the small set of genuinely popular keys after a successful import or deploy. Measure hit rate, miss rate, database load, and suppressed duplicate loads before and after. Add a stale-while-revalidate path only if the freshness contract allows it.

**Done when:** a concurrent cold-key test shows bounded MongoDB reads and users still see accurate freshness metadata.

## 7. Validate the whole failure path

Exercise scheduler restart, duplicate due events, FRED timeout, unpublished data, Redis outage, MongoDB outage, daylight-saving transitions, and a late-arriving change. Correlate scheduler, job, import, cache invalidation, and API logs with a shared run ID. Deploy only after the chosen worker/queue runtime is actually available, then verify a natural release cycle rather than calling a build a successful deployment.

**Done when:** one release can be traced from expected time through job attempts, MongoDB write, cache invalidation, API response, and freshness label.

## Sources for design constraints

- [FRED release dates API](https://fred.stlouisfed.org/docs/api/fred/release_dates.html)
- [BullMQ Job Schedulers](https://docs.bullmq.io/guide/job-schedulers/) and [retrying jobs](https://docs.bullmq.io/guide/retrying-failing-jobs)
- [Render Free service limits](https://render.com/docs/free), [background workers](https://render.com/docs/background-workers), and [cron jobs](https://render.com/docs/cronjobs)
- [Redis cache-aside](https://redis.io/docs/latest/develop/use-cases/cache-aside/) and [stampede protection](https://redis.io/docs/latest/develop/use-cases/cache-aside/nodejs/)
