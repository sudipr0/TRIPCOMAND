import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";

/**
 * Thin Groq client for the AI Operations Copilot.
 *
 * Deliberately small: one function, one HTTP call, no SDK. Everything the rest
 * of the module needs to know about the provider lives here so tests can mock a
 * single seam (`callGroqChat`) instead of reaching into services.
 *
 * Security rules encoded here:
 *  - The API key is read from `env` at call time and never logged, echoed in an
 *    error message, or attached to a thrown error's `details`.
 *  - Provider response bodies are never forwarded to the client; they are
 *    summarised into a small allow-listed reason code.
 */

/** Groq's OpenAI-compatible endpoint. */
export const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";

export interface GroqChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatRequest {
  messages: GroqChatMessage[];
  /** Upper bound on generated tokens. Conservative by task. */
  maxTokens: number;
  temperature?: number;
  /** Optional abort signal supplied by the caller (in addition to the timeout). */
  signal?: AbortSignal;
}

export interface GroqChatResult {
  content: string;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

/** True when a usable key is configured. A whitespace/placeholder value is not. */
export function isGroqConfigured(): boolean {
  const key = env.GROQ_API_KEY;
  if (typeof key !== "string") return false;
  const trimmed = key.trim();
  // Length < 8 cannot be a real Groq key (they are ~56 chars). This catches
  // leftover placeholders such as `""` or `x` without printing the value.
  return trimmed.length >= 8;
}

/** Model id used for every copilot request. Validated server-side config. */
export function configuredModel(): string {
  return env.GROQ_MODEL;
}

function timeoutMs(): number {
  return env.GROQ_TIMEOUT_MS;
}

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 2; // one retry, transient failures only
const RETRY_BACKOFF_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Read a header without assuming the Headers implementation. */
function headerValue(headers: Headers, name: string): string | null {
  const value = headers.get(name);
  return value && value.trim() ? value.trim() : null;
}

/**
 * Map an HTTP status to a safe, client-facing failure.
 *
 * The message intentionally never contains the provider's body: Groq error
 * payloads can include the offending request (and therefore prompt text).
 */
function failureForStatus(status: number): AppError {
  if (status === 401 || status === 403) {
    return AppError.aiUnavailable(
      "AI drafting is unavailable: the AI provider rejected the configured credentials.",
    );
  }
  if (status === 429) {
    return AppError.aiUnavailable(
      "AI drafting is temporarily rate-limited. Please try again shortly.",
    );
  }
  if (status >= 500) {
    return AppError.aiUnavailable(
      "AI drafting is temporarily unavailable: the AI provider is having problems.",
    );
  }
  if (status === 400 || status === 404 || status === 422) {
    // Usually an unsupported model id or a bad request shape from us.
    return AppError.aiUnavailable(
      "AI drafting is unavailable: the AI provider rejected the request.",
    );
  }
  return AppError.aiUnavailable("AI drafting is temporarily unavailable.");
}

function parseContent(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as { message?: { content?: unknown } } | undefined;
  const content = first?.message?.content;
  if (typeof content !== "string") return null;
  return content;
}

/**
 * Send one chat completion request to Groq and return the generated text.
 *
 * Retries at most once, and only for transient statuses. A timeout is *not*
 * retried: the user is waiting on a request that already burned its budget.
 */
export async function callGroqChat(
  request: GroqChatRequest,
): Promise<GroqChatResult> {
  if (!isGroqConfigured()) {
    throw AppError.aiNotConfigured();
  }
  const apiKey = env.GROQ_API_KEY!.trim();
  const model = configuredModel();

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    // Fresh controller per attempt so a retry gets its own full budget.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs());
    const onExternalAbort = () => controller.abort();
    request.signal?.addEventListener("abort", onExternalAbort);

    try {
      const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          max_tokens: request.maxTokens,
          temperature: request.temperature ?? 0.4,
          // Groq supports this OpenAI field; it keeps output deterministic enough
          // for tests and cheap on the free tier.
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Drain the body without reading it into logs or errors.
        await response.text().catch(() => undefined);
        const error = failureForStatus(response.status);
        const retryAfter = headerValue(response.headers, "retry-after");
        if (TRANSIENT_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
          lastError = error;
          const wait = retryAfter ? Number(retryAfter) * 1000 : RETRY_BACKOFF_MS;
          // Never sleep longer than the remaining tolerance for a bounded retry.
          await sleep(Number.isFinite(wait) ? Math.min(wait, 2000) : RETRY_BACKOFF_MS);
          continue;
        }
        logger.warn(
          { status: response.status, attempt, model },
          "Groq request failed",
        );
        throw error;
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        logger.error({ attempt, model }, "Groq returned a non-JSON body");
        throw AppError.aiUnavailable(
          "AI drafting failed: the AI provider returned an unreadable response.",
        );
      }

      const content = parseContent(payload);
      if (!content || !content.trim()) {
        logger.warn({ attempt, model }, "Groq returned empty content");
        throw AppError.aiUnavailable(
          "AI drafting failed: the AI provider returned an empty draft.",
        );
      }

      const usage = (payload as {
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      }).usage;

      return {
        content: content.trim(),
        model,
        usage: usage
          ? {
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
            }
          : undefined,
      };
    } catch (error) {
      // Re-throw our own typed errors untouched (except for the retry path above).
      if (error instanceof AppError) throw error;

      const aborted = error instanceof Error && error.name === "AbortError";
      if (aborted) {
        logger.warn({ attempt, model }, "Groq request timed out");
        throw AppError.aiUnavailable(
          "AI drafting timed out. Please try again.",
        );
      }

      // Network-level failure (DNS, connection reset, TLS).
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BACKOFF_MS);
        continue;
      }
      logger.error(
        { attempt, model, errName: (error as Error)?.name },
        "Groq request failed at the network layer",
      );
      throw AppError.aiUnavailable(
        "AI drafting is temporarily unavailable: could not reach the AI provider.",
      );
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", onExternalAbort);
    }
  }

  // Unreachable in practice; keeps the compiler honest.
  throw lastError instanceof AppError
    ? lastError
    : AppError.aiUnavailable("AI drafting is temporarily unavailable.");
}
