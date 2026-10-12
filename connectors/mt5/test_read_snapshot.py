import unittest
from datetime import datetime, timezone
from types import SimpleNamespace

from read_snapshot import SnapshotReadError, read_snapshot


class FakeMetaTrader:
    POSITION_TYPE_BUY = 0
    POSITION_TYPE_SELL = 1

    def __init__(self, positions, trade_allowed=False, trade_mode=0):
        self.positions = positions
        self.trade_allowed = trade_allowed
        self.trade_mode = trade_mode
        self.position_reads = 0

    def account_info(self):
        return SimpleNamespace(
            login=9_007_199_254_740_993,
            trade_mode=self.trade_mode,
            trade_allowed=self.trade_allowed,
            server="Demo-Server",
            company="Demo Broker",
            currency="USD",
            balance=1000,
            equity=1000,
            margin=0,
            margin_free=1000,
        )

    def positions_get(self):
        self.position_reads += 1
        return self.positions

    def last_error(self):
        return (-1, "simulated read failure")


class ReadSnapshotTests(unittest.TestCase):
    def test_empty_position_result_is_a_successful_empty_snapshot(self):
        snapshot = read_snapshot(FakeMetaTrader(()))

        self.assertEqual(snapshot["positions"], [])
        self.assertEqual(snapshot["account"]["login"], "9007199254740993")

    def test_position_read_failure_is_not_reported_as_empty(self):
        with self.assertRaisesRegex(SnapshotReadError, "positions_get failed"):
            read_snapshot(FakeMetaTrader(None))

    def test_trading_enabled_account_can_be_read(self):
        mt5 = FakeMetaTrader((), trade_allowed=True, trade_mode=2)

        snapshot = read_snapshot(mt5)

        self.assertEqual(snapshot["positions"], [])
        self.assertEqual(mt5.position_reads, 1)

    def test_position_tickets_and_open_time_are_normalized(self):
        position = SimpleNamespace(
            ticket=9_007_199_254_740_993,
            symbol="EURUSD.a",
            type=FakeMetaTrader.POSITION_TYPE_BUY,
            volume=0.1,
            price_open=1.08,
            price_current=1.09,
            profit=1.0,
            sl=1.07,
            tp=1.10,
            time=0,
        )

        snapshot = read_snapshot(FakeMetaTrader((position,)))

        self.assertEqual(snapshot["positions"][0]["ticket"], "9007199254740993")
        self.assertEqual(snapshot["positions"][0]["symbol"], "EURUSD.a")
        self.assertEqual(snapshot["positions"][0]["side"], "buy")
        self.assertEqual(
            snapshot["positions"][0]["openedAt"],
            datetime.fromtimestamp(0, timezone.utc).isoformat(),
        )


if __name__ == "__main__":
    unittest.main()
