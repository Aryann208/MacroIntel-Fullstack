import mongoose from 'mongoose';

const macroObservation = new mongoose.Schema(
  {
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'MacroSeries',
    },
    observedAt: { type: Date, required: true },
    value: { type: Number, required: true },
    vintageAt: { type: Date, required: true },
    isLatestVintage: { type: Boolean, required: true, default: true },
    provider: { type: String, enum: ['fred'], required: true },
    providerUpdatedAt: { type: Date },
    ingestedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

macroObservation.index(
  { seriesId: 1, observedAt: 1, vintageAt: 1 },
  { unique: true },
);

export const MacroObservation = mongoose.model(
  'MacroObservation',
  macroObservation,
);
