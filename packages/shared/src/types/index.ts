import type { PermissionCode } from '../constants/permissions.js';

/** Mirrors the DayStatus enum in the Prisma schema. */
export type DayStatusValue = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'PROBLEM';

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

export interface DisruptionImpactDetail {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  impactType: string;
  confidence: number;
  reasoning: string;
  createdAt: string;
}

export interface RecoveryTaskDetail {
  id: string;
  title: string;
  description: string | null;
  assignedToId: string | null;
  dueAt: string | null;
  status: string;
  evidenceUrl: string | null;
  completedAt: string | null;
}

export interface DisruptionDetail {
  id: string;
  workspaceId: string;
  tripId: string;
  disruptionNumber: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  reportedById: string | null;
  reportedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  rootCause: string | null;
  /** Day this disruption affects, if any. */
  itineraryDayId: string | null;
  createdAt: string;
  updatedAt: string;
  trip: { id: string; tripNumber: string; name: string };
  impacts: DisruptionImpactDetail[];
  recoveryPlan: {
    id: string;
    status: string;
    estimatedCost: string | null;
    notes: string | null;
    approvedById: string | null;
    approvedAt: string | null;
    createdAt: string;
    tasks: RecoveryTaskDetail[];
  } | null;
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
  /** Where the day starts. Preferred over `location` by traveller-facing screens. */
  startLocation: string | null;
  /** Where the day ends: the next stop, or where the group sleeps. */
  endLocation: string | null;
  /** Destination altitude in metres (not the climb). */
  altitude: number | null;
  /** Metres climbed during the day. Null when the route data does not state it. */
  elevationGain: number | null;
  /** Walking distance in km, one decimal place. Null when not stated. */
  distanceKm: string | null;
  startTime: string | null;
  endTime: string | null;
  walkingHours: string | null;
  accommodation: string | null;
  meals: string[];
  activities: string[];
  clientVisible: boolean;
  internalNotes: string | null;
  /** Live timeline status. Office-editable; set from dates, field reports and disruptions. */
  status: DayStatusValue;
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

// ─────────────────────────────────────────────────────────────────────────────
// Phase 7 — Field Operations
// ─────────────────────────────────────────────────────────────────────────────

export interface FieldCheckInDetail {
  id: string;
  workspaceId: string;
  tripId: string;
  staffId: string;
  checkInType: string;
  location: string | null;
  latitude: string | null;
  longitude: string | null;
  altitude: number | null;
  message: string | null;
  photoUrls: string[];
  recordedAt: string;
  syncedAt: string | null;
  clientId: string;
  createdAt: string;
  staff?: {
    id: string;
    fullName: string;
    staffType: string;
  };
}

export interface FieldReportDetail {
  id: string;
  workspaceId: string;
  tripId: string;
  reporterId: string;
  reportType: string;
  severity: string;
  description: string;
  location: string | null;
  photoUrls: string[];
  recordedAt: string;
  syncedAt: string | null;
  clientId: string;
  /** Day this report was filed against, if any. */
  itineraryDayId: string | null;
  createdAt: string;
  reporter?: {
    id: string;
    fullName: string;
  } | null;
}

export interface TripFieldData {
  checkIns: FieldCheckInDetail[];
  reports: FieldReportDetail[];
}

/** One entry of the guide home screen: the trips this user is assigned to. */
export interface FieldTripSummary {
  id: string;
  tripNumber: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  groupSize: number;
  leadGuideId: string | null;
  todayDayNumber: number | null;
  todayTitle: string | null;
  lastCheckInAt: string | null;
  openEmergencyReports: number;
}

export interface FieldTripList {
  trips: FieldTripSummary[];
  staffId: string | null;
}

// ─────────────────────────────
// Phase 9 — Finance & Profitability (derived, no new tables)
// ─────────────────────────────

/** Where a cost line came from. `Other` carries recovery spend and any unattributed variance. */
export type CostCategory = 'Suppliers' | 'Staff' | 'Recovery' | 'Other';

export interface CostBreakdownItem {
  category: CostCategory;
  amount: number;
  /** Share of the total actual cost, 0-100. Zero when there is no cost yet. */
  percent: number;
}

export type MarginBand = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'NO_REVENUE';

/**
 * Revenue comes from the linked Booking; costs are the sum of supplier actual
 * (or confirmed/estimated) costs, staff agreed rates and recovery plans.
 * `totalEstimatedCost` is the budgeted equivalent, so drift is always visible.
 */
export interface TripFinancialsResponse {
  workspaceId: string;
  tripId: string;
  tripNumber: string;
  tripName: string;
  status: string;
  startDate: string;
  endDate: string;
  currency: string;

