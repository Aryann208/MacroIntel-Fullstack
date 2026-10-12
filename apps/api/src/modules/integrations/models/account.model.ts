import mongoose from 'mongoose';

const account = new mongoose.Schema(
  {
    login: { type: String, required: true },
    server: { type: String, required: true },
    historySyncedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

account.index({ login: 1, server: 1 });

export const Account = mongoose.model('Account', account);
