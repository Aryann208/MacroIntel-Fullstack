# Free preview deployment

This setup runs the Next.js web app and Express API as two Render free web services, with MongoDB Atlas as the database. The `render.yaml` Blueprint builds both services from the repository root so pnpm workspace packages are available. FRED import stays a manual command; there is no background worker or schedule.

1. Create a MongoDB Atlas free cluster and a database user. Copy its `mongodb+srv://` connection string, replace the username and password, and keep it out of Git. Add your own IP to Atlas's project IP access list if you will run FRED ingestion from your computer.
2. Review and push this repository to a Git provider Render can access. In Render, create a **Blueprint** from that repository. It reads `render.yaml`; enter the Atlas connection string when prompted for `MONGODB_URI`. Render generates `JWT_SECRET` and connects `WEB_ORIGIN` and `NEXT_PUBLIC_API_URL` to the two service URLs. Do not paste the connection string into `render.yaml` or commit `.env`.
3. After Render creates the API service, open its **Connect > Outbound** tab. Copy its outbound IP ranges into the Atlas project IP access list. Redeploy the API if its first start failed while access was blocked. Atlas needs both a valid database user and an allowed source IP.
4. Check `https://<api-service>.onrender.com/api/v1/health` for HTTP 200 and `status: "ok"`. Check `/api/v1/health/dependencies` for `dependencies.mongodb: "up"`. Open `https://<web-service>.onrender.com`, register a new user, and confirm the health indicator and series pages load. The deployed Atlas database starts empty; local Docker data is not copied there.
5. To populate Atlas, set the ignored root `.env` to the Atlas `MONGODB_URI` and your `FRED_API_KEY`, then run `pnpm --filter @macrointel/api ingest:fred` from the repository root. Your computer's IP must also be allowed in Atlas. Refresh the web page after the import. Repeat the command whenever you want fresh data. Restore your local `.env` if you want local development to use Docker MongoDB again.

Render free web services can sleep when idle, so the first request after a pause can take longer. A successful local build does not verify Render or Atlas connectivity; check the deployed endpoints after setup. `NEXT_PUBLIC_API_URL` is bundled into the web build, so a changed API origin needs a web rebuild. The API only permits the deployed web origin through CORS.

## MT5 demo connector

The MT5 reader runs on the replacement GCP VM `trading-prod-v2` against `C:\bots\macrointel_reader\terminal\terminal64.exe`, its dedicated portable terminal. The expected account is configured by `demo-account.json` in the connector folder, defaulting to login `114054496` on `MetaQuotes-Demo`. The Render web and API services do not run MT5. The `MacroIntel-Demo-MT5-Reader` task starts at Windows startup and retries every minute using the `botadmin` password logon, so RDP is not required. Its isolated Python environment is `C:\bots\macrointel_reader\.venv`. Uploads go to `https://macrointel-api.onrender.com/api/v1/integrations/mt5/snapshot`; history uses the same API origin. See [connector setup](../connectors/mt5/README.md).

The API's private `MT5_CONNECTOR_SECRET` must match the ignored connector `.env`. The reader signs snapshot and history uploads using HMAC-SHA256; credentials must not appear in frontend code or Git.

The Integrations snapshot is held in API process memory and expires after three seconds. Keep the reader running for the demo; a stopped reader or sleeping/restarted API will show an unavailable snapshot until the next upload.

On 28 October 2026 the demo account suffered an abnormal broker-booked loss. Its trader task is disabled. Both frontends now distinguish a negative-balance demo from a connection error and show a maintenance notice while preserving the actual broker figures. See [incident, repairs, and remaining recovery steps](mt5-demo-recovery.md).
