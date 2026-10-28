"""Generate random trades for the MetaQuotes demo account only."""

import math
import os
import random
import sys
import time
from pathlib import Path

import MetaTrader5 as mt5


TERMINAL = r"C:\bots\macrointel_reader\terminal\terminal64.exe"
LOGIN = int(os.environ.get("MT5_DEMO_LOGIN", "114054496"))
SERVER = os.environ.get("MT5_DEMO_SERVER", "MetaQuotes-Demo")
# This MetaQuotes demo reports server timestamps two hours ahead of UTC.
SERVER_UTC_OFFSET_SECONDS = int(os.environ.get("MT5_DEMO_SERVER_UTC_OFFSET_SECONDS", "7200"))
SYMBOLS = ("XAUUSD", "XAGUSD", "GBPJPY", "EURUSD", "USDCHF")
MAGIC_NUMBERS = (880011, 880012, 880013, 880014, 880015)
FOK_FLAG = 1  # MT5's SYMBOL_FILLING_FOK bit in symbol_info().filling_mode.
STOP_PERCENT = 0.002
TARGET_PERCENT = 0.003
MAX_OPEN_POSITIONS = 12
SIGNALS_PER_CYCLE = 3
CYCLE_SECONDS = 15 * 60
LAST_CYCLE = Path(__file__).with_name("last_demo_cycle.txt")


def account_ready() -> bool:
    terminal = mt5.terminal_info()
    account = mt5.account_info()
    if terminal is None or account is None:
        raise RuntimeError(f"MT5 account unavailable: {mt5.last_error()}")
    if terminal.path.lower() != TERMINAL.rsplit("\\", 1)[0].lower():
        raise RuntimeError("Connected to the wrong MT5 terminal")
    if account.login != LOGIN or account.server != SERVER:
        raise RuntimeError("Connected to the wrong MT5 account")
    if account.trade_mode != mt5.ACCOUNT_TRADE_MODE_DEMO:
        raise RuntimeError("This trader only runs on a demo account")
    if account.currency != "USD":
        raise RuntimeError("The demo trader's risk sizing requires a USD account")
    if not math.isfinite(account.balance) or not math.isfinite(account.equity):
        raise RuntimeError("Invalid demo account balance or equity")
    if account.balance <= 0 or account.equity <= 0:
        raise RuntimeError("Demo trading paused: balance and equity must be positive")
    if not terminal.connected:
        print("MT5 is disconnected from the demo server", flush=True)
        return False
    if not terminal.trade_allowed or terminal.tradeapi_disabled:
        print(
            "Enable Algo Trading in the MacroIntel demo terminal: "
            f"algo_enabled={terminal.trade_allowed}, "
            f"python_blocked={terminal.tradeapi_disabled}, "
            f"account_trading={account.trade_allowed}, "
            f"account_experts={account.trade_expert}",
            flush=True,
        )
        return False
    if not account.trade_allowed or not account.trade_expert:
        print("This demo login does not permit automated trading", flush=True)
        return False
    return True


def quote(symbol: str):
    info = mt5.symbol_info(symbol)
    if info is None or info.trade_mode != mt5.SYMBOL_TRADE_MODE_FULL:
        print(f"{symbol}: not available for full trading", flush=True)
        return None
    if not info.visible and not mt5.symbol_select(symbol, True):
        print(f"{symbol}: could not add to Market Watch", flush=True)
        return None
    # A fresh login needs a moment to receive the first quote.
    for _ in range(5):
        tick = mt5.symbol_info_tick(symbol)
        if tick is not None and math.isfinite(tick.bid) and math.isfinite(tick.ask):
            if tick.bid > 0 and tick.ask >= tick.bid:
                break
        time.sleep(1)
    else:
        print(f"{symbol}: invalid or missing bid/ask", flush=True)
        return None

    quote_age = time.time() - (tick.time - SERVER_UTC_OFFSET_SECONDS)
    if quote_age < -120 or quote_age > 120:
        print(f"{symbol}: quote timestamp is stale or invalid", flush=True)
        return None
    if (tick.ask - tick.bid) / tick.bid > 0.001:
        print(f"{symbol}: spread exceeds 0.1%; skipping", flush=True)
        return None
    bars = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_M1, 0, 1)
    if bars is None or len(bars) == 0:
        print(f"{symbol}: no recent candle to verify the quote", flush=True)
        return None
    bar = bars[-1]
    reference = float(bar["close"])
    if not math.isfinite(reference) or reference <= 0 or abs(tick.time - int(bar["time"])) > 120:
        print(f"{symbol}: quote timestamp does not match the current candle", flush=True)
        return None
    if abs(tick.bid / reference - 1) > 0.01:
        print(f"{symbol}: quote differs from the current candle by over 1%", flush=True)
        return None
    return info, tick


def prices(info, tick, side: int):
    entry = tick.ask if side == mt5.ORDER_TYPE_BUY else tick.bid
    direction = 1 if side == mt5.ORDER_TYPE_BUY else -1
    stop = round(entry * (1 - direction * STOP_PERCENT), info.digits)
    target = round(entry * (1 + direction * TARGET_PERCENT), info.digits)
    return entry, stop, target


