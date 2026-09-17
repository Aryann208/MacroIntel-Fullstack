import mongoose from 'mongoose';

export const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    passwordHash: { type: String, required: true, select: false },
    watchlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MacroSeries' }],
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
