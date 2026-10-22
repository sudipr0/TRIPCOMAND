import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  firstName: z.string().trim().min(1, { message: 'First name is required' }),
  lastName: z.string().trim().min(1, { message: 'Last name is required' }),
  workspaceName: z.string().trim().min(2, { message: 'Workspace name must be at least 2 characters' }).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email address' }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Reset token is required' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
});

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, { message: 'Workspace name must be at least 2 characters' }),
  slug: z
    .string()
    .trim()
    .min(2, { message: 'Workspace slug must be at least 2 characters' })
    .max(50, { message: 'Workspace slug must not exceed 50 characters' })
    .regex(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and dashes' }),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2, { message: 'Workspace name must be at least 2 characters' }).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email address' }),
  roleId: z.string().uuid({ message: 'Valid Role ID is required' }),
});

export const updateMemberRoleSchema = z.object({
  roleId: z.string().uuid({ message: 'Valid Role ID is required' }),
});

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, { message: 'Role name must be at least 2 characters' }),
  description: z.string().trim().optional(),
  permissionIds: z.array(z.string().uuid()).min(1, { message: 'At least one permission is required' }),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2, { message: 'Role name must be at least 2 characters' }).optional(),
  description: z.string().trim().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const STAFF_TYPES = [
  'GUIDE',
  'PORTER',
  'COOK',
  'DRIVER',
  'ASSISTANT',
  'OTHER',
] as const;

export const STAFF_STATUSES = [
  'AVAILABLE',
  'ASSIGNED',
  'ON_LEAVE',
  'UNAVAILABLE',
  'INACTIVE',
] as const;

export const staffTypeSchema = z.enum(STAFF_TYPES);
export const staffStatusSchema = z.enum(STAFF_STATUSES);