def risk_for_lot(symbol: str, side: int, entry: float, stop: float) -> float | None:
    # MT5 may still be loading the currency conversion quote after login.
    for _ in range(5):
        result = mt5.order_calc_profit(side, symbol, 1.0, entry, stop)
        if result is not None and math.isfinite(result) and result < 0:
            break
        time.sleep(1)
    else:
        print(f"{symbol}: could not calculate stop-loss risk ({mt5.last_error()})", flush=True)
        return None

    info = mt5.symbol_info(symbol)
    if info is None or not math.isfinite(info.trade_contract_size) or info.trade_contract_size <= 0:
        print(f"{symbol}: invalid contract size", flush=True)
        return None
    expected = abs(entry - stop) * info.trade_contract_size
    if info.currency_profit != "USD":
        conversion_symbol = {"JPY": "USDJPY", "CHF": "USDCHF"}.get(info.currency_profit)
        conversion = quote(conversion_symbol) if conversion_symbol else None
        if conversion is None:
            print(f"{symbol}: currency conversion quote is unavailable or invalid", flush=True)
            return None
        expected /= conversion[1].bid
    risk = abs(result)
    if expected <= 0 or not math.isfinite(expected) or abs(risk / expected - 1) > 0.05:
        print(f"{symbol}: broker risk calculation disagrees with the contract calculation", flush=True)
        return None
    return risk


def volume_for_risk(info, risk_dollars: float, risk_per_lot: float) -> float:
    steps = round((risk_dollars / risk_per_lot) / info.volume_step)
    volume = steps * info.volume_step
    return round(min(info.volume_max, max(info.volume_min, volume)), 8)


def send_signal(symbol: str) -> None:
    side = random.choice((mt5.ORDER_TYPE_BUY, mt5.ORDER_TYPE_SELL))
    gold = quote("XAUUSD")
    current = quote(symbol)
    if gold is None or current is None:
        return

    gold_info, gold_tick = gold
    gold_entry, gold_stop, _ = prices(gold_info, gold_tick, side)
    gold_risk_per_lot = risk_for_lot("XAUUSD", side, gold_entry, gold_stop)
    if gold_risk_per_lot is None:
        return
    gold_lot = random.randint(5, 15) / 100
    target_risk = gold_lot * gold_risk_per_lot

    info, tick = current
    entry, stop, target = prices(info, tick, side)
    symbol_risk_per_lot = risk_for_lot(symbol, side, entry, stop)
    if symbol_risk_per_lot is None:
        return
    volume = (
        gold_lot
        if symbol == "XAUUSD"
        else volume_for_risk(info, target_risk, symbol_risk_per_lot)
    )
    if volume * symbol_risk_per_lot > target_risk * 1.1:
        print(f"{symbol}: minimum lot size would exceed the intended risk", flush=True)
        return
    if not info.filling_mode & FOK_FLAG:
        print(f"{symbol}: full-volume fills are unavailable", flush=True)
        return

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": side,
        "price": entry,
        "sl": stop,
        "tp": target,
        "deviation": 20,
        "magic": random.choice(MAGIC_NUMBERS),
        "comment": "macrointel-random-demo",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_FOK,
    }
    check = mt5.order_check(request)
    if check is None or check.retcode != 0:
        print(f"{symbol}: order check failed: {check or mt5.last_error()}", flush=True)
        return
    if not account_ready():
        return
    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        print(f"{symbol}: order rejected: {result or mt5.last_error()}", flush=True)
        return
    direction = "buy" if side == mt5.ORDER_TYPE_BUY else "sell"
    risk = round(volume * symbol_risk_per_lot, 2)
    print(
        f"Opened {direction} {symbol} {volume} lots, risk ~${risk}, "
        f"SL {stop}, TP {target}, magic {request['magic']}, deal {result.deal}",
        flush=True,
    )


def run_cycle() -> None:
    positions = mt5.positions_get()
    if positions is None:
        print(f"Could not read positions: {mt5.last_error()}", flush=True)
        return
    slots = MAX_OPEN_POSITIONS - len(positions)
    if slots <= 0:
        print("Open-position limit reached", flush=True)
        return
    print(
        f"Demo cycle {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())} UTC: "
        f"{len(positions)} open positions, up to {min(SIGNALS_PER_CYCLE, slots)} signals",
        flush=True,
    )
    for symbol in random.sample(SYMBOLS, min(SIGNALS_PER_CYCLE, slots)):
        send_signal(symbol)


def main() -> int:
    if not mt5.initialize(TERMINAL, timeout=10_000, portable=True):
        print(f"Could not connect to MacroIntel demo terminal: {mt5.last_error()}", flush=True)
        return 1
    try:
        password = os.environ.pop("MT5_DEMO_PASSWORD", None)
        if password and not account_ready():
            if not mt5.login(LOGIN, password=password, server=SERVER, timeout=10_000):
                raise RuntimeError(f"Could not authenticate the demo trader: {mt5.last_error()}")
            print("Demo trading login authenticated", flush=True)
        password = None
        last_cycle = float(LAST_CYCLE.read_text()) if LAST_CYCLE.exists() else 0
        while True:
            if not account_ready():
                time.sleep(30)
                continue
            remaining = last_cycle + CYCLE_SECONDS - time.time()
            if remaining > 0:
                time.sleep(min(30, remaining))
                continue
            # A task restart must not start another batch inside the same 15 minutes.
            last_cycle = time.time()
            LAST_CYCLE.write_text(str(last_cycle), encoding="utf-8")
            run_cycle()
    except (KeyboardInterrupt, RuntimeError) as error:
        print(f"Demo trader stopped: {error}", flush=True)
        return 1
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    sys.exit(main())
