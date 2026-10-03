import mongoose from 'mongoose';
import { parseEnv } from '../env.js';
import { syncFred } from '../modules/macro/fred-sync.js';

const env = parseEnv(process.env);

if (!env.FRED_API_KEY) {
  throw new Error('FRED_API_KEY is required to ingest FRED data');
}

try {
  await mongoose.connect(env.MONGODB_URI);

  await syncFred(env.FRED_API_KEY);
} catch (error) {
  console.error('FRED ingestion failed', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
