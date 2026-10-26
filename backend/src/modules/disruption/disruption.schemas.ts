import { z } from "zod";

export const DISRUPTION_CATEGORIES = [
  "WEATHER",
  "ROUTE_CLOSURE",
  "SUPPLIER_CANCELLATION",
  "TRANSPORT_DELAY",
  "STAFF_UNAVAILABLE",
  "EQUIPMENT_ISSUE",
  "TRAVELER_ISSUE",
  "OTHER",
] as const;

export const DISRUPTION_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const disruptionCategorySchema = z.enum(DISRUPTION_CATEGORIES);
export const disruptionSeveritySchema = z.enum(DISRUPTION_SEVERITIES);

export const createDisruptionSchema = z.object({
  tripId: z.string().trim().min(1, "Trip is required"),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(5000),
  category: disruptionCategorySchema,
  severity: disruptionSeveritySchema.default("HIGH"),
  // Optional link to the affected day; when set, that day becomes PROBLEM.
  itineraryDayId: z.string().uuid().nullable().optional(),
});

const recoveryTaskSchema = z.object({
  title: z.string().trim().min(2).max(200),
  assignedToId: z.string().trim().min(1).nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
});

export const createRecoveryPlanSchema = z.object({
  estimatedCost: z.coerce.number().finite().min(0).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  tasks: z.array(recoveryTaskSchema).min(1).max(5),
});

export const completeTaskSchema = z.object({
  evidenceUrl: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().url().nullable().optional(),
  ),
});

export const listDisruptionsQuerySchema = z.object({
  tripId: z.string().trim().min(1).optional(),
});

export type DisruptionCategory = z.infer<typeof disruptionCategorySchema>;
export type DisruptionSeverity = z.infer<typeof disruptionSeveritySchema>;
export type CreateDisruptionInput = z.infer<typeof createDisruptionSchema>;
export type CreateRecoveryPlanInput = z.infer<typeof createRecoveryPlanSchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
export type ListDisruptionsQuery = z.infer<typeof listDisruptionsQuerySchema>;
