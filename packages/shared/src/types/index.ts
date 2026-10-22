import type { PermissionCode } from '../constants/permissions.js';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type WorkspaceStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type MembershipStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    isSystem: boolean;
  };
  permissions: PermissionCode[];
}

export interface PermissionItem {
  id: string;
  code: PermissionCode;
  description: string | null;
  category: string;
}

export interface RoleDetail {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MemberDetail {
  id: string;
  userId: string;
  workspaceId: string;
  roleId: string;
  status: MembershipStatus;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: UserStatus;
  };
  role: {
    id: string;
    name: string;
    isSystem: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuditEventDetail {
  id: string;
  workspaceId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface TenantContext {
  workspaceId: string;
  membershipId: string;
  roleId: string;
  roleName: string;
  permissions: PermissionCode[];
}

export interface StaffDocumentDetail {
  id: string;
  workspaceId: string;
  staffId: string;
  documentType: string;
  title: string;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  expiresAt: string | null;
  verified: boolean;
  verifiedById: string | null;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffProfileDetail {
  id: string;
  workspaceId: string;
  userId: string | null;
  staffType: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  photoUrl: string | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  languages: string[];
  certifications: string[];
  experienceYears: number | null;
  experienceLevel: string | null;
  preferredRoutes: string[];
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  status: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  documents?: StaffDocumentDetail[];
}

export interface ListStaffResult {
  total: number;
  limit: number;
  offset: number;
  items: StaffProfileDetail[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Destination
// ─────────────────────────────────────────────────────────────────────────────
export interface DestinationDetail {
  id: string;
  workspaceId: string;
  name: string;
  region: string | null;
  country: string;
  latitude: string | null;
  longitude: string | null;
  altitude: number | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ListDestinationsResult {
  total: number;
  limit: number;
  offset: number;
  items: DestinationDetail[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Trek templates
// ─────────────────────────────────────────────────────────────────────────────
export interface TrekTemplateDayDetail {
  id: string;
  templateId: string;
  dayNumber: number;
  title: string;
  description: string | null;
  startLocation: string | null;
  endLocation: string | null;
  altitude: number | null;
  walkingHours: string | null;
  accommodation: string | null;
  meals: string[];
  activities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TrekTemplateDetail {
  id: string;
  workspaceId: string;
  destinationId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  region: string | null;
  difficulty: string;
  durationDays: number;
  maxAltitude: number | null;
  bestSeasons: string[];
  basePrice: string | null;
  basePriceCurrency: string;
  requiredDocuments: string[];
  packingList: unknown | null;
  preparationNotes: string | null;
  inclusions: string[];
  exclusions: string[];
  terms: string | null;
  status: string;
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  destination?: DestinationDetail | null;
  days?: TrekTemplateDayDetail[];
}

export interface ListTrekTemplatesResult {
  total: number;
  limit: number;
  offset: number;
  items: TrekTemplateDetail[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Agency
// ─────────────────────────────────────────────────────────────────────────────
export interface AgencyProfileDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  timezone: string;
  locale: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  taxId: string | null;
  website: string | null;
  logoUrl: string | null;
  businessPolicies: unknown | null;
  settings: unknown | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer
// ─────────────────────────────────────────────────────────────────────────────
export interface CustomerDetail {
  id: string;
  workspaceId: string;
  customerType: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  nationality: string | null;
  address: string | null;
  dateOfBirth: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  source: string | null;
  tags: string[];
  notes: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inquiry
// ─────────────────────────────────────────────────────────────────────────────
export interface InquiryActivityDetail {
  id: string;
  workspaceId: string;
  inquiryId: string;
  userId: string | null;
  activityType: string;
  description: string;
  metadata: unknown;
  createdAt: string;
}

export interface InquiryDetail {
  id: string;
  workspaceId: string;
  customerId: string;
  inquiryNumber: string;
  trekInterest: string | null;
  destinationText: string | null;
  preferredStart: string | null;
  preferredEnd: string | null;
  flexibleDates: boolean;
  groupSize: number;
  adults: number;
  children: number;
  specialRequirements: string | null;
  budgetExpectation: string | null;
  budgetCurrency: string;
  status: string;
  priority: string;
  source: string | null;
  assignedToId: string | null;
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  lostReason: string | null;
  notes: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  activities?: InquiryActivityDetail[];
}

export interface ListInquiriesResult {
  total: number;
  limit: number;
  offset: number;
  items: InquiryDetail[];
}

export interface ListCustomersResult {
  total: number;
  limit: number;
  offset: number;
  items: CustomerDetail[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Quotations, Bookings & Payments
// ─────────────────────────────────────────────────────────────────────────────
export interface QuotationLineItemDetail {
  id: string;
  quotationId: string;
  category: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  total: string;
  isOptional: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface QuotationVersionDetail {
  id: string;
  quotationId: string;
  version: number;
  snapshot: unknown;
  changedById: string | null;
  changeReason: string | null;
  createdAt: string;
}
export interface QuotationDetail {
  id: string;
  workspaceId: string;
  inquiryId: string | null;
  customerId: string;
  quotationNumber: string;
  version: number;
  trekName: string;
  startDate: string;
  endDate: string;
  groupSize: number;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  currency: string;
  inclusions: string[];
  exclusions: string[];
  terms: string | null;
  notes: string | null;
  status: string;
  validUntil: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  convertedToBookingId: string | null;
  customer?: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  lineItems?: QuotationLineItemDetail[];
  versions?: QuotationVersionDetail[];
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface ListQuotationsResult {
  total: number;
  limit: number;
  offset: number;
  items: QuotationDetail[];
}
export interface BookingDetail {
  id: string;
  workspaceId: string;
  customerId: string;
  quotationId: string | null;
  bookingNumber: string;
  trekName: string;
  startDate: string;
  endDate: string;
  groupSize: number;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  currency: string;
  status: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  payments?: PaymentDetail[];
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface ListBookingsResult {
  total: number;
  limit: number;
  offset: number;
  items: BookingDetail[];
}
export interface PaymentDetail {
  id: string;
  workspaceId: string;
  bookingId: string;
  amount: string;
  currency: string;
  paymentType: string;
  method: string | null;
  reference: string | null;
  receivedAt: string;
  recordedById: string | null;
  evidence: string | null;
  notes: string | null;
  createdAt: string;
}
export interface ListPaymentsResult {
  total: number;
  limit: number;
  offset: number;
  items: PaymentDetail[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — Trips, Travelers & Itinerary
// ─────────────────────────────────────────────────────────────────────────────
export interface TripTravelerDetail {
  id: string;
  workspaceId: string;
  tripId: string;
  customerId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  dietaryRequirements: string | null;
  medicalNotes: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  isTripLeader: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ItineraryDayDetail {
  id: string;
  workspaceId: string;
  tripId: string;
  dayNumber: number;
  title: string;
  description: string | null;
  location: string | null;
  altitude: number | null;
  startTime: string | null;
  endTime: string | null;
  walkingHours: string | null;
  accommodation: string | null;
  meals: string[];
  activities: string[];
  clientVisible: boolean;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ItineraryVersionDetail {
  id: string;
  workspaceId: string;
  tripId: string;
  version: number;
  status: string;
  snapshot?: unknown;
  publishedAt: string | null;
  publishedById: string | null;
  changeNotes: string | null;
  createdAt: string;
}
export interface TripDetail {
  id: string;
  workspaceId: string;
  bookingId: string | null;
  customerId: string;
  tripNumber: string;
  name: string;
  startDate: string;
  endDate: string;
  groupSize: number;
  status: string;
  operationsManagerId: string | null;
  leadGuideId: string | null;
  publishedItineraryVersionId: string | null;
  notes: string | null;
  travelers?: TripTravelerDetail[];
  itineraryDays?: ItineraryDayDetail[];
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface ListTripsResult {
  total: number;
  limit: number;
  offset: number;
  items: TripDetail[];
}
export interface ReadinessSummary {
  status: 'NOT_READY' | 'PARTIAL' | 'READY' | 'BLOCKED';
  itineraryPublished: boolean;
  travelerCount: number;
  hasOperationsManager: boolean;
  hasLeadGuide: boolean;
  blockingIssues: string[];
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — Staff & Resource Assignment Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffAssignmentDetail {
  id: string;
  workspaceId: string;
  tripId: string;
  staffId: string;
  role: string;
  startDate: string;
  endDate: string;
  status: string;
  agreedRate: string | null;
  currency: string;
  confirmedAt: string | null;
  confirmedById: string | null;
  notes: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  staff?: {
    id: string;
    fullName: string;
    staffType: string;
    phone: string | null;
  };
  trip?: {
    id: string;
    tripNumber: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

export interface ResourceDetail {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  code: string | null;
  vehicleType: string | null;
  licensePlate: string | null;
  capacity: number | null;
  quantity: number | null;
  status: string;
  notes: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ResourceAssignmentDetail {
  id: string;
  workspaceId: string;
  tripId: string;
  resourceId: string;
  startDate: string;
  endDate: string;
  status: string;
  notes: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  resource?: ResourceDetail;
  trip?: {
    id: string;
    tripNumber: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

export interface ConflictingAssignment {
  id: string;
  tripId: string;
  tripName: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface AvailabilityResult {
  entityType: 'STAFF' | 'RESOURCE';
  entityId: string;
  available: boolean;
  conflictingAssignments: ConflictingAssignment[];
}

export interface ListStaffAssignmentsResult {
  total: number;
  limit: number;
  offset: number;
  items: StaffAssignmentDetail[];
}

export interface ListResourcesResult {
  total: number;
  limit: number;
  offset: number;
  items: ResourceDetail[];
}

export interface ListResourceAssignmentsResult {
  total: number;
  limit: number;
  offset: number;
  items: ResourceAssignmentDetail[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — Suppliers & Logistics Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SupplierDetail {
  id: string;
  workspaceId: string;
  name: string;
  code: string | null;
  category: string;
  region: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  taxId: string | null;
  paymentTerms: string | null;
  currency: string;
  status: string;
  rating: number | null;
  notes: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SupplierRateDetail {
  id: string;
  workspaceId: string;
  supplierId: string;
  serviceType: string;
  description: string | null;
  amount: string;
  currency: string;
  unit: string;
  validFrom: string;
  validTo: string | null;
  cancellationPolicy: string | null;
  notes: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierBookingDetail {
  id: string;
  workspaceId: string;
  tripId: string;
  supplierId: string;
  itineraryDayId: string | null;
  serviceType: string;
  description: string;
  code: string | null;
  serviceDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  quantity: number;
  unit: string | null;
  estimatedCost: string | null;
  confirmedCost: string | null;
  actualCost: string | null;
  currency: string;
  status: string;
  confirmationNumber: string | null;
  confirmedAt: string | null;
  confirmedById: string | null;
  cancellationPolicy: string | null;
  cancellationDeadline: string | null;
  cancelledAt: string | null;
  cancelledById: string | null;
  cancellationReason: string | null;
  notes: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  supplier?: {
    id: string;
    name: string;
    category: string;
    phone: string | null;
  };
  itineraryDay?: {
    id: string;
    dayNumber: number;
    title: string;
  } | null;
  trip?: {
    id: string;
    tripNumber: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

export interface SupplierAlternative {
  id: string;
  name: string;
  category: string;
  region: string | null;
  status: string;
  rating: number | null;
  averageRate?: string | null;
}

export type SupplierAlternativesResult = SupplierAlternative[];

export interface ListSuppliersResult {
  total: number;
  limit: number;
  offset: number;
  items: SupplierDetail[];
}

export interface ListSupplierRatesResult {
  total: number;
  limit: number;
  offset: number;
  items: SupplierRateDetail[];
}

export interface ListSupplierBookingsResult {
  total: number;
  limit: number;
  offset: number;
  items: SupplierBookingDetail[];
}
