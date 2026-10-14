# Local MT5 read-only snapshot probe

This Windows-only reader stays connected to one selected MetaTrader 5 terminal and POSTs one JSON snapshot per second to the MacroIntel API. It does not submit, edit, or close trades.

## Setup

Use 64-bit Python on a Windows machine with MetaTrader 5 installed. From the repository root, install the pinned Python package:

```powershell
python -m pip install -r connectors/mt5/requirements.txt
```

Find the selected terminal's `terminal64.exe` path and run:

```powershell
python connectors/mt5/read_snapshot.py "C:\Path\To\Terminal\terminal64.exe" --confirm-account
```

The default API URL is `http://127.0.0.1:4000/api/v1/integrations/mt5/snapshot`, so the API must be running on the same machine. For a different API address, pass `--api-url` with the full POST endpoint URL. The history endpoint uses the same API address automatically. The API must accept the snapshot JSON and return a successful HTTP status.

For the deployed site, run this reader on the Windows machine that hosts the selected MT5 terminal. Point it at the deployed Express API, not the web app:

```powershell
python connectors/mt5/read_snapshot.py "C:\Program Files\FTMO Global Markets MT5 Terminal\terminal64.exe" --confirm-account --expected-login 114054496 --api-url "https://macrointel-api.onrender.com/api/v1/integrations/mt5/snapshot"
```

On a machine already running a trading worker, install a second MT5 copy in its own directory and sign in there with the read-only account credentials. Do not point the reader at the trading worker's terminal. Keep the reader running while the demo should be live; the API marks its snapshot unavailable after three seconds without an upload. The reader stops immediately if the selected terminal is signed in to another account.

Set `MT5_CONNECTOR_SECRET` to the same secret on the API and Python connector. It must be at least 32 characters. Python reads it from its process environment, an adjacent ignored `.env`, or the repository root `.env`. Both snapshot and history uploads sign the timestamp followed by the exact JSON bytes with HMAC-SHA256. Once the API signature middleware is deployed, it accepts a signature only within 10 seconds of its timestamp. Keep the connector and API clocks synchronized, and use HTTPS whenever the API is outside the local machine. Configure the same secret as a private environment variable on the deployed API and connector host; never put it in frontend code.

On GCP, the deployed reader lives in `C:\bots\macrointel_reader`, and the `MacroIntel-Demo-MT5-Reader` Windows task starts `run_gcp_demo.ps1` at user logon. Its output is `reader.log` in the same directory. The task uses the signed-in FTMO terminal and requires the expected demo login and broker server.
The task starts at user logon and checks once a minute whether the reader needs to start. Its `IgnoreNew` setting prevents a second instance while the reader is already running. It also restarts after a failed exit and has no 72-hour runtime limit. Three consecutive MT5 read failures cause a failed exit so the next task run reconnects to the terminal. API upload failures keep retrying without restarting MT5. The reader checks the account identity before every upload. The runner appends start and exit timestamps to `reader.log` so a restart does not erase the previous failure.
The demo terminal reports deal times ahead of the VPS UTC clock, so history queries include the next day while the sync checkpoint stays at the current UTC time. Uploads can repeat a recent deal; the API upserts by account and ticket.
The history HTTP upload runs in a single background thread so a slow history response does not pause the one-second snapshot loop. MT5 reads remain on the main thread.

## Random demo trades

`demo_trader.py` is a separate process for generating sample dashboard data. It requires the exact `MetaQuotes-Demo` login `114054496` and a demo account. Every 15 minutes, it randomly chooses up to three distinct symbols from XAUUSD, XAGUSD, GBPJPY, EURUSD, and USDCHF, then randomly buys or sells. BTCUSD and ETHUSD are absent from this demo server. The script stops opening trades when the account has 12 open positions.

Each signal draws a reference XAUUSD size from 0.05 to 0.15 lots. Other symbols use their MT5 stop-loss value per lot to target a similar USD risk. All orders have a stop 0.2% from the entry quote, a take-profit 0.3% away, a randomly chosen magic number from `880011` through `880015`, and comment `macrointel-random-demo`. Magic numbers can repeat; they are chosen independently for each trade. These are random demonstration trades, not strategy performance. The `MacroIntel-Demo-Random-Trader` task starts `run_gcp_random_demo.ps1` at user logon and checks once a minute whether it needs to restart, with output in `random_trader.log`. The script waits while trading is disabled on the FTMO terminal; it never switches to another terminal or account.

The confirmation flag is required to make account selection deliberate. The reader only calls account and position read methods; it does not submit, edit, or close trades, regardless of whether the terminal permits trading. MT5's `initialize` call can start the specified terminal if it is not already running, so verify the executable path and selected account before running it. The script does not accept or store a broker password. Press Ctrl+C to stop it; read errors go to stderr and the loop retries on the next cycle.

An empty `positions` array means the read succeeded and the account had no open positions. API request failures retry on the next cycle. After three consecutive MT5 read failures, the process exits so its scheduled task can reconnect it. The snapshot request timeout is five seconds.

## Local checks

Run the offline behavior checks without connecting to a terminal:

```powershell
python -m unittest discover -s connectors/mt5 -p "test_*.py" -v
```

These checks cover reading a trading-enabled session, string IDs, UTC timestamps, a valid zero-position result, and the distinction between a failed position read and an empty account. They do not verify a live terminal connection.
