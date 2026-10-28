import { z } from "zod";
import { AI_TRAVELER_TONES } from "@trailcomand/shared";

/**
 * Request validation for the AI Copilot routes.
 *
 * Note what these schemas deliberately do *not* accept: no workspace facts, no
 * trip data, no traveler lists. The only client input is identifiers, an enum,
 * and (for the supplier email) a bounded free-text note. Everything else is read
 * from the database after authorization.
 */

/** Ids come from our own UUID primary keys. */
const idSchema = z.string().trim().uuid("Must be a valid id");

export const draftTravelerUpdateSchema = z
  .object({
    tripId: idSchema,
    disruptionId: idSchema,
    tone: z.enum(AI_TRAVELER_TONES),
  })
  .strict();

export const draftSupplierEmailSchema = z
  .object({
    tripId: idSchema,
    supplierId: idSchema,
    // Untrusted staff input. Bounded so it cannot be used to smuggle a giant
    // payload into the prompt or blow the token budget.
    messageContext: z.string().trim().max(1000).optional().default(""),
  })
  .strict();

export const summarizeTripSchema = z
  .object({
    tripId: idSchema,
  })
  .strict();

export type DraftTravelerUpdateBody = z.infer<typeof draftTravelerUpdateSchema>;
export type DraftSupplierEmailBody = z.infer<typeof draftSupplierEmailSchema>;
export type SummarizeTripBody = z.infer<typeof summarizeTripSchema>;
