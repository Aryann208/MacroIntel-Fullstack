# MT5 demo account recovery - 28 October 2026

## Replacement account connected

The dedicated MacroIntel terminal now uses MetaQuotes-Demo account 5058043912, a USD hedging demo with an initial balance of 100,000. The password is encrypted on the VM; it is not stored in source control. The former account and its historical records were not reset or overwritten.

All five trading symbols passed the existing bid/ask, quote-age, candle, and independent buy/sell risk checks. Algo Trading was enabled only for the dedicated MacroIntel terminal, retaining its setting to disable trading when accounts change. The existing random trader resumed and opened three positions: EURUSD, USDCHF, and GBPJPY. Its 15-minute cadence, position cap, sizing, stops, targets, and five magic numbers were retained.

During the terminal restart, MT5 updated to build 6292. Startup without explicit credentials then timed out. Initializing with the expected login, server, and password recovered the connection. The reader launcher now decrypts the VM credential and the Python reader authenticates explicitly on startup when that credential is available.

Repeated live API requests returned advancing snapshots for the new account. Both deployed frontend origins received HTTP 200 with their matching CORS headers. The new account's history endpoint also returned HTTP 200 with an empty completed-position history, as expected for a fresh account. The temporary maintenance banner and paused-status conditions were removed from the Integrations page. The frontend production build, including TypeScript, passed; the changed Python and PowerShell files parsed successfully. No automated tests were added or run.

## Confirmed incident

The broker ledger for MetaQuotes-Demo account 114054496 reconciles to USD -477,070.69. Twelve stop-out deals changed the balance from 99,990.97 by -577,061.66. The dominant deal is 10882295937, closing GBPJPY position 11134706010: 0.27 lots, buy at 210.039, exit at 209.804, recorded profit -576,818.18. Its original order had SL 209.619 and TP 210.669. The trader logged intended risk of approximately 71.85 at entry.

Recalculating those same prices during inspection returned approximately -40.22. Native terminal logs contain malformed ticks and 1970 timestamps. This supports a quote/conversion fault; the exact source of the incorrect booked profit is not proven. The malformed conversion tick at the precise stop-out was not present in the retrieved historical tick window. Do not describe the incident as an ordinary market loss or claim an exact broker root cause.

## Repairs

- Disabled and stopped only `MacroIntel-Demo-Random-Trader`. The reader remains active.
- Created a MacroIntel-only virtual environment and pinned MetaTrader5 5.0.6231 and numpy 2.4.6. Shared Python and GOLDM's running terminal were not changed.
- Reconnected the dedicated portable terminal. It updated from build 6286 to 6290 during recovery.
- Renamed its own MetaQuotes-Demo cache to `MetaQuotes-Demo.before-recovery-20261028T084011Z`; the original cache was retained.
- Added quote age, bid/ask, spread, candle comparison, finite-number, account-equity, and independent risk-calculation checks to the demo trader. A process restart retains the 15-minute cycle checkpoint.
- Both task launchers accept the expected account from the ignored `demo-account.json`. The trader can use a VM-encrypted password file; no password belongs in Git or the account JSON.
- Preserved the deployed reader's 100-deal batches, background history uploads, retry handling, account identity checks, and signed requests in source control.
- Added and built a maintenance state for the Integrations page. Both frontend deployments served the new maintenance/paused code after commit `0cdafe8`. Actual account balances and historical deals remain visible.

## Boundary before the account replacement

The former broker balance was not corrected by these software changes. Recovery required a broker-side ledger correction or a replacement demo account, with a saved login on the dedicated terminal and an updated `demo-account.json`.

Quote inspection before the replacement still showed stale/unavailable symbols and crossed EURUSD quotes, so trading remained disabled during that phase. Installing a newer Python package alone did not prove the feed fault was fixed. The risk checks reduce exposure to invalid inputs but cannot guarantee protection from a broker-side malfunction.

## Evidence and checks

The frontend production build and its TypeScript stage completed successfully. Live HTTP checks returned 200 for both frontend Integrations routes and found the maintenance and paused-status code in their deployed JavaScript. The API continued to return current account snapshots after the reader restart. Python source syntax was parsed. No automated tests were added or run during this recovery.

Local diagnostic artifacts are in the operator's temporary directory as `macrointel_balance_evidence_20261028.json`, `macrointel_balance_position_evidence_20261028.json`, and `macrointel_balance_tick_evidence_20261028.json`. They include broker deals, original order stops, and the retrieved tick window. They contain account information and should not be published.
