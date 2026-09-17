import { z } from 'zod';
export * from './macro.js';
export * from './auth.js';

export const healthSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('macrointel-api'),
  version: z.string().min(1),
  timestamp: z.iso.datetime(),
});
export type HealthResponse = z.infer<typeof healthSchema>;

export const dependencyHealthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  dependencies: z.object({
    mongodb: z.enum(['up', 'down']),
    redis: z.enum(['up', 'down']),
    qdrant: z.enum(['up', 'down']),
  }),
  timestamp: z.iso.datetime(),
});
export type DependencyHealthResponse = z.infer<typeof dependencyHealthSchema>;
