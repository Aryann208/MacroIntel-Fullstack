import mongoose from 'mongoose';

const historicalTrades = new mongoose.Schema(
  {
    ticket: { type: String, required: true },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Account',
    },
    orderTicket: { type: String, required: true },
    positionId: { type: String, required: true },
    magic: { type: Number },
    symbol: { type: String, required: true },
    side: { type: String, required: true, enum: ['buy', 'sell'] },
    entry: {
      type: String,
      required: true,
      enum: ['in', 'out', 'inout', 'outBy'],
    },
    volume: { type: Number, required: true },
    price: { type: Number, required: true },
    profit: { type: Number, required: true },
    occurredAt: { type: Date, required: true },
  },
  { timestamps: true },
);

historicalTrades.index({ ticket: 1, accountId: 1 });

export const HistoricalTrades = mongoose.model(
  'HistoricalTrades',
  historicalTrades,
);
