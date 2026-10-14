"""Generate random trades for the MetaQuotes demo account only."""

import random
import sys
import time

import MetaTrader5 as mt5


TERMINAL = r"C:\Program Files\FTMO Global Markets MT5 Terminal\terminal64.exe"
LOGIN = 114054496
SERVER = "MetaQuotes-Demo"
SYMBOLS = ("XAUUSD", "XAGUSD", "GBPJPY", "EURUSD", "USDCHF")
MAGIC_NUMBERS = (880011, 880012, 880013, 880014, 880015)
FOK_FLAG = 1  # MT5's SYMBOL_FILLING_FOK bit in symbol_info().filling_mode.
STOP_PERCENT = 0.002
TARGET_PERCENT = 0.003
MAX_OPEN_POSITIONS = 12
SIGNALS_PER_CYCLE = 3
CYCLE_SECONDS = 15 * 60


def account_ready() -> bool:
    terminal = mt5.terminal_info()
    account = mt5.account_info()
    if terminal is None or account is None:
        print(f"MT5 account unavailable: {mt5.last_error()}", flush=True)
        return False
    if terminal.path.lower() != TERMINAL.rsplit("\\", 1)[0].lower():
        raise RuntimeError("Connected to the wrong MT5 terminal")
    if account.login != LOGIN or account.server != SERVER:
        raise RuntimeError("Connected to the wrong MT5 account")
    if account.trade_mode != mt5.ACCOUNT_TRADE_MODE_DEMO:
        raise RuntimeError("This trader only runs on a demo account")
    if not terminal.connected:
        print("MT5 is disconnected from the demo server", flush=True)
        return False
    if not terminal.trade_allowed or terminal.tradeapi_disabled:
        print("Enable Algo Trading in the FTMO demo terminal", flush=True)
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
    tick = mt5.symbol_info_tick(symbol)
    if tick is None or tick.bid <= 0 or tick.ask <= 0:
        print(f"{symbol}: no live quote", flush=True)
        return None
    return info, tick


def prices(info, tick, side: int):
    entry = tick.ask if side == mt5.ORDER_TYPE_BUY else tick.bid
    direction = 1 if side == mt5.ORDER_TYPE_BUY else -1
    stop = round(entry * (1 - direction * STOP_PERCENT), info.digits)
    target = round(entry * (1 + direction * TARGET_PERCENT), info.digits)
    return entry, stop, target


def risk_for_lot(symbol: str, side: int, entry: float, stop: float) -> float | None:
    result = mt5.order_calc_profit(side, symbol, 1.0, entry, stop)
    if result is None or result >= 0:
        print(f"{symbol}: could not calculate stop-loss risk", flush=True)
        return None
    return abs(result)


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
    for symbol in random.sample(SYMBOLS, min(SIGNALS_PER_CYCLE, slots)):
        send_signal(symbol)


def main() -> int:
    if not mt5.initialize(TERMINAL, timeout=10_000):
        print(f"Could not connect to FTMO demo terminal: {mt5.last_error()}", flush=True)
        return 1
    try:
        while True:
            if not account_ready():
                time.sleep(30)
                continue
            started = time.monotonic()
            run_cycle()
            time.sleep(max(1, CYCLE_SECONDS - (time.monotonic() - started)))
    except (KeyboardInterrupt, RuntimeError) as error:
        print(f"Demo trader stopped: {error}", flush=True)
        return 1
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    sys.exit(main())