  bookingId: string | null;
  totalRevenue: number;
  paidAmount: number;
  outstandingAmount: number;

  totalEstimatedCost: number;
  totalActualCost: number;
  /** Estimated variance per category (suppliers/staff/recovery) for the estimate side. */
  costVariance: {
    amount: number;
    /** (actual - estimated) / estimated * 100; 0 when nothing was estimated. */
    percent: number;
    exceedsEstimate: boolean;
  };

  grossProfit: number;
  /** (grossProfit / totalRevenue) * 100. Zero when there is no revenue. */
  marginPercent: number;
  marginBand: MarginBand;

  breakdown: CostBreakdownItem[];
}

export interface TripProfitabilityRow {
  tripId: string;
  tripNumber: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  marginBand: MarginBand;
}

export interface WorkspaceFinancialSummary {
  currency: string;
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  totalEstimatedCost: number;
  totalActualCost: number;
  totalEstimatedProfit: number;
  totalActualProfit: number;
  /** Revenue-weighted margin across every trip in the workspace. */
  overallMarginPercent: number;
  tripCount: number;
  lowMarginTripCount: number;
  mostProfitableTrip: TripProfitabilityRow | null;
  /** Sorted by margin descending so the worst performers are easy to find. */
  trips: TripProfitabilityRow[];
}
// ─────────────────────────────
// Phase 10 — Client portal & documents
// ─────────────────────────────

export const DOCUMENT_TYPES = ['PASSPORT', 'INSURANCE', 'VISA', 'VACCINATION', 'OTHER'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const PORTAL_ACCESS_STATUSES = ['ACTIVE', 'EXPIRED', 'REVOKED'] as const;
export type PortalAccessStatus = (typeof PORTAL_ACCESS_STATUSES)[number];

/**
 * A document row as both the office and the traveler see it. `fileUrl` is the
 * uploaded link; `uploadedByTraveler` lets the office tell self-service uploads
 * apart from documents it filed itself.
 */
export interface TripDocumentDetail {
  id: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  uploadedByTraveler: boolean;
  createdAt: string;
}

export interface PortalAccessLink {
  travelerId: string;
  travelerName: string;
  token: string;
  url: string;
  status: PortalAccessStatus;
  expiresAt: string;
}

/**
 * The traveler's own view of the trip. This is an allow-list, not the internal
 * TripDetail with fields stripped: there is nowhere here for costs, staff,
 * supplier bookings or internal notes to live.
 */
export interface PortalItineraryDay {
  id: string;
  dayNumber: number;
  /** Calendar date of this day (ISO), when the trip dates are known. */
  date: string | null;
  title: string;
  description: string | null;
  /** Legacy single label; kept for older clients. */
  location: string | null;
  startLocation: string | null;
  endLocation: string | null;
  /** Destination altitude in metres. Not the climb. */
  altitude: number | null;
  /** Metres climbed, or null when the itinerary does not state it. */
  elevationGain: number | null;
  /** Walking distance in km as a string, or null when not stated. */
  distanceKm: string | null;
  startTime: string | null;
  endTime: string | null;
  walkingHours: string | null;
  accommodation: string | null;
  meals: string[];
  activities: string[];
  /** Shown to travelers so they can see progress and delays at a glance. */
  status: DayStatusValue;
  /** Agency-authored change note for this day, when one is published. */
  changeNotice: PortalDayChangeNotice | null;
}

export interface PortalDayChangeNotice {
  updateId: string;
  title: string;
  summary: string;
  publishedAt: string;
  /** CONFIRMED: an agency update. PENDING: published on the day but under review. */
  state: PortalUpdateState;
}

/**
 * How an update reads to the traveller. Derived from the source record by the
 * server so the client never has to guess what a raw status means:
 *  - CONFIRMED  the agency has published a client-visible update;
 *  - PENDING    the office is working on it; nothing is confirmed yet;
 *  - RESOLVED   the source is explicitly resolved/closed;
 *  - CLOSED     recorded and no longer actionable, but not a traveller update.
 */
export const PORTAL_UPDATE_STATES = ['CONFIRMED', 'PENDING', 'RESOLVED', 'CLOSED'] as const;
export type PortalUpdateState = (typeof PORTAL_UPDATE_STATES)[number];

export interface PortalUpdateItem {
  id: string;
  kind: 'ANNOUNCEMENT' | 'DISRUPTION';
  title: string;
  description: string;
  /** Publication time: when the agency published it, or when it was reported. */
  publishedAt: string;
  updatedAt: string;
  state: PortalUpdateState;
  /** Raw source status, for support and debugging. Never rendered as a label. */
  sourceStatus: string;
  severity: string | null;
  /** The day affected, when the update is tied to one. */
  dayNumber: number | null;
  /** True when the traveller is expected to confirm they have read it. */
  requiresAcknowledgement: boolean;
  acknowledgedAt: string | null;
}

export interface PortalUpdateAcknowledgement {
  updateId: string;
  acknowledgedAt: string;
}

export interface PortalGuideContact {
  fullName: string;
  phone: string;
  role: string;
}

export interface PortalHelpRequestResult {
  /** The record the office will see. */
  reportId: string;
  createdAt: string;
  status: 'RECEIVED';
}

/** Office view of a traveller help request (it is an inquiry underneath). */
export interface PortalHelpRequestSummary {
  id: string;
  inquiryId: string;
  inquiryNumber: string;
  travelerName: string;
  message: string;
  status: string;
  createdAt: string;
}

/** Traveler-safe view of the trip status. No costs, margins or staff data. */
export interface PortalTripSummary {
  id: string;
  tripNumber: string;
  name: string;
  startDate: string;
  endDate: string;
  groupSize: number;
  status: string;
  /** The day number that matches today's date, when the trip is running. */
  currentDayNumber: number | null;
  /** Agency timezone (IANA name) that the trip dates are scheduled in. */
  timezone: string;
}

/**
 * The Traveller Command Center payload.
 *
 * This is an allow-list, not the internal trip with fields stripped: there is
 * nowhere in this shape for supplier costs, staff rates, margins, internal notes
 * or another traveller's records to live.
 */
export interface PortalCommandCenter {
  visitor: {
    fullName: string;
    isTripLeader: boolean;
  };
  trip: PortalTripSummary;
  /** Trip Home: what the traveller needs to know right now. */
  home: {
    status: PortalUpdateState;
    statusLabel: string;
    /** The most relevant published update, or null when there is none. */
    headlineUpdate: PortalUpdateItem | null;
    nextDay: PortalItineraryDay | null;
    unacknowledged: PortalUpdateItem[];
    agency: PortalEmergencyInfo;
  };
  itinerary: PortalItineraryDay[];
  updates: PortalUpdateItem[];
  documents: PortalDocument[];
  emergency: PortalEmergencyInfo & {
    guide: PortalGuideContact | null;
    instructions: string | null;
    /** Agency emergency line, only when the agency has configured one. */
    emergencyPhone: string | null;
  };
  /** Server time the payload was built (ISO), for the offline sync label. */
  syncedAt: string;
  expiresAt: string;
}

/**
 * A document as the traveller sees it. `downloadUrl` is a token-scoped portal URL
 * (never a storage path or a permanent public link); `external` means the file
 * lives outside TrailComand and is opened as a link.
 */
export interface PortalDocument {
  id: string;
  documentType: DocumentType;
  fileName: string;
  category: 'TRAVELLER_PROVIDED' | 'AGENCY_PROVIDED';
  uploadedAt: string;
  /** Same-origin portal URL that streams the file through an ownership check. */
  downloadUrl: string;
  external: boolean;
  /** Set when the stored file can no longer be served (missing / unsafe / expired). */
  unavailableReason: string | null;
}

export interface PortalTravelerProfile {
  fullName: string;
  isTripLeader: boolean;
  nationality: string | null;
  /** The traveler's own contact details — never another traveler's. */
  email: string | null;
  phone: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  dietaryRequirements: string | null;
}

export interface PortalEmergencyInfo {
  agencyName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

export interface PortalTripData {
  traveler: PortalTravelerProfile;
  trip: {
    id: string;
    tripNumber: string;
    name: string;
    startDate: string;
    endDate: string;
    groupSize: number;
    status: string;
  };
  itinerary: PortalItineraryDay[];
  documents: TripDocumentDetail[];
  emergency: PortalEmergencyInfo;
  expiresAt: string;
}

export interface PortalAccessState {
  status: PortalAccessStatus;
  expiresAt: string;
}

export interface CreateTripDocumentInput {
  travelerId: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
}

export interface PortalTravelerDocuments {
  travelerId: string;
  travelerName: string;
  hasPortalAccess: boolean;
  portalAccess: PortalAccessState | null;
  documents: TripDocumentDetail[];
}