export const createStaffSchema = z.object({
  staffType: staffTypeSchema,
  fullName: z.string().trim().min(2, { message: 'Full name must be at least 2 characters' }),
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email address' }).optional(),
  phone: z.string().trim().min(5, { message: 'Phone must be at least 5 characters' }).optional(),
  whatsapp: z.string().trim().min(5, { message: 'WhatsApp must be at least 5 characters' }).optional(),
  photoUrl: z.string().trim().url({ message: 'Photo URL must be a valid URL' }).optional(),
  licenseNumber: z.string().trim().optional(),
  licenseExpiry: z.coerce.date().optional(),
  languages: z.array(z.string().trim().min(1)).max(20).optional(),
  certifications: z.array(z.string().trim().min(1)).max(50).optional(),
  experienceYears: z.coerce.number().int().min(0).max(80).optional(),
  experienceLevel: z.string().trim().optional(),
  preferredRoutes: z.array(z.string().trim().min(1)).max(50).optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  status: staffStatusSchema.optional(),
  notes: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateStaffSchema = z
  .object({
    staffType: staffTypeSchema.optional(),
    fullName: z.string().trim().min(2, { message: 'Full name must be at least 2 characters' }).optional(),
    email: z.string().trim().toLowerCase().email({ message: 'Invalid email address' }).nullable().optional(),
    phone: z.string().trim().min(5, { message: 'Phone must be at least 5 characters' }).nullable().optional(),
    whatsapp: z.string().trim().min(5, { message: 'WhatsApp must be at least 5 characters' }).nullable().optional(),
    photoUrl: z.string().trim().url({ message: 'Photo URL must be a valid URL' }).nullable().optional(),
    licenseNumber: z.string().trim().nullable().optional(),
    licenseExpiry: z.coerce.date().nullable().optional(),
    languages: z.array(z.string().trim().min(1)).max(20).optional(),
    certifications: z.array(z.string().trim().min(1)).max(50).optional(),
    experienceYears: z.coerce.number().int().min(0).max(80).nullable().optional(),
    experienceLevel: z.string().trim().nullable().optional(),
    preferredRoutes: z.array(z.string().trim().min(1)).max(50).optional(),
    emergencyContactName: z.string().trim().nullable().optional(),
    emergencyContactPhone: z.string().trim().nullable().optional(),
    status: staffStatusSchema.optional(),
    notes: z.string().trim().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const listStaffSchema = z.object({
  staffType: staffTypeSchema.optional(),
  status: staffStatusSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  includeDeleted: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createStaffDocumentSchema = z.object({
  documentType: z.string().trim().min(2, { message: 'Document type must be at least 2 characters' }),
  title: z.string().trim().min(1, { message: 'Title is required' }),
  fileUrl: z.string().trim().url({ message: 'File URL must be a valid URL' }),
  fileName: z.string().trim().optional(),
  fileSize: z.coerce.number().int().min(0).optional(),
  mimeType: z.string().trim().optional(),
  expiresAt: z.coerce.date().optional(),
  notes: z.string().trim().optional(),
});

export const verifyStaffDocumentSchema = z.object({
  verified: z.boolean(),
  notes: z.string().trim().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type ListStaffInput = z.infer<typeof listStaffSchema>;
export type CreateStaffDocumentInput = z.infer<typeof createStaffDocumentSchema>;
export type VerifyStaffDocumentInput = z.infer<typeof verifyStaffDocumentSchema>;
export type StaffType = (typeof STAFF_TYPES)[number];
export type StaffStatus = (typeof STAFF_STATUSES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Destination
// ─────────────────────────────────────────────────────────────────────────────
export const createDestinationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Destination name must be at least 2 characters' })
    .max(120, { message: 'Destination name must be at most 120 characters' }),
  region: z.string().trim().max(120).nullable().optional(),
  country: z.string().trim().min(2).max(120).default('Nepal'),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  altitude: z.coerce.number().int().min(-500).max(9000).nullable().optional(),
  description: z.string().trim().nullable().optional(),
  imageUrl: z
    .string()
    .trim()
    .url({ message: 'Image URL must be a valid URL' })
    .nullable()
    .optional(),
});
export const updateDestinationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Destination name must be at least 2 characters' })
      .max(120, { message: 'Destination name must be at most 120 characters' })
      .optional(),
    region: z.string().trim().max(120).nullable().optional(),
    country: z.string().trim().min(2).max(120).optional(),
    latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
    longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
    altitude: z.coerce.number().int().min(-500).max(9000).nullable().optional(),
    description: z.string().trim().nullable().optional(),
    imageUrl: z
      .string()
      .trim()
      .url({ message: 'Image URL must be a valid URL' })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
export const listDestinationsQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  region: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type CreateDestinationInput = z.infer<typeof createDestinationSchema>;
export type UpdateDestinationInput = z.infer<typeof updateDestinationSchema>;
export type ListDestinationsQuery = z.infer<typeof listDestinationsQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Trek templates
// ─────────────────────────────────────────────────────────────────────────────
export const TREK_DIFFICULTIES = [
  'EASY',
  'MODERATE',
  'CHALLENGING',
  'STRENUOUS',
  'EXTREME',
] as const;
export const TEMPLATE_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export const trekDifficultySchema = z.enum(TREK_DIFFICULTIES);
export const templateStatusSchema = z.enum(TEMPLATE_STATUSES);

export const createTrekTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Template name must be at least 2 characters' })
    .max(200, { message: 'Template name must be at most 200 characters' }),
  code: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().nullable().optional(),
  region: z.string().trim().max(120).nullable().optional(),
  difficulty: trekDifficultySchema,
  durationDays: z.coerce.number().int().min(1).max(365),
  maxAltitude: z.coerce.number().int().min(-500).max(9000).nullable().optional(),
  bestSeasons: z.array(z.string().trim().min(1)).max(12).optional(),
  basePrice: z.coerce.number().min(0).nullable().optional(),
  basePriceCurrency: z.string().trim().min(2).max(10).optional(),
  requiredDocuments: z.array(z.string().trim().min(1)).max(50).optional(),
  packingList: z.unknown().optional(),
  preparationNotes: z.string().trim().nullable().optional(),
  inclusions: z.array(z.string().trim().min(1)).max(100).optional(),
  exclusions: z.array(z.string().trim().min(1)).max(100).optional(),
  terms: z.string().trim().nullable().optional(),
  destinationId: z.string().uuid({ message: 'Destination id must be a valid UUID' }).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  days: z
    .array(
      z.object({
        dayNumber: z.coerce.number().int().min(1),
        title: z.string().trim().min(1, { message: 'Day title is required' }).max(200),
        description: z.string().trim().nullable().optional(),
        startLocation: z.string().trim().nullable().optional(),
        endLocation: z.string().trim().nullable().optional(),
        altitude: z.coerce.number().int().min(-500).max(9000).nullable().optional(),
        walkingHours: z.coerce.number().min(0).max(24).nullable().optional(),
        accommodation: z.string().trim().nullable().optional(),
        meals: z.array(z.string().trim().min(1)).max(20).optional(),
        activities: z.array(z.string().trim().min(1)).max(50).optional(),
      }),
    )
    .max(365)
    .optional(),
});
export const updateTrekTemplateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Template name must be at least 2 characters' })
      .max(200)
      .optional(),
    code: z.string().trim().max(60).nullable().optional(),
    description: z.string().trim().nullable().optional(),
    region: z.string().trim().max(120).nullable().optional(),
    difficulty: trekDifficultySchema.optional(),
    durationDays: z.coerce.number().int().min(1).max(365).optional(),
    maxAltitude: z.coerce.number().int().min(-500).max(9000).nullable().optional(),
    bestSeasons: z.array(z.string().trim().min(1)).max(12).optional(),
    basePrice: z.coerce.number().min(0).nullable().optional(),
    basePriceCurrency: z.string().trim().min(2).max(10).optional(),
    requiredDocuments: z.array(z.string().trim().min(1)).max(50).optional(),
    packingList: z.unknown().optional(),
    preparationNotes: z.string().trim().nullable().optional(),
    inclusions: z.array(z.string().trim().min(1)).max(100).optional(),
    exclusions: z.array(z.string().trim().min(1)).max(100).optional(),
    terms: z.string().trim().nullable().optional(),
    destinationId: z.string().uuid({ message: 'Destination id must be a valid UUID' }).nullable().optional(),
    status: templateStatusSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
export const listTrekTemplatesQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  status: templateStatusSchema.optional(),
  difficulty: trekDifficultySchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const createTrekTemplateDaySchema = z.object({
  dayNumber: z.coerce.number().int().min(1, { message: 'Day number must be at least 1' }),
  title: z.string().trim().min(1, { message: 'Day title is required' }).max(200),
  description: z.string().trim().nullable().optional(),
  startLocation: z.string().trim().nullable().optional(),
  endLocation: z.string().trim().nullable().optional(),
  altitude: z.coerce.number().int().min(-500).max(9000).nullable().optional(),
  walkingHours: z.coerce.number().min(0).max(24).nullable().optional(),
  accommodation: z.string().trim().nullable().optional(),
  meals: z.array(z.string().trim().min(1)).max(20).optional(),
  activities: z.array(z.string().trim().min(1)).max(50).optional(),
});
export const updateTrekTemplateDaySchema = z
  .object({
    dayNumber: z.coerce.number().int().min(1).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().nullable().optional(),
    startLocation: z.string().trim().nullable().optional(),
    endLocation: z.string().trim().nullable().optional(),
    altitude: z.coerce.number().int().min(-500).max(9000).nullable().optional(),
    walkingHours: z.coerce.number().min(0).max(24).nullable().optional(),
    accommodation: z.string().trim().nullable().optional(),
    meals: z.array(z.string().trim().min(1)).max(20).optional(),
    activities: z.array(z.string().trim().min(1)).max(50).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
export const reorderTrekTemplateDaysSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid({ message: 'Day id must be a valid UUID' }),
        dayNumber: z.coerce.number().int().min(1),
      }),
    )
    .min(1),
});
export type CreateTrekTemplateInput = z.infer<typeof createTrekTemplateSchema>;
export type UpdateTrekTemplateInput = z.infer<typeof updateTrekTemplateSchema>;
export type ListTrekTemplatesQuery = z.infer<typeof listTrekTemplatesQuerySchema>;
export type CreateTrekTemplateDayInput = z.infer<typeof createTrekTemplateDaySchema>;
export type UpdateTrekTemplateDayInput = z.infer<typeof updateTrekTemplateDaySchema>;
export type ReorderTrekTemplateDaysInput = z.infer<typeof reorderTrekTemplateDaysSchema>;
export type TrekDifficulty = (typeof TREK_DIFFICULTIES)[number];
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Agency
// ─────────────────────────────────────────────────────────────────────────────
export const updateAgencyProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    contactEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email({ message: 'Invalid email address' })
      .nullable()
      .optional(),
    contactPhone: z.string().trim().min(5).max(40).nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    taxId: z.string().trim().max(80).nullable().optional(),
    website: z
      .string()
      .trim()
      .url({ message: 'Website must be a valid URL' })
      .nullable()
      .optional(),
    logoUrl: z
      .string()
      .trim()
      .url({ message: 'Logo URL must be a valid URL' })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
export const updateAgencySettingsSchema = z
  .object({
    currency: z.string().trim().min(2).max(10).optional(),
    timezone: z.string().trim().min(2).max(60).optional(),
    locale: z.string().trim().min(2).max(20).optional(),
    businessPolicies: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
export type UpdateAgencyProfileInput = z.infer<typeof updateAgencyProfileSchema>;
export type UpdateAgencySettingsInput = z.infer<typeof updateAgencySettingsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Customer
// ─────────────────────────────────────────────────────────────────────────────
export const CUSTOMER_TYPES = [
  'INDIVIDUAL',
  'GROUP',
  'CORPORATE',
  'AGENT',
] as const;
export const customerTypeSchema = z.enum(CUSTOMER_TYPES);

export const createCustomerSchema = z.object({
  customerType: customerTypeSchema.default('INDIVIDUAL'),
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'Full name must be at least 2 characters' })
    .max(200, { message: 'Full name must be at most 200 characters' }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Invalid email address' })
    .nullable()
    .optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  whatsapp: z.string().trim().max(40).nullable().optional(),
  nationality: z.string().trim().max(120).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  dateOfBirth: z
    .string()
    .datetime({ message: 'Date of birth must be an ISO datetime' })
    .nullable()
    .optional(),
  emergencyContactName: z.string().trim().max(200).nullable().optional(),
  emergencyContactPhone: z.string().trim().max(40).nullable().optional(),
  source: z.string().trim().max(120).nullable().optional(),
  tags: z.array(z.string().trim().min(1)).max(50).optional(),
  notes: z.string().trim().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateCustomerSchema = z
  .object({
    customerType: customerTypeSchema.optional(),
    fullName: z
      .string()
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters' })
      .max(200)
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email({ message: 'Invalid email address' })
      .nullable()
      .optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    whatsapp: z.string().trim().max(40).nullable().optional(),
    nationality: z.string().trim().max(120).nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    dateOfBirth: z
      .string()
      .datetime({ message: 'Date of birth must be an ISO datetime' })
      .nullable()
      .optional(),
    emergencyContactName: z.string().trim().max(200).nullable().optional(),
    emergencyContactPhone: z.string().trim().max(40).nullable().optional(),
    source: z.string().trim().max(120).nullable().optional(),
    tags: z.array(z.string().trim().min(1)).max(50).optional(),
    notes: z.string().trim().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const listCustomersQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  customerType: customerTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─────────────────────────────────────────────────────────────────────────────
// Inquiry
// ─────────────────────────────────────────────────────────────────────────────
export const INQUIRY_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'QUOTED',
  'NEGOTIATING',
  'WON',
  'LOST',
  'DISQUALIFIED',
] as const;
export const INQUIRY_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const inquiryStatusSchema = z.enum(INQUIRY_STATUSES);
export const inquiryPrioritySchema = z.enum(INQUIRY_PRIORITIES);

export const createInquirySchema = z.object({
  customerId: z.string().uuid({ message: 'Customer id must be a valid UUID' }),
  trekInterest: z.string().trim().max(200).nullable().optional(),
  destinationText: z.string().trim().max(200).nullable().optional(),
  preferredStart: z
    .string()
    .datetime({ message: 'Preferred start must be an ISO datetime' })
    .nullable()
    .optional(),
  preferredEnd: z
    .string()
    .datetime({ message: 'Preferred end must be an ISO datetime' })
    .nullable()
    .optional(),
  flexibleDates: z.boolean().optional(),
  groupSize: z.coerce.number().int().min(1).max(500).optional(),
  adults: z.coerce.number().int().min(0).max(500).optional(),
  children: z.coerce.number().int().min(0).max(500).optional(),
  specialRequirements: z.string().trim().max(2000).nullable().optional(),
  budgetExpectation: z.coerce.number().min(0).nullable().optional(),
  budgetCurrency: z.string().trim().min(2).max(10).optional(),
  priority: inquiryPrioritySchema.optional(),
  source: z.string().trim().max(120).nullable().optional(),
  nextFollowUpAt: z
    .string()
    .datetime({ message: 'Next follow up must be an ISO datetime' })
    .nullable()
    .optional(),
  notes: z.string().trim().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateInquirySchema = z
  .object({
    trekInterest: z.string().trim().max(200).nullable().optional(),
    destinationText: z.string().trim().max(200).nullable().optional(),
    preferredStart: z.string().datetime().nullable().optional(),
    preferredEnd: z.string().datetime().nullable().optional(),
    flexibleDates: z.boolean().optional(),
    groupSize: z.coerce.number().int().min(1).max(500).optional(),
    adults: z.coerce.number().int().min(0).max(500).optional(),
    children: z.coerce.number().int().min(0).max(500).optional(),
    specialRequirements: z.string().trim().max(2000).nullable().optional(),
    budgetExpectation: z.coerce.number().min(0).nullable().optional(),
    budgetCurrency: z.string().trim().min(2).max(10).optional(),
    status: inquiryStatusSchema.optional(),
    priority: inquiryPrioritySchema.optional(),
    source: z.string().trim().max(120).nullable().optional(),
    assignedToId: z.string().uuid().nullable().optional(),
    nextFollowUpAt: z.string().datetime().nullable().optional(),
    lastContactedAt: z.string().datetime().nullable().optional(),
    lostReason: z.string().trim().max(500).nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const listInquiriesQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  status: inquiryStatusSchema.optional(),
  priority: inquiryPrioritySchema.optional(),
  assignedToId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const logInquiryActivitySchema = z.object({
  activityType: z
    .string()
    .trim()
    .min(2, { message: 'Activity type must be at least 2 characters' })
    .max(60),
  description: z
    .string()
    .trim()
    .min(1, { message: 'Description is required' })
    .max(1000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
export type UpdateInquiryInput = z.infer<typeof updateInquirySchema>;
export type ListInquiriesQuery = z.infer<typeof listInquiriesQuerySchema>;
export type LogInquiryActivityInput = z.infer<typeof logInquiryActivitySchema>;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
export type InquiryPriority = (typeof INQUIRY_PRIORITIES)[number];

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Quotation
// ─────────────────────────────────────────────────────────────────────────────
export const QUOTATION_STATUSES = [
  'DRAFT',
  'SENT',
  'VIEWED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'REVISED',
] as const;
export const quotationStatusSchema = z.enum(QUOTATION_STATUSES);
export const quotationLineItemInputSchema = z.object({
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive({ message: 'Quantity must be greater than 0' }),
  unit: z.string().trim().min(1).max(30),
  unitPrice: z.coerce.number().min(0, { message: 'Unit price must be >= 0' }),
  isOptional: z.boolean().default(false),
});
export const createQuotationSchema = z
  .object({
    inquiryId: z.string().uuid().optional(),
    customerId: z.string().uuid({ message: 'Customer id must be a valid UUID' }),
    trekName: z.string().trim().min(1).max(200),
    startDate: z.string().datetime({ message: 'Start date must be an ISO datetime' }),
    endDate: z.string().datetime({ message: 'End date must be an ISO datetime' }),
    groupSize: z.coerce.number().int().min(1).max(500),
    discount: z.coerce.number().min(0).optional(),
    tax: z.coerce.number().min(0).optional(),
    currency: z.string().trim().min(2).max(10).default('NPR'),
    inclusions: z.array(z.string().trim().max(300)).optional(),
    exclusions: z.array(z.string().trim().max(300)).optional(),
    terms: z.string().trim().max(5000).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    validUntil: z.string().datetime().nullable().optional(),
    lineItems: z.array(quotationLineItemInputSchema).min(1, {
      message: 'At least one line item is required',
    }),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });
export const updateQuotationSchema = z
  .object({
    trekName: z.string().trim().min(1).max(200).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    groupSize: z.coerce.number().int().min(1).max(500).optional(),
    discount: z.coerce.number().min(0).optional(),
    tax: z.coerce.number().min(0).optional(),
    currency: z.string().trim().min(2).max(10).optional(),
    inclusions: z.array(z.string().trim().max(300)).optional(),
    exclusions: z.array(z.string().trim().max(300)).optional(),
    terms: z.string().trim().max(5000).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    validUntil: z.string().datetime().nullable().optional(),
    lineItems: z.array(quotationLineItemInputSchema).min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .refine((data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
  }, { message: 'End date must be after start date', path: ['endDate'] });
export const listQuotationsQuerySchema = z.object({
  status: quotationStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  inquiryId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const sendQuotationSchema = z.object({}).strict();
export const acceptQuotationSchema = z.object({}).strict();
export const rejectQuotationSchema = z.object({
  reason: z.string().trim().min(1, { message: 'Rejection reason is required' }).max(500),
});
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];
export type QuotationLineItemInput = z.infer<typeof quotationLineItemInputSchema>;
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
export type ListQuotationsQuery = z.infer<typeof listQuotationsQuerySchema>;
export type RejectQuotationInput = z.infer<typeof rejectQuotationSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Booking
// ─────────────────────────────────────────────────────────────────────────────
export const BOOKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const;
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export const createBookingSchemaFromQuotation = z.object({
  quotationId: z.string().uuid({ message: 'Quotation id must be a valid UUID' }),
});
export const updateBookingSchema = z
  .object({
    trekName: z.string().trim().min(1).max(200).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    groupSize: z.coerce.number().int().min(1).max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .refine((data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
  }, { message: 'End date must be after start date', path: ['endDate'] });
export const listBookingsQuerySchema = z.object({
  status: bookingStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(1, { message: 'Cancellation reason is required' }).max(500),
});
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type CreateBookingFromQuotationInput = z.infer<typeof createBookingSchemaFromQuotation>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Payment
// ─────────────────────────────────────────────────────────────────────────────
export const PAYMENT_TYPES = [
  'DEPOSIT',
  'INSTALLMENT',
  'FINAL_PAYMENT',
  'REFUND',
  'ADJUSTMENT',
] as const;
export const paymentTypeSchema = z.enum(PAYMENT_TYPES);
export const createPaymentSchema = z.object({
  amount: z.coerce.number({ message: 'Amount is required' }),
  currency: z.string().trim().min(2).max(10).default('NPR'),
  paymentType: paymentTypeSchema,
  method: z.string().trim().max(60).nullable().optional(),
  reference: z.string().trim().max(120).nullable().optional(),
  receivedAt: z.string().datetime({ message: 'Received at must be an ISO datetime' }),
  evidence: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export const listPaymentsQuerySchema = z.object({
  bookingId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type PaymentType = (typeof PAYMENT_TYPES)[number];
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Trip
// ─────────────────────────────────────────────────────────────────────────────
export const TRIP_STATUSES = [
  'PLANNING',
  'READY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export const ITINERARY_VERSION_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const tripStatusSchema = z.enum(TRIP_STATUSES);
export const itineraryVersionStatusSchema = z.enum(ITINERARY_VERSION_STATUSES);
export const changeTripStatusSchema = z.object({
  status: tripStatusSchema,
});
export const createTripSchema = z
  .object({
    bookingId: z.string().uuid().optional(),
    customerId: z.string().uuid({ message: 'Customer id must be a valid UUID' }),
    name: z.string().trim().min(1).max(200),
    startDate: z.string().datetime({ message: 'Start date must be an ISO datetime' }),
    endDate: z.string().datetime({ message: 'End date must be an ISO datetime' }),
    groupSize: z.coerce.number().int().min(1).max(500),
    operationsManagerId: z.string().uuid().nullable().optional(),
    leadGuideId: z.string().uuid().nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });
export const updateTripSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    groupSize: z.coerce.number().int().min(1).max(500).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
export const listTripsQuerySchema = z.object({
  status: tripStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const assignTripSchema = z
  .object({
    operationsManagerId: z.string().uuid().nullable().optional(),
    leadGuideId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one assignee must be provided',
  });
export type TripStatus = (typeof TRIP_STATUSES)[number];
export type ItineraryVersionStatus = (typeof ITINERARY_VERSION_STATUSES)[number];
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type ListTripsQuery = z.infer<typeof listTripsQuerySchema>;
export type AssignTripInput = z.infer<typeof assignTripSchema>;
export type ChangeTripStatusInput = z.infer<typeof changeTripStatusSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Trip Traveler
// ─────────────────────────────────────────────────────────────────────────────
export const tripTravelerBaseFields = {
  customerId: z.string().uuid().nullable().optional(),
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  nationality: z.string().trim().max(80).nullable().optional(),
  dateOfBirth: z.string().datetime().nullable().optional(),
  passportNumber: z.string().trim().max(40).nullable().optional(),
  passportExpiry: z.string().datetime().nullable().optional(),
  emergencyContactName: z.string().trim().max(200).nullable().optional(),
  emergencyContactPhone: z.string().trim().max(40).nullable().optional(),
  dietaryRequirements: z.string().trim().max(1000).nullable().optional(),
  medicalNotes: z.string().trim().max(2000).nullable().optional(),
  insuranceProvider: z.string().trim().max(200).nullable().optional(),
  insurancePolicyNumber: z.string().trim().max(60).nullable().optional(),
  isTripLeader: z.boolean().default(false),
  notes: z.string().trim().max(2000).nullable().optional(),
};
export const createTripTravelerSchema = z.object(tripTravelerBaseFields);
export const updateTripTravelerSchema = z
  .object({
    customerId: z.string().uuid().nullable().optional(),
    fullName: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    nationality: z.string().trim().max(80).nullable().optional(),
    dateOfBirth: z.string().datetime().nullable().optional(),
    passportNumber: z.string().trim().max(40).nullable().optional(),
    passportExpiry: z.string().datetime().nullable().optional(),
    emergencyContactName: z.string().trim().max(200).nullable().optional(),
    emergencyContactPhone: z.string().trim().max(40).nullable().optional(),
    dietaryRequirements: z.string().trim().max(1000).nullable().optional(),
    medicalNotes: z.string().trim().max(2000).nullable().optional(),
    insuranceProvider: z.string().trim().max(200).nullable().optional(),
    insurancePolicyNumber: z.string().trim().max(60).nullable().optional(),
    isTripLeader: z.boolean().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
export const bulkAddTravelersSchema = z.object({
  items: z.array(createTripTravelerSchema).min(1).max(50),
});
export type CreateTripTravelerInput = z.infer<typeof createTripTravelerSchema>;
export type UpdateTripTravelerInput = z.infer<typeof updateTripTravelerSchema>;
export type BulkAddTravelersInput = z.infer<typeof bulkAddTravelersSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Itinerary
// ─────────────────────────────────────────────────────────────────────────────
export const itineraryDayBaseFields = {
  dayNumber: z.coerce.number().int().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(3000).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  altitude: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  startTime: z.string().trim().max(10).nullable().optional(),
  endTime: z.string().trim().max(10).nullable().optional(),
  walkingHours: z.coerce.number().min(0).max(24).nullable().optional(),
  accommodation: z.string().trim().max(200).nullable().optional(),
  meals: z.array(z.string().trim().max(40)).optional(),
  activities: z.array(z.string().trim().max(120)).optional(),
  clientVisible: z.boolean().default(true),
  internalNotes: z.string().trim().max(2000).nullable().optional(),
};
export const createItineraryDaySchema = z.object(itineraryDayBaseFields);
export const updateItineraryDaySchema = z
  .object({
    dayNumber: z.coerce.number().int().min(1).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(3000).nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
    altitude: z.coerce.number().int().min(0).max(10000).nullable().optional(),
    startTime: z.string().trim().max(10).nullable().optional(),
    endTime: z.string().trim().max(10).nullable().optional(),
    walkingHours: z.coerce.number().min(0).max(24).nullable().optional(),
    accommodation: z.string().trim().max(200).nullable().optional(),
    meals: z.array(z.string().trim().max(40)).optional(),
    activities: z.array(z.string().trim().max(120)).optional(),
    clientVisible: z.boolean().optional(),
    internalNotes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
export const reorderItineraryDaysSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        dayNumber: z.coerce.number().int().min(1),
      }),
    )
    .min(1),
});
export const populateFromTemplateSchema = z.object({
  templateId: z.string().uuid({ message: 'Template id must be a valid UUID' }),
});
export const publishItinerarySchema = z.object({
  changeNotes: z.string().trim().max(500).nullable().optional(),
});
export type CreateItineraryDayInput = z.infer<typeof createItineraryDaySchema>;
export type UpdateItineraryDayInput = z.infer<typeof updateItineraryDaySchema>;
export type ReorderItineraryDaysInput = z.infer<typeof reorderItineraryDaysSchema>;
export type PopulateFromTemplateInput = z.infer<typeof populateFromTemplateSchema>;
export type PublishItineraryInput = z.infer<typeof publishItinerarySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — Staff & Resource Assignments
// ─────────────────────────────────────────────────────────────────────────────

export const STAFF_ASSIGNMENT_STATUSES = [
  'PROPOSED',
  'CONFIRMED',
  'DECLINED',
  'CANCELLED',
  'COMPLETED',
] as const;
export const staffAssignmentStatusSchema = z.enum(STAFF_ASSIGNMENT_STATUSES);

export const createStaffAssignmentSchema = z
  .object({
    tripId: z.string().uuid({ message: 'Trip ID must be a valid UUID' }),
    staffId: z.string().uuid({ message: 'Staff ID must be a valid UUID' }),
    role: z.string().trim().min(1, { message: 'Role is required' }).max(100),
    startDate: z.string().datetime({ message: 'Start date must be an ISO datetime' }),
    endDate: z.string().datetime({ message: 'End date must be an ISO datetime' }),
    agreedRate: z.coerce.number().min(0).optional(),
    currency: z.string().trim().min(1).max(10).default('NPR'),
    notes: z.string().trim().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export const updateStaffAssignmentSchema = z
  .object({
    role: z.string().trim().min(1).max(100).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    agreedRate: z.coerce.number().min(0).nullable().optional(),
    currency: z.string().trim().min(1).max(10).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    },
  );

export const listStaffAssignmentsQuerySchema = z.object({
  tripId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  status: staffAssignmentStatusSchema.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const changeStaffAssignmentStatusSchema = z.object({
  status: staffAssignmentStatusSchema,
  notes: z.string().trim().max(2000).optional(),
});

export type StaffAssignmentStatus = (typeof STAFF_ASSIGNMENT_STATUSES)[number];
export type CreateStaffAssignmentInput = z.infer<typeof createStaffAssignmentSchema>;
export type UpdateStaffAssignmentInput = z.infer<typeof updateStaffAssignmentSchema>;
export type ListStaffAssignmentsQuery = z.infer<typeof listStaffAssignmentsQuerySchema>;
export type ChangeStaffAssignmentStatusInput = z.infer<typeof changeStaffAssignmentStatusSchema>;

// Resources
export const RESOURCE_TYPES = ['VEHICLE', 'EQUIPMENT', 'OTHER'] as const;
export const RESOURCE_STATUSES = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'INACTIVE'] as const;
export const RESOURCE_ASSIGNMENT_STATUSES = ['PROPOSED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;

export const resourceTypeSchema = z.enum(RESOURCE_TYPES);
export const resourceStatusSchema = z.enum(RESOURCE_STATUSES);
export const resourceAssignmentStatusSchema = z.enum(RESOURCE_ASSIGNMENT_STATUSES);

export const createResourceSchema = z
  .object({
    name: z.string().trim().min(1, { message: 'Name is required' }).max(200),
    type: resourceTypeSchema,
    code: z.string().trim().max(50).nullable().optional(),
    vehicleType: z.string().trim().max(100).nullable().optional(),
    licensePlate: z.string().trim().max(50).nullable().optional(),
    capacity: z.coerce.number().int().min(1).nullable().optional(),
    quantity: z.coerce.number().int().min(1).nullable().optional(),
    status: resourceStatusSchema.default('AVAILABLE'),
    notes: z.string().trim().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'VEHICLE') {
        return Boolean(data.vehicleType || data.licensePlate);
      }
      return true;
    },
    {
      message: 'Vehicle resources require vehicleType or licensePlate',
      path: ['vehicleType'],
    },
  )
  .refine(
    (data) => {
      if (data.type === 'EQUIPMENT') {
        return typeof data.quantity === 'number' && data.quantity > 0;
      }
      return true;
    },
    {
      message: 'Equipment resources require a positive quantity',
      path: ['quantity'],
    },
  );

export const updateResourceSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    type: resourceTypeSchema.optional(),
    code: z.string().trim().max(50).nullable().optional(),
    vehicleType: z.string().trim().max(100).nullable().optional(),
    licensePlate: z.string().trim().max(50).nullable().optional(),
    capacity: z.coerce.number().int().min(1).nullable().optional(),
    quantity: z.coerce.number().int().min(1).nullable().optional(),
    status: resourceStatusSchema.optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const listResourcesQuerySchema = z.object({
  type: resourceTypeSchema.optional(),
  status: resourceStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];
export type ResourceAssignmentStatus = (typeof RESOURCE_ASSIGNMENT_STATUSES)[number];
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ListResourcesQuery = z.infer<typeof listResourcesQuerySchema>;

// Resource Assignments
export const createResourceAssignmentSchema = z
  .object({
    tripId: z.string().uuid({ message: 'Trip ID must be a valid UUID' }),
    resourceId: z.string().uuid({ message: 'Resource ID must be a valid UUID' }),
    startDate: z.string().datetime({ message: 'Start date must be an ISO datetime' }),
    endDate: z.string().datetime({ message: 'End date must be an ISO datetime' }),
    notes: z.string().trim().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export const updateResourceAssignmentSchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    },
  );

export const listResourceAssignmentsQuerySchema = z.object({
  tripId: z.string().uuid().optional(),
  resourceId: z.string().uuid().optional(),
  status: resourceAssignmentStatusSchema.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const changeResourceAssignmentStatusSchema = z.object({
  status: resourceAssignmentStatusSchema,
  notes: z.string().trim().max(2000).optional(),
});

export type CreateResourceAssignmentInput = z.infer<typeof createResourceAssignmentSchema>;
export type UpdateResourceAssignmentInput = z.infer<typeof updateResourceAssignmentSchema>;
export type ListResourceAssignmentsQuery = z.infer<typeof listResourceAssignmentsQuerySchema>;
export type ChangeResourceAssignmentStatusInput = z.infer<typeof changeResourceAssignmentStatusSchema>;

// Availability Checks
export const checkAvailabilityQuerySchema = z
  .object({
    entityType: z.enum(['STAFF', 'RESOURCE']).optional(),
    entityId: z.string().uuid().optional(),
    staffId: z.string().uuid().optional(),
    resourceId: z.string().uuid().optional(),
    startDate: z.string().datetime({ message: 'Start date must be an ISO datetime' }),
    endDate: z.string().datetime({ message: 'End date must be an ISO datetime' }),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type CheckAvailabilityQuery = z.infer<typeof checkAvailabilityQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — Suppliers & Logistics Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const SUPPLIER_CATEGORIES = [
  'ACCOMMODATION',
  'TRANSPORT',
  'FOOD',
  'PERMIT',
  'EQUIPMENT',
  'INSURANCE',
  'OTHER',
] as const;

export const SUPPLIER_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'BLACKLISTED',
  'PENDING_REVIEW',
] as const;

export const SUPPLIER_BOOKING_STATUSES = [
  'INQUIRY',
  'REQUESTED',
  'QUOTED',
  'BOOKED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

export const supplierCategorySchema = z.enum(SUPPLIER_CATEGORIES);
export const supplierStatusSchema = z.enum(SUPPLIER_STATUSES);
export const supplierBookingStatusSchema = z.enum(SUPPLIER_BOOKING_STATUSES);

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).max(200),
  code: z.string().trim().max(50).nullable().optional(),
  category: supplierCategorySchema,
  region: z.string().trim().max(100).nullable().optional(),
  contactName: z.string().trim().max(100).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  whatsapp: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  taxId: z.string().trim().max(50).nullable().optional(),
  paymentTerms: z.string().trim().max(200).nullable().optional(),
  currency: z.string().trim().min(1).max(10).default('NPR'),
  rating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateSupplierSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    code: z.string().trim().max(50).nullable().optional(),
    category: supplierCategorySchema.optional(),
    region: z.string().trim().max(100).nullable().optional(),
    contactName: z.string().trim().max(100).nullable().optional(),
    email: z.string().trim().email().nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    whatsapp: z.string().trim().max(40).nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    taxId: z.string().trim().max(50).nullable().optional(),
    paymentTerms: z.string().trim().max(200).nullable().optional(),
    currency: z.string().trim().min(1).max(10).optional(),
    status: supplierStatusSchema.optional(),
    rating: z.coerce.number().int().min(1).max(5).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const listSuppliersQuerySchema = z.object({
  category: supplierCategorySchema.optional(),
  region: z.string().trim().max(100).optional(),
  status: supplierStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createSupplierRateSchema = z
  .object({
    serviceType: z.string().trim().min(1, { message: 'Service type is required' }).max(100),
    description: z.string().trim().max(500).nullable().optional(),
    amount: z.coerce.number().positive({ message: 'Amount must be greater than 0' }),
    currency: z.string().trim().min(1).max(10).default('NPR'),
    unit: z.string().trim().min(1, { message: 'Unit is required' }).max(50),
    validFrom: z.string().datetime({ message: 'Valid from must be an ISO datetime' }),
    validTo: z.string().datetime({ message: 'Valid to must be an ISO datetime' }).nullable().optional(),
    cancellationPolicy: z.string().trim().max(1000).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) => {
      if (data.validTo) {
        return new Date(data.validTo) > new Date(data.validFrom);
      }
      return true;
    },
    {
      message: 'Valid to must be after valid from',
      path: ['validTo'],
    },
  );

export const updateSupplierRateSchema = z
  .object({
    serviceType: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    amount: z.coerce.number().positive().optional(),
    currency: z.string().trim().min(1).max(10).optional(),
    unit: z.string().trim().min(1).max(50).optional(),
    validFrom: z.string().datetime().optional(),
    validTo: z.string().datetime().nullable().optional(),
    cancellationPolicy: z.string().trim().max(1000).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .refine(
    (data) => {
      if (data.validFrom && data.validTo) {
        return new Date(data.validTo) > new Date(data.validFrom);
      }
      return true;
    },
    {
      message: 'Valid to must be after valid from',
      path: ['validTo'],
    },
  );

export const listSupplierRatesQuerySchema = z.object({
  supplierId: z.string().uuid().optional(),
  active: z
    .preprocess((val) => {
      if (typeof val === 'string') return val.toLowerCase() === 'true';
      return val;
    }, z.boolean())
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createSupplierBookingSchema = z
  .object({
    tripId: z.string().uuid({ message: 'Trip ID must be a valid UUID' }),
    supplierId: z.string().uuid({ message: 'Supplier ID must be a valid UUID' }),
    itineraryDayId: z.string().uuid({ message: 'Itinerary day ID must be a valid UUID' }).nullable().optional(),
    serviceType: supplierCategorySchema,
    description: z.string().trim().min(1, { message: 'Description is required' }).max(500),
    code: z.string().trim().max(50).nullable().optional(),
    serviceDate: z.string().datetime({ message: 'Service date must be an ISO datetime' }),
    endDate: z.string().datetime({ message: 'End date must be an ISO datetime' }).nullable().optional(),
    startTime: z.string().trim().max(10).nullable().optional(),
    endTime: z.string().trim().max(10).nullable().optional(),
    quantity: z.coerce.number().int().min(1).default(1),
    unit: z.string().trim().max(50).nullable().optional(),
    estimatedCost: z.coerce.number().min(0).nullable().optional(),
    currency: z.string().trim().min(1).max(10).default('NPR'),
    cancellationPolicy: z.string().trim().max(1000).nullable().optional(),
    cancellationDeadline: z.string().datetime().nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) => {
      if (data.endDate) {
        return new Date(data.endDate) >= new Date(data.serviceDate);
      }
      return true;
    },
    {
      message: 'End date must be on or after service date',
      path: ['endDate'],
    },
  )
  .refine(
    (data) => {
      if (data.cancellationDeadline) {
        return new Date(data.cancellationDeadline) <= new Date(data.serviceDate);
      }
      return true;
    },
    {
      message: 'Cancellation deadline must be on or before service date',
      path: ['cancellationDeadline'],
    },
  );

export const updateSupplierBookingSchema = z
  .object({
    itineraryDayId: z.string().uuid().nullable().optional(),
    serviceType: supplierCategorySchema.optional(),
    description: z.string().trim().min(1).max(500).optional(),
    code: z.string().trim().max(50).nullable().optional(),
    serviceDate: z.string().datetime().optional(),
    endDate: z.string().datetime().nullable().optional(),
    startTime: z.string().trim().max(10).nullable().optional(),
    endTime: z.string().trim().max(10).nullable().optional(),
    quantity: z.coerce.number().int().min(1).optional(),
    unit: z.string().trim().max(50).nullable().optional(),
    estimatedCost: z.coerce.number().min(0).nullable().optional(),
    currency: z.string().trim().min(1).max(10).optional(),
    cancellationPolicy: z.string().trim().max(1000).nullable().optional(),
    cancellationDeadline: z.string().datetime().nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .refine(
    (data) => {
      if (data.serviceDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.serviceDate);
      }
      return true;
    },
    {
      message: 'End date must be on or after service date',
      path: ['endDate'],
    },
  )
  .refine(
    (data) => {
      if (data.serviceDate && data.cancellationDeadline) {
        return new Date(data.cancellationDeadline) <= new Date(data.serviceDate);
      }
      return true;
    },
    {
      message: 'Cancellation deadline must be on or before service date',
      path: ['cancellationDeadline'],
    },
  );

export const listSupplierBookingsQuerySchema = z.object({
  tripId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  status: supplierBookingStatusSchema.optional(),
  category: supplierCategorySchema.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const confirmSupplierBookingSchema = z.object({
  confirmationNumber: z.string().trim().min(1, { message: 'Confirmation number is required' }).max(100),
  confirmedCost: z.coerce.number().min(0, { message: 'Confirmed cost is required' }),
  notes: z.string().trim().max(2000).optional(),
});

export const recordSupplierQuoteSchema = z.object({
  confirmedCost: z.coerce.number().min(0, { message: 'Quoted cost is required' }),
  notes: z.string().trim().max(2000).optional(),
});

export const cancelSupplierBookingSchema = z.object({
  reason: z.string().trim().min(5, { message: 'Cancellation reason must be at least 5 characters' }).max(500),
});

export const recordSupplierBookingActualCostSchema = z.object({
  actualCost: z.coerce.number().min(0, { message: 'Actual cost must be greater than or equal to 0' }),
  notes: z.string().trim().max(2000).optional(),
});

export const supplierAlternativesQuerySchema = z.object({
  supplierId: z.string().uuid().optional(),
  region: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number];
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];
export type SupplierBookingStatus = (typeof SUPPLIER_BOOKING_STATUSES)[number];

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;

export type CreateSupplierRateInput = z.infer<typeof createSupplierRateSchema>;
export type UpdateSupplierRateInput = z.infer<typeof updateSupplierRateSchema>;
export type ListSupplierRatesQuery = z.infer<typeof listSupplierRatesQuerySchema>;

export type CreateSupplierBookingInput = z.infer<typeof createSupplierBookingSchema>;
export type UpdateSupplierBookingInput = z.infer<typeof updateSupplierBookingSchema>;
export type ListSupplierBookingsQuery = z.infer<typeof listSupplierBookingsQuerySchema>;

export type ConfirmSupplierBookingInput = z.infer<typeof confirmSupplierBookingSchema>;
export type RecordSupplierQuoteInput = z.infer<typeof recordSupplierQuoteSchema>;
export type CancelSupplierBookingInput = z.infer<typeof cancelSupplierBookingSchema>;
export type RecordSupplierBookingActualCostInput = z.infer<typeof recordSupplierBookingActualCostSchema>;
export type SupplierAlternativesQuery = z.infer<typeof supplierAlternativesQuerySchema>;
