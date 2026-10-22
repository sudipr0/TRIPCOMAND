import { z } from "zod";

export {
  inviteMemberSchema,
  updateMemberRoleSchema,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
} from "@tripchange/shared";

export const acceptInviteSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" }),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
