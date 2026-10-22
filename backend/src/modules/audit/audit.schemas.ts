import { z } from "zod";

export const queryAuditLogsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  action: z.string().optional(),
  entityType: z.string().optional(),
});

export type QueryAuditLogsInput = z.infer<typeof queryAuditLogsSchema>;
