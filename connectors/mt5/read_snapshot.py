"""Read account and open-position data from one local MT5 terminal."""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

POLL_INTERVAL_SECONDS = 1
HISTORY_SYNC_INTERVAL_SECONDS = 60
DEFAULT_API_URL = "http://127.0.0.1:4000/api/v1/integrations/mt5/snapshot"


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


def signed_headers(body: bytes, secret: str) -> dict[str, str]:
    timestamp = str(int(time.time()))
    signature = hmac.new(secret.encode("utf-8"), digestmod=hashlib.sha256)
    signature.update(f"{timestamp}\n".encode("utf-8"))
    signature.update(body)
    return {
        "Content-Type": "application/json",
        "X-MT5-Timestamp": timestamp,
        "X-MT5-Signature": signature.hexdigest(),
    }


def connector_secret() -> str | None:
    secret = os.environ.get("MT5_CONNECTOR_SECRET")
    if secret:
        return secret

    env_files = (
        Path(__file__).resolve().with_name(".env"),
        Path(__file__).resolve().parents[2] / ".env",
    )
    for env_file in env_files:
        if env_file.is_file():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                if line.startswith("MT5_CONNECTOR_SECRET="):
                    return line.partition("=")[2].strip().strip('"').strip("'")
    return None


def send_snapshot(api_url: str, snapshot: dict[str, Any], secret: str) -> None:
    body = json.dumps(snapshot).encode("utf-8")
    request = Request(
        api_url,
        data=body,
        headers=signed_headers(body, secret),
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

    deals = mt5.history_deals_get(date_from, date_to)
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


def send_history(api_url: str, history: dict[str, Any], secret: str) -> None:
    body = json.dumps(history).encode("utf-8")
    request = Request(
        api_url,
        data=body,
        headers=signed_headers(body, secret),
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
        "--expected-login",
        help="Stop if the terminal is signed in to a different account.",
    )
    parser.add_argument(
        "--expected-server",
        help="Stop if the terminal is connected to a different broker server.",
    )
    parser.add_argument(
        "--portable",
        action="store_true",
        help="Use an isolated portable MT5 installation.",
    )
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help=f"Snapshot endpoint URL (default: {DEFAULT_API_URL})",
    )
    parser.add_argument(
        "--history-api-url",
        default=None,
        help="History endpoint URL (default: same API origin as --api-url)",
    )
    args = parser.parse_args()
    history_api_url = args.history_api_url or args.api_url.rsplit("/", 1)[0] + "/getHistory"

    if not args.confirm_account:
        parser.error("pass --confirm-account after verifying the terminal")
    if not args.terminal_path.is_file():
        parser.error(f"terminal executable not found: {args.terminal_path}")
    secret = connector_secret()
    if not secret or len(secret) < 32:
        parser.error("set MT5_CONNECTOR_SECRET to the same key configured on the API")

    try:
        import MetaTrader5 as mt5
    except ImportError:
        print(
            "MetaTrader5 is not installed. Install connectors/mt5/requirements.txt.",
            file=sys.stderr,
        )
        return 1

    connected = mt5.initialize(
        str(args.terminal_path), timeout=10_000, portable=args.portable
    )
    if not connected:
        print(f"Could not connect to the terminal: {mt5.last_error()}", file=sys.stderr)
        return 1

    try:
        terminal = mt5.terminal_info()
        if terminal is None or not terminal.connected:
            print("The terminal is not connected to its broker server.", file=sys.stderr)
            return 1
        account = mt5.account_info()
        if account is None:
            print(f"Could not read the account: {mt5.last_error()}", file=sys.stderr)
            return 1
        if args.expected_login and str(account.login) != args.expected_login:
            print("The terminal is signed in to a different account.", file=sys.stderr)
            return 1
        if args.expected_server and account.server != args.expected_server:
            print("The terminal is connected to a different broker server.", file=sys.stderr)
            return 1

        last_history_sync = datetime(1970, 1, 1, tzinfo=timezone.utc)
        next_history_sync = 0.0
        read_failures = 0
        history_upload = None
        pending_history_end = None
        pending_history_count = 0

        with ThreadPoolExecutor(max_workers=1) as uploader:
            while True:
                cycle_started_at = time.monotonic()

                try:
                    terminal = mt5.terminal_info()
                    if terminal is None or not terminal.connected:
                        raise SnapshotReadError("The terminal is disconnected")
                    snapshot = read_snapshot(mt5)
                    if args.expected_login and snapshot["account"]["login"] != args.expected_login:
                        raise RuntimeError("The terminal switched to another account")
                    if args.expected_server and snapshot["account"]["server"] != args.expected_server:
                        raise RuntimeError("The terminal switched to another broker server")
                    read_failures = 0
                    send_snapshot(args.api_url, snapshot, secret)
                except SnapshotReadError as error:
                    read_failures += 1
                    print(f"Snapshot cycle failed: {error}", file=sys.stderr, flush=True)
                    if read_failures >= 3:
                        print("MT5 reads failed three times; restarting the reader.", file=sys.stderr, flush=True)
                        return 1
                except SnapshotSendError as error:
                    print(f"Snapshot cycle failed: {error}", file=sys.stderr, flush=True)

                if history_upload is not None and history_upload.done():
                    try:
                        history_upload.result()
                        last_history_sync = pending_history_end
                        print(
                            f"History sync complete: {pending_history_count} deals",
                            flush=True,
                        )
                    except HistorySendError as error:
                        print(f"History sync failed: {error}", file=sys.stderr, flush=True)
                    history_upload = None

                if history_upload is None and time.monotonic() >= next_history_sync:
                    history_end = datetime.now(timezone.utc)
                    try:
                        # This demo terminal reports deal times ahead of the VPS clock.
                        history = read_history(
                            mt5, last_history_sync, history_end + timedelta(days=1)
                        )
                        pending_history_count = len(history["deals"])
                        pending_history_end = history_end.replace(microsecond=0)
                        print(f"Uploading {pending_history_count} history deals", flush=True)
                        history_upload = uploader.submit(
                            send_history, history_api_url, history, secret
                        )
                    except HistoryReadError as error:
                        print(f"History sync failed: {error}", file=sys.stderr, flush=True)
                    next_history_sync = time.monotonic() + HISTORY_SYNC_INTERVAL_SECONDS

                elapsed = time.monotonic() - cycle_started_at
                time.sleep(max(0, POLL_INTERVAL_SECONDS - elapsed))
    except KeyboardInterrupt:
        print("Stopping MT5 snapshot reader.", file=sys.stderr)
        return 0
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    raise SystemExit(main())
