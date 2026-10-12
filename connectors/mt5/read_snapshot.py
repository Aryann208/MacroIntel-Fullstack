"""Read account and open-position data from one local MT5 terminal."""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

POLL_INTERVAL_SECONDS = 1
HISTORY_SYNC_INTERVAL_SECONDS = 60
DEFAULT_API_URL = "http://127.0.0.1:4000/api/v1/integrations/mt5/snapshot"
DEFAULT_HISTORY_API_URL = "http://127.0.0.1:4000/api/v1/integrations/mt5/getHistory"


class SnapshotReadError(Exception):
    """The terminal did not provide a complete account snapshot."""


class SnapshotSendError(Exception):
    """The API did not accept the snapshot."""


class HistoryReadError(Exception):
    """The terminal did not provide history deals."""


class HistorySendError(Exception):
    """The API did not accept the history deals."""


def read_snapshot(mt5: Any) -> dict[str, Any]:
    account = mt5.account_info()
    if account is None:
        raise SnapshotReadError(f"account_info failed: {mt5.last_error()}")
    positions = mt5.positions_get()
    if positions is None:
        raise SnapshotReadError(f"positions_get failed: {mt5.last_error()}")

    normalized_positions = []
    for position in positions:
        if position.type == mt5.POSITION_TYPE_BUY:
            side = "buy"
        elif position.type == mt5.POSITION_TYPE_SELL:
            side = "sell"
        else:
            raise SnapshotReadError(f"Unsupported position type: {position.type}")

        normalized_positions.append(
            {
                "ticket": str(position.ticket),
                "symbol": position.symbol,
                "side": side,
                "volume": float(position.volume),
                "priceOpen": float(position.price_open),
                "priceCurrent": float(position.price_current),
                "profit": float(position.profit),
                "stopLoss": float(position.sl),
                "takeProfit": float(position.tp),
                "openedAt": datetime.fromtimestamp(
                    position.time, timezone.utc
                ).isoformat().replace("+00:00", "Z"),
            }
        )

    return {
        "schemaVersion": 1,
        "capturedAt": datetime.now(timezone.utc).isoformat().replace(
            "+00:00", "Z"
        ),
        "account": {
            "login": str(account.login),
            "server": account.server,
            "company": account.company,
            "currency": account.currency,
            "balance": float(account.balance),
            "equity": float(account.equity),
            "margin": float(account.margin),
            "freeMargin": float(account.margin_free),
        },
        "positions": normalized_positions,
    }


def send_snapshot(api_url: str, snapshot: dict[str, Any]) -> None:
    request = Request(
        api_url,
        data=json.dumps(snapshot).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=5):
            pass
    except HTTPError as error:
        raise SnapshotSendError(f"API returned HTTP {error.code}") from error
    except URLError as error:
        raise SnapshotSendError(f"API request failed: {error.reason}") from error
    except OSError as error:
        raise SnapshotSendError(f"API request failed: {error}") from error


def read_history(
    mt5: Any, date_from: datetime, date_to: datetime
) -> dict[str, Any]:
    account = mt5.account_info()
    if account is None:
        raise HistoryReadError(f"account_info failed: {mt5.last_error()}")

    deals = mt5.history_deals_get(int(date_from.timestamp()), int(date_to.timestamp()))
    if deals is None:
        raise HistoryReadError(f"history_deals_get failed: {mt5.last_error()}")

    side_by_type = {
        mt5.DEAL_TYPE_BUY: "buy",
        mt5.DEAL_TYPE_SELL: "sell",
    }
    entry_by_type = {
        mt5.DEAL_ENTRY_IN: "in",
        mt5.DEAL_ENTRY_OUT: "out",
        mt5.DEAL_ENTRY_INOUT: "inout",
        mt5.DEAL_ENTRY_OUT_BY: "outBy",
    }

    normalized_deals = []
    for deal in deals:
        side = side_by_type.get(deal.type)
        entry = entry_by_type.get(deal.entry)
        if side is None or entry is None:
            continue

        normalized_deals.append(
            {
                "ticket": str(deal.ticket),
                "orderTicket": str(deal.order),
                "positionId": str(deal.position_id),
                "magic": int(deal.magic),
                "symbol": deal.symbol,
                "side": side,
                "entry": entry,
                "volume": float(deal.volume),
                "price": float(deal.price),
                "profit": float(deal.profit),
                "occurredAt": datetime.fromtimestamp(
                    deal.time_msc / 1000, timezone.utc
                ).isoformat().replace("+00:00", "Z"),
            }
        )

    return {
        "schemaVersion": 1,
        "capturedAt": datetime.now(timezone.utc).isoformat().replace(
            "+00:00", "Z"
        ),
        "account": {
            "login": str(account.login),
            "server": account.server,
        },
        "deals": normalized_deals,
    }


