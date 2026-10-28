import type {
  AICapability,
  AISupplierEmailDraft,
  AITravelerTone,
  AITravelerUpdateDraft,
  AITripSummaryDraft,
} from "@trailcomand/shared";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import {
  buildSupplierEmailContext,
  buildTravelerUpdateContext,
  buildTripSummaryContext,
} from "./ai.context.js";
import {
  buildSupplierEmailMessages,
  buildTravelerUpdateMessages,
  buildTripSummaryMessages,
} from "./ai.prompts.js";
import {
  validateSupplierEmail,
  validateTravelerUpdate,
  validateTripSummary,
} from "./ai.output.js";
import {
  callGroqChat,
  configuredModel,
  isGroqConfigured,
  type GroqChatResult,
} from "./groq.client.js";

/**
 * AI Operations Copilot service.
 *
 * Order of operations for every method is deliberate:
 *   1. capability check   (cheap, no DB)
 *   2. authorization + context load (workspace-scoped, may throw 404/403)
 *   3. provider call      (only reached if 1 and 2 succeeded)
 *   4. output validation
 *
 * The provider is *never* called for an unauthorized or cross-tenant request,
 * and nothing is persisted. Each method returns a draft for a human to review.
 */

/** Conservative per-task output ceilings — keeps free-tier usage predictable. */
export const TOKEN_LIMITS = {
  travelerUpdate: 320,
  supplierEmail: 700,
  tripSummary: 320,
} as const;

/** Injecting the provider call keeps unit tests free of network access. */
export type ChatFn = (request: {
  messages: ReturnType<typeof buildTravelerUpdateMessages>;
  maxTokens: number;
  temperature?: number;
}) => Promise<GroqChatResult>;

export interface AIServiceDeps {
  chat?: ChatFn;
  configured?: () => boolean;
  model?: () => string;
}

function resolveDeps(deps: AIServiceDeps = {}) {
  return {
    chat: deps.chat ?? (callGroqChat as ChatFn),
    configured: deps.configured ?? isGroqConfigured,
    model: deps.model ?? configuredModel,
  };
}

/** Safe capability probe for the UI. Never reveals the key or provider details. */
export function capability(deps: AIServiceDeps = {}): AICapability {
  const { configured } = resolveDeps(deps);
  return configured()
    ? { enabled: true, reason: null }
    : {
        enabled: false,
        reason:
          "AI drafting is not configured for this workspace. Ask your administrator to enable it.",
      };
}

function assertConfigured(configured: () => boolean): void {
  if (!configured()) {
    throw AppError.aiNotConfigured(
      "AI drafting is not configured for this deployment",
    );
  }
}

function logDraft(operation: string, result: GroqChatResult): void {
  // Deliberately narrow: counts and the model id only. No prompt, no output,
  // no traveler or supplier text, and never the key.
  logger.info(
    {
      operation,
      model: result.model,
      promptTokens: result.usage?.promptTokens,
      completionTokens: result.usage?.completionTokens,
    },
    "AI draft generated",
  );
}

export const AIService = {
  capability,

  async draftTravelerUpdate(
    workspaceId: string,
    input: { tripId: string; disruptionId: string; tone: AITravelerTone },
    deps: AIServiceDeps = {},
  ): Promise<AITravelerUpdateDraft> {
    const { chat, configured, model } = resolveDeps(deps);
    assertConfigured(configured);

    // Authorization + tenant scoping happen here, before any provider call.
    const context = await buildTravelerUpdateContext(workspaceId, input);

    const result = await chat({
      messages: buildTravelerUpdateMessages(context),
      maxTokens: TOKEN_LIMITS.travelerUpdate,
      temperature: input.tone === "urgent" ? 0.3 : 0.5,
    });
    logDraft("traveler_update", result);

    const body = validateTravelerUpdate(result.content);

    return {
      operation: "traveler_update",
      body,
      tone: input.tone,
      metadata: {
        model: result.model || model(),
        grounded: context.missingFacts.length === 0,
        missingFacts: context.missingFacts,
        requiresReview: true,
      },
    };
  },

  async draftSupplierEmail(
    workspaceId: string,
    input: { tripId: string; supplierId: string; messageContext: string },
    deps: AIServiceDeps = {},
  ): Promise<AISupplierEmailDraft> {
    const { chat, configured, model } = resolveDeps(deps);
    assertConfigured(configured);

    const context = await buildSupplierEmailContext(workspaceId, input);

    const result = await chat({
      messages: buildSupplierEmailMessages(context),
      maxTokens: TOKEN_LIMITS.supplierEmail,
      temperature: 0.4,
    });
    logDraft("supplier_email", result);

    const { subject, body } = validateSupplierEmail(result.content);

    return {
      operation: "supplier_email",
      subject,
      body,
      // Only the address recorded on the supplier row. Never synthesised.
      recipient: context.supplier.email,
      metadata: {
        model: result.model || model(),
        grounded: context.missingFacts.length === 0,
        missingFacts: context.missingFacts,
        requiresReview: true,
      },
    };
  },

  async summarizeTrip(
    workspaceId: string,
    input: { tripId: string },
    deps: AIServiceDeps = {},
  ): Promise<AITripSummaryDraft> {
    const { chat, configured, model } = resolveDeps(deps);
    assertConfigured(configured);

    const context = await buildTripSummaryContext(workspaceId, input);

    const result = await chat({
      messages: buildTripSummaryMessages(context),
      maxTokens: TOKEN_LIMITS.tripSummary,
      temperature: 0.3,
    });
    logDraft("trip_summary", result);

    const bullets = validateTripSummary(result.content);

    return {
      operation: "trip_summary",
      bullets,
      metadata: {
        model: result.model || model(),
        grounded: context.missingFacts.length === 0,
        missingFacts: context.missingFacts,
        requiresReview: true,
      },
    };
  },
};
