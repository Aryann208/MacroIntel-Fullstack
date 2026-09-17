import { z } from 'zod';

const schema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  MONGODB_URI: z
    .string()
    .startsWith('mongodb://')
    .default('mongodb://127.0.0.1:27017/macrointel'),
  REDIS_URL: z
    .url()
    .refine(
      (v) => ['redis:', 'rediss:'].includes(new URL(v).protocol),
      'Use redis:// or rediss://',
    )
    .default('redis://127.0.0.1:6379'),
  QDRANT_URL: z.url().default('http://127.0.0.1:6333'),
  DEPENDENCY_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(10000)
    .default(1500),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  JWT_SECRET: z.string().min(32),
});
export function parseEnv(input: NodeJS.ProcessEnv) {
  const result = schema.safeParse(input);

  if (!result.success) {
    const messages = result.error.issues.map((issue) => {
      return `${issue.path.join('.')}: ${issue.message}`;
    });

    throw new Error(`Invalid API environment:\n${messages.join('\n')}`);
  }

  return result.data;
}

export type ApiEnv = ReturnType<typeof parseEnv>;
