import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';

import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { roleRoutes } from './modules/role/role.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { staffRoutes } from './modules/staff/staff.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { workspaceRoutes } from './modules/workspace/workspace.routes.js';
import { membershipRoutes } from './modules/membership/membership.routes.js';
import { destinationRoutes } from './modules/destination/destination.routes.js';
import { trekTemplateRoutes } from './modules/trek-template/trek-template.routes.js';
import { agencyRoutes } from './modules/agency/agency.routes.js';
import { customerRoutes } from './modules/customer/customer.routes.js';
import { inquiryRoutes } from './modules/inquiry/inquiry.routes.js';
import { quotationRoutes } from './modules/quotation/quotation.routes.js';
import { bookingRoutes } from './modules/booking/booking.routes.js';
import { paymentRoutes } from './modules/payment/payment.routes.js';
import { tripRoutes } from './modules/trip/trip.routes.js';
import { tripTravelerRoutes } from './modules/trip-traveler/trip-traveler.routes.js';
import { itineraryRoutes } from './modules/itinerary/itinerary.routes.js';
import { staffAssignmentRoutes } from './modules/staff-assignment/staff-assignment.routes.js';
import { resourceRoutes } from './modules/resource/resource.routes.js';
import { resourceAssignmentRoutes } from './modules/resource-assignment/resource-assignment.routes.js';
import { supplierRoutes } from './modules/supplier/supplier.routes.js';
import { supplierBookingRoutes } from './modules/supplier-booking/supplier-booking.routes.js';
import { fieldRoutes } from './modules/field/field.routes.js';
import { disruptionRoutes } from './modules/disruption/disruption.routes.js';
import { financeRoutes } from './modules/finance/finance.routes.js';
import { portalRoutes, portalAdminRoutes } from './modules/portal/index.js';

export async function buildApp() {
  const app = Fastify({
    logger: false,
    trustProxy: true,
  });

  // Base Infrastructure Plugins
  await app.register(requestIdMiddleware);

  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: [env.WEB_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Workspace-Id',
      'x-request-id',
    ],
  });

  await app.register(cookie, {
    secret: env.SESSION_SECRET,
  });

  await app.register(rateLimitMiddleware);

  // Global structured error handling
  app.setErrorHandler(errorHandler);

  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'trailcomand-backend',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  });

  // Modules registration
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(workspaceRoutes, { prefix: '/api/workspaces' });
  await app.register(membershipRoutes, { prefix: '/api/workspaces' });
  await app.register(roleRoutes, { prefix: '/api/workspaces' });
  await app.register(auditRoutes, { prefix: '/api/workspaces' });
  await app.register(staffRoutes, { prefix: '/api/workspaces' });
  await app.register(destinationRoutes, { prefix: '/api/workspaces' });
  await app.register(trekTemplateRoutes, { prefix: '/api/workspaces' });
  await app.register(agencyRoutes, { prefix: '/api/workspaces' });
  await app.register(customerRoutes, { prefix: '/api/workspaces' });
  await app.register(inquiryRoutes, { prefix: '/api/workspaces' });
  await app.register(quotationRoutes, { prefix: '/api/workspaces' });
  await app.register(bookingRoutes, { prefix: '/api/workspaces' });
  await app.register(paymentRoutes, { prefix: '/api/workspaces' });
  await app.register(tripRoutes, { prefix: '/api/workspaces' });
  await app.register(tripTravelerRoutes, { prefix: '/api/workspaces' });
  await app.register(itineraryRoutes, { prefix: '/api/workspaces' });
  await app.register(staffAssignmentRoutes, { prefix: '/api/workspaces' });
  await app.register(resourceRoutes, { prefix: '/api/workspaces' });
  await app.register(resourceAssignmentRoutes, { prefix: '/api/workspaces' });
  await app.register(supplierRoutes, { prefix: '/api/workspaces' });
  await app.register(supplierBookingRoutes, { prefix: '/api/workspaces' });
  await app.register(fieldRoutes, { prefix: '/api/workspaces' });
  await app.register(disruptionRoutes, { prefix: '/api/workspaces' });
  // Keep the Phase 8 contract available under the versioned API namespace too.
  await app.register(disruptionRoutes, { prefix: '/api/v1/workspaces' });
  // Phase 9 — finance. Mounted on v1 so the dashboard and trip tab share one namespace.
  await app.register(financeRoutes, { prefix: '/api/v1/workspaces' });
  // Phase 10 — client portal. Public token routes and office admin routes are separate plugins.
  await app.register(portalRoutes, { prefix: '/api/v1/portal' });
  await app.register(portalAdminRoutes, { prefix: '/api/v1/workspaces' });

  return app;
}
