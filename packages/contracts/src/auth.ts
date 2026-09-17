import z from 'zod';

export const registerRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
});

export const registerResponseSchema = z.object({
  id: z.string(),
  email: z.email(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
});

export const loginResponseSchema = z.object({
  id: z.string(),
  email: z.email(),
  token: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const currentUserResponseSchema = z.object({
  id: z.string(),
  email: z.email(),
});

export type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>;
