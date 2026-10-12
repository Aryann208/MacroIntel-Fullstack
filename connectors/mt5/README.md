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

The default API URL is `http://127.0.0.1:4000/api/v1/integrations/mt5/snapshot`, so the API must be running on the same machine. For a different API address, pass `--api-url` with the full POST endpoint URL. The API must accept the snapshot JSON and return a successful HTTP status.

The confirmation flag is required to make account selection deliberate. The reader only calls account and position read methods; it does not submit, edit, or close trades, regardless of whether the terminal permits trading. MT5's `initialize` call can start the specified terminal if it is not already running, so verify the executable path and selected account before running it. The script does not accept or store a broker password. Press Ctrl+C to stop it; read errors go to stderr and the loop retries on the next cycle.

An empty `positions` array means the read succeeded and the account had no open positions. If MT5 reading fails or the API request fails, the script writes an error to stderr and retries on the next cycle. The request timeout is five seconds.

## Local checks

Run the offline behavior checks without connecting to a terminal:

```powershell
python -m unittest discover -s connectors/mt5 -p "test_*.py" -v
```

These checks cover reading a trading-enabled session, string IDs, UTC timestamps, a valid zero-position result, and the distinction between a failed position read and an empty account. They do not verify a live terminal connection.
