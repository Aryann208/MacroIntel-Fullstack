import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
// Load the root environment without a Node CLI flag that Next.js forwards to NODE_OPTIONS.
const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) {
  loadEnvFile(envFile);
}
await import('next/dist/bin/next');
