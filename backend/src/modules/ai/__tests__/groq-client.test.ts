import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Groq client tests. `fetch` is replaced with a stub, so no request ever leaves
 * the machine and no real API key is needed.
 *
 * The environment module is mocked per test so we can exercise both the
 * "configured" and "not configured" paths without touching a real `.env`.
 */

// GROQ_API_KEY is widened to `string | undefined` on purpose: one test sets it
// to `undefined` to exercise the "key absent" path, which the real env schema
// permits. Typing it as `string` made that assignment a compile error.
const envState: {
  GROQ_API_KEY: string | undefined;
  GROQ_MODEL: string;
  GROQ_TIMEOUT_MS: number;
} = {
  GROQ_API_KEY: "gsk_test_key_for_unit_tests_only",
  GROQ_MODEL: "llama-3.1-8b-instant",
  GROQ_TIMEOUT_MS: 30_000,
};

vi.mock("../../../config/env.js", () => ({
  get env() {
    return envState;
  },
}));

const { AppError } = await import("../../../lib/errors.js");
const { GROQ_CHAT_COMPLETIONS_URL, callGroqChat, isGroqConfigured } =
  await import("../groq.client.js");

const messages = [
  { role: "system" as const, content: "system" },
  { role: "user" as const, content: "user" },
];

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const okBody = {
  choices: [{ message: { role: "assistant", content: "Hello travelers." } }],
  usage: { prompt_tokens: 120, completion_tokens: 12 },
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  envState.GROQ_API_KEY = "gsk_test_key_for_unit_tests_only";
  envState.GROQ_MODEL = "llama-3.1-8b-instant";
  envState.GROQ_TIMEOUT_MS = 30_000;
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("configuration detection", () => {
  it("treats a missing key as not configured", () => {
    envState.GROQ_API_KEY = undefined;
    expect(isGroqConfigured()).toBe(false);
  });

  it("treats an empty or placeholder value as not configured", () => {
    envState.GROQ_API_KEY = "";
    expect(isGroqConfigured()).toBe(false);
    envState.GROQ_API_KEY = "   ";
    expect(isGroqConfigured()).toBe(false);
    // A leftover placeholder must not be mistaken for a credential.
    envState.GROQ_API_KEY = '""';
    expect(isGroqConfigured()).toBe(false);
  });

  it("refuses to call the provider when unconfigured", async () => {
    envState.GROQ_API_KEY = "";
    await expect(
      callGroqChat({ messages, maxTokens: 100 }),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "AI_NOT_CONFIGURED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("successful call", () => {
  it("posts to the OpenAI-compatible endpoint with the configured model", async () => {
    fetchMock.mockResolvedValue(jsonResponse(okBody));

    const result = await callGroqChat({
      messages,
      maxTokens: 256,
      temperature: 0.3,
    });

    expect(result.content).toBe("Hello travelers.");
    expect(result.model).toBe("llama-3.1-8b-instant");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(GROQ_CHAT_COMPLETIONS_URL);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(
      "Bearer gsk_test_key_for_unit_tests_only",
    );
    const body = JSON.parse(init.body);
    expect(body.model).toBe("llama-3.1-8b-instant");
    expect(body.max_tokens).toBe(256);
    expect(body.temperature).toBe(0.3);
    expect(body.messages).toEqual(messages);
  });
});

describe("provider failures", () => {
  it("maps 401 to a safe credential error without echoing the key", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            message: "Invalid API Key: gsk_test_key_for_unit_tests_only",
          },
        },
        { status: 401 },
      ),
    );

    const error = await callGroqChat({ messages, maxTokens: 100 }).catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(503);
    expect(error.message).not.toContain("gsk_test_key");
    expect(JSON.stringify(error)).not.toContain("gsk_test_key");
    // No retry on auth failure: it cannot succeed.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once on 429 and reports a rate-limit message", async () => {
    fetchMock.mockResolvedValue(
      new Response("slow down", {
        status: 429,
        headers: { "retry-after": "0" },
      }),
    );

    await expect(
      callGroqChat({ messages, maxTokens: 100 }),
    ).rejects.toMatchObject({ statusCode: 503 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("succeeds when the retry after a 429 works", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(jsonResponse(okBody));

    const result = await callGroqChat({ messages, maxTokens: 100 });
    expect(result.content).toBe("Hello travelers.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once on 5xx and then fails safely", async () => {
    fetchMock.mockResolvedValue(
      new Response("internal provider detail: stack trace", { status: 503 }),
    );

    const error = await callGroqChat({ messages, maxTokens: 100 }).catch(
      (e) => e,
    );
    expect(error.statusCode).toBe(503);
    expect(error.message).not.toContain("stack trace");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 400 (unsupported model / bad request)", async () => {
    fetchMock.mockResolvedValue(new Response("bad model", { status: 400 }));

    await expect(
      callGroqChat({ messages, maxTokens: 100 }),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles malformed JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>not json</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    await expect(
      callGroqChat({ messages, maxTokens: 100 }),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });

  it("handles an empty generated message", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: "   " } }] }),
    );

    await expect(
      callGroqChat({ messages, maxTokens: 100 }),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });

  it("handles a response with no choices", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [] }));
    await expect(
      callGroqChat({ messages, maxTokens: 100 }),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });

  it("retries a network failure and then reports unavailability", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      callGroqChat({ messages, maxTokens: 100 }),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts on timeout instead of hanging", async () => {
    envState.GROQ_TIMEOUT_MS = 20;
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );

    const started = Date.now();
    await expect(
      callGroqChat({ messages, maxTokens: 100 }),
    ).rejects.toMatchObject({ statusCode: 503 });
    // One attempt, not a retry loop: the budget is already spent.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