def send_history(api_url: str, history: dict[str, Any]) -> None:
    request = Request(
        api_url,
        data=json.dumps(history).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=60):
            pass
    except HTTPError as error:
        response_body = error.read().decode("utf-8", errors="replace")
        raise HistorySendError(
            f"API returned HTTP {error.code}: {response_body}"
        ) from error
    except URLError as error:
        raise HistorySendError(f"API request failed: {error.reason}") from error
    except OSError as error:
        raise HistorySendError(f"API request failed: {error}") from error


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Read account data from a selected MetaTrader 5 terminal."
    )
    parser.add_argument(
        "terminal_path",
        type=Path,
        help="Path to the selected terminal's terminal64.exe",
    )
    parser.add_argument(
        "--confirm-account",
        action="store_true",
        help="Confirm the selected terminal and account are correct.",
    )
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help=f"Snapshot endpoint URL (default: {DEFAULT_API_URL})",
    )
    parser.add_argument(
        "--history-api-url",
        default=DEFAULT_HISTORY_API_URL,
        help=f"History endpoint URL (default: {DEFAULT_HISTORY_API_URL})",
    )
    args = parser.parse_args()

    if not args.confirm_account:
        parser.error("pass --confirm-account after verifying the terminal")
    if not args.terminal_path.is_file():
        parser.error(f"terminal executable not found: {args.terminal_path}")

    try:
        import MetaTrader5 as mt5
    except ImportError:
        print(
            "MetaTrader5 is not installed. Install connectors/mt5/requirements.txt.",
            file=sys.stderr,
        )
        return 1

    connected = mt5.initialize(str(args.terminal_path), timeout=10_000)
    if not connected:
        print(f"Could not connect to the terminal: {mt5.last_error()}", file=sys.stderr)
        return 1

    try:
        terminal = mt5.terminal_info()
        if terminal is None or not terminal.connected:
            print("The terminal is not connected to its broker server.", file=sys.stderr)
            return 1

        last_history_sync = datetime(1970, 1, 1, tzinfo=timezone.utc)
        next_history_sync = 0.0

        while True:
            cycle_started_at = time.monotonic()

            try:
                snapshot = read_snapshot(mt5)
                send_snapshot(args.api_url, snapshot)
            except (SnapshotReadError, SnapshotSendError) as error:
                print(f"Snapshot cycle failed: {error}", file=sys.stderr, flush=True)

            if time.monotonic() >= next_history_sync:
                history_end = datetime.now(timezone.utc)
                try:
                    history = read_history(mt5, last_history_sync, history_end)
                    print(
                        f"Uploading {len(history['deals'])} history deals",
                        flush=True,
                    )
                    send_history(args.history_api_url, history)
                    last_history_sync = history_end.replace(microsecond=0)
                    print(
                        f"History sync complete: {len(history['deals'])} deals",
                        flush=True,
                    )
                except (HistoryReadError, HistorySendError) as error:
                    print(f"History sync failed: {error}", file=sys.stderr, flush=True)
                next_history_sync = (
                    time.monotonic() + HISTORY_SYNC_INTERVAL_SECONDS
                )

            elapsed = time.monotonic() - cycle_started_at
            time.sleep(max(0, POLL_INTERVAL_SECONDS - elapsed))
    except KeyboardInterrupt:
        print("Stopping MT5 snapshot reader.", file=sys.stderr)
        return 0
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    raise SystemExit(main())
