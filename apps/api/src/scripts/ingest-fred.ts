import mongoose from 'mongoose';
import { parseEnv } from '../env.js';
import { syncFred } from '../modules/macro/fred-sync.js';

const env = parseEnv(process.env);

try {
  await mongoose.connect(env.MONGODB_URI);

  await syncFred(env.FRED_API_KEY);
} catch (error) {
  console.error('FRED ingestion failed', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
