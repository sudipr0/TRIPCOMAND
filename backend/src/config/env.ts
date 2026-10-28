import { z } from 'zod';
import { resolve } from 'path';
import { config } from 'dotenv';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../.env') });

const isTest = process.env.NODE_ENV === 'test';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  API_URL: z.string().url().default('http://localhost:3001'),
  WEB_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().default(isTest ? 'postgresql://mock:mock@localhost:5432/mock' : ''),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters long').default(isTest ? 'super-secret-test-session-token-12345' : ''),
  REDIS_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@trailcomand.app'),
  // AI Copilot (Phase 12). Server-side only — never forwarded to the client.
  // An empty or whitespace-only value is treated as "not configured" by the AI
  // service; we do not fail startup so unrelated features keep working.
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().trim().min(1).default('llama-3.1-8b-instant'),
  GROQ_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
