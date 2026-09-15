import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
// Load the root environment without a Node CLI flag that Next.js forwards to NODE_OPTIONS.
loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
await import('next/dist/bin/next');
