import mongoose from 'mongoose';
import { category } from './macro-series.model.js';

const economicEvent = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    providerEventId: { type: String, required: true, trim: true },
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: 'MacroSeries',
    },
    name: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, uppercase: true },
    currency: { type: String, required: true, trim: true, uppercase: true },
    category: { type: String, required: true, enum: category },
    importance: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high'],
    },
    scheduledAt: { type: Date, required: true },
    releasedAt: { type: Date, default: null },
    status: {
      type: String,
      required: true,
      enum: ['scheduled', 'cancelled', 'released', 'revised'],
    },
    actual: { type: Number, default: null },
    forecast: { type: Number, default: null },

    previous: { type: Number, default: null },
    revisedPrevious: { type: Number, default: null },
    unit: { type: String, required: true, trim: true },
    sourceUrl: { type: String, default: null, trim: true },
  },
  { timestamps: true },
);

economicEvent.pre('validate', function () {
  const hasReleased = this.status === 'released' || this.status === 'revised';
  if (!hasReleased) return;
  if (this.actual == null) {
    this.invalidate(
      'actual',
      'Actual value is required for a released or revised event',
    );
  }
  if (this.releasedAt == null) {
    this.invalidate(
      'releasedAt',
      'Release time is required for a released or revised event',
    );
  }
});

economicEvent.index({ provider: 1, providerEventId: 1 }, { unique: true });
economicEvent.index({ scheduledAt: 1 });
economicEvent.index({ country: 1, importance: 1, scheduledAt: 1 });

export const EconomicEvent = mongoose.model('EconomicEvent', economicEvent);
