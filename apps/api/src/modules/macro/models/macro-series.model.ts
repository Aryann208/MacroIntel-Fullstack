import mongoose from 'mongoose';

export const category = [
  'inflation',
  'employment',
  'growth',
  'rates',
  'housing',
  'sentiment',
];

const frequency = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];

const seasonalAdjustment = [
  'seasonally-adjusted',
  'not-seasonally-adjusted',
  'unknown',
];

const macroSeriesSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, enum: ['fred'] },
    providerSeriesId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, uppercase: true },
    currency: { type: String, required: true, trim: true, uppercase: true },
    category: { type: String, required: true, trim: true, enum: category },
    frequency: { type: String, required: true, trim: true, enum: frequency },
    unit: { type: String, required: true, trim: true },
    seasonalAdjustment: {
      type: String,
      required: true,
      trim: true,
      enum: seasonalAdjustment,
    },
    isActive: { type: Boolean, default: true, required: true },
    sourceUrl: { type: String, required: true, trim: true },
    providerUpdatedAt: { type: Date },
  },
  { timestamps: true },
);

macroSeriesSchema.index({ provider: 1, providerSeriesId: 1 }, { unique: true });
macroSeriesSchema.index({ country: 1, category: 1, isActive: 1 });

export const MacroSeries = mongoose.model('MacroSeries', macroSeriesSchema);
