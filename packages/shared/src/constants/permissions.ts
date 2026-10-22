export const PERMISSION_CODES = {
  // Trips
  TRIP_CREATE: 'trip:create',
  TRIP_READ: 'trip:read',
  TRIP_UPDATE: 'trip:update',
  TRIP_DELETE: 'trip:delete',

  // Departures
  DEPARTURE_CREATE: 'departure:create',
  DEPARTURE_READ: 'departure:read',
  DEPARTURE_UPDATE: 'departure:update',
  DEPARTURE_DELETE: 'departure:delete',

  // Suppliers
  SUPPLIER_CREATE: 'supplier:create',
  SUPPLIER_READ: 'supplier:read',
  SUPPLIER_UPDATE: 'supplier:update',
  SUPPLIER_DELETE: 'supplier:delete',

  // Resources
  RESOURCE_CREATE: 'resource:create',
  RESOURCE_READ: 'resource:read',
  RESOURCE_UPDATE: 'resource:update',
  RESOURCE_DELETE: 'resource:delete',

  // Services
  SERVICE_CREATE: 'service:create',
  SERVICE_READ: 'service:read',
  SERVICE_UPDATE: 'service:update',
  SERVICE_DELETE: 'service:delete',
  SERVICE_CONFIRM: 'service:confirm',

  // Incidents
  INCIDENT_CREATE: 'incident:create',
  INCIDENT_READ: 'incident:read',
  INCIDENT_UPDATE: 'incident:update',
  INCIDENT_ASSIGN: 'incident:assign',
  INCIDENT_ASSESS: 'incident:assess',
  INCIDENT_CLOSE: 'incident:close',

  // Recovery
  RECOVERY_CREATE: 'recovery:create',
  RECOVERY_READ: 'recovery:read',
  RECOVERY_UPDATE: 'recovery:update',
  RECOVERY_APPROVE: 'recovery:approve',
  RECOVERY_EXECUTE: 'recovery:execute',

  // Tasks
  TASK_CREATE: 'task:create',
  TASK_READ: 'task:read',
  TASK_UPDATE: 'task:update',
  TASK_ASSIGN: 'task:assign',
  TASK_EXECUTE: 'task:execute',

  // Approvals
  APPROVAL_READ: 'approval:read',
  APPROVAL_DECIDE: 'approval:decide',

  // Evidence
  EVIDENCE_CREATE: 'evidence:create',
  EVIDENCE_READ: 'evidence:read',
  EVIDENCE_DELETE: 'evidence:delete',
  EVIDENCE_VERIFY: 'evidence:verify',

  // Finance
  FINANCE_CREATE: 'finance:create',
  FINANCE_READ: 'finance:read',
  FINANCE_UPDATE: 'finance:update',

  // Analytics
  ANALYTICS_READ: 'analytics:read',

  // Workspace
  WORKSPACE_READ: 'workspace:read',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_DELETE: 'workspace:delete',

  // Members
  MEMBER_INVITE: 'member:invite',
  MEMBER_UPDATE: 'member:update',
  MEMBER_REMOVE: 'member:remove',

  // Roles
  ROLE_CREATE: 'role:create',
  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',

  // Staff
  STAFF_CREATE: 'staff:create',
  STAFF_READ: 'staff:read',
  STAFF_UPDATE: 'staff:update',
  STAFF_DELETE: 'staff:delete',
  STAFF_VERIFY: 'staff:verify',

  // Trek Templates
  TEMPLATE_CREATE: 'template:create',
  TEMPLATE_READ: 'template:read',
  TEMPLATE_UPDATE: 'template:update',
  TEMPLATE_DELETE: 'template:delete',

  // Destinations
  DESTINATION_CREATE: 'destination:create',
  DESTINATION_READ: 'destination:read',
  DESTINATION_UPDATE: 'destination:update',
  DESTINATION_DELETE: 'destination:delete',

  // Agency
  AGENCY_READ: 'agency:read',
  AGENCY_UPDATE: 'agency:update',

  // Audit
  AUDIT_READ: 'audit:read',

  // Import
  IMPORT_CREATE: 'import:create',
  IMPORT_READ: 'import:read',
  // Customers
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_READ: 'customer:read',
  CUSTOMER_UPDATE: 'customer:update',
  CUSTOMER_DELETE: 'customer:delete',
  // Inquiries
  INQUIRY_CREATE: 'inquiry:create',
  INQUIRY_READ: 'inquiry:read',
  INQUIRY_UPDATE: 'inquiry:update',
  INQUIRY_ASSIGN: 'inquiry:assign',
  INQUIRY_CONVERT: 'inquiry:convert',
  // Quotations
  QUOTATION_CREATE: 'quotation:create',
  QUOTATION_READ: 'quotation:read',
  QUOTATION_UPDATE: 'quotation:update',
  QUOTATION_SEND: 'quotation:send',
  QUOTATION_ACCEPT: 'quotation:accept',
  // Bookings
  BOOKING_CREATE: 'booking:create',
  BOOKING_READ: 'booking:read',
  BOOKING_UPDATE: 'booking:update',
  BOOKING_CANCEL: 'booking:cancel',
  // Payments
  PAYMENT_CREATE: 'payment:create',
  PAYMENT_READ: 'payment:read',
  // Trips
  TRIP_ASSIGN: 'trip:assign',
  TRIP_PUBLISH_ITINERARY: 'trip:publish_itinerary',
  // Staff assignments
  STAFF_ASSIGNMENT_CREATE: 'staff_assignment:create',
  STAFF_ASSIGNMENT_READ: 'staff_assignment:read',
  STAFF_ASSIGNMENT_UPDATE: 'staff_assignment:update',
  STAFF_ASSIGNMENT_DELETE: 'staff_assignment:delete',
  // Supplier bookings
  SUPPLIER_BOOKING_CREATE: 'supplier_booking:create',
  SUPPLIER_BOOKING_READ: 'supplier_booking:read',
  SUPPLIER_BOOKING_UPDATE: 'supplier_booking:update',
  SUPPLIER_BOOKING_CONFIRM: 'supplier_booking:confirm',
  SUPPLIER_BOOKING_CANCEL: 'supplier_booking:cancel',
} as const;

export type PermissionCode = (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];

export const ALL_PERMISSIONS: PermissionCode[] = Object.values(PERMISSION_CODES);
