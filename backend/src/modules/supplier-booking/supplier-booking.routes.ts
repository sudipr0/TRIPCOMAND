import type { FastifyPluginAsync } from "fastify";
import { SupplierBookingService } from "./supplier-booking.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@trailcomand/shared";
import {
  createSupplierBookingSchema,
  updateSupplierBookingSchema,
  listSupplierBookingsQuerySchema,
  confirmSupplierBookingSchema,
  recordSupplierQuoteSchema,
  cancelSupplierBookingSchema,
  recordSupplierBookingActualCostSchema,
} from "./supplier-booking.schemas.js";

export const supplierBookingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List supplier bookings
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: Record<string, unknown>;
  }>(
    "/:workspaceId/supplier-bookings",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_READ),
        validateQuery(listSupplierBookingsQuerySchema),
      ],
    },
    async (request) => {
      const result = await SupplierBookingService.listBookings(
        request.tenant.workspaceId,
        request.query as never,
      );
      return { success: true, data: result };
    },
  );

  // Create supplier booking
  fastify.post<{
    Params: { workspaceId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/supplier-bookings",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_CREATE),
        validateBody(createSupplierBookingSchema),
      ],
    },
    async (request, reply) => {
      const booking = await SupplierBookingService.createBooking(
        request.tenant.workspaceId,
        request.user!.id,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: booking });
    },
  );

  // Upcoming deadlines (MUST be registered before `/:bookingId`!)
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: { withinHours?: string };
  }>(
    "/:workspaceId/supplier-bookings/deadlines",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_READ),
      ],
    },
    async (request) => {
      const withinHours = request.query.withinHours
        ? parseInt(request.query.withinHours, 10)
        : 72;
      const deadlines = await SupplierBookingService.getUpcomingDeadlines(
        request.tenant.workspaceId,
        withinHours,
      );
      return { success: true, data: deadlines };
    },
  );

  // Get single booking
  fastify.get<{
    Params: { workspaceId: string; bookingId: string };
  }>(
    "/:workspaceId/supplier-bookings/:bookingId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_READ),
      ],
    },
    async (request) => {
      const booking = await SupplierBookingService.getBooking(
        request.tenant.workspaceId,
        request.params.bookingId,
      );
      return { success: true, data: booking };
    },
  );

  // Update booking
  fastify.patch<{
    Params: { workspaceId: string; bookingId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/supplier-bookings/:bookingId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_UPDATE),
        validateBody(updateSupplierBookingSchema),
      ],
    },
    async (request) => {
      const booking = await SupplierBookingService.updateBooking(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.bookingId,
        request.body as never,
      );
      return { success: true, data: booking };
    },
  );

  // Delete booking (soft delete)
  fastify.delete<{
    Params: { workspaceId: string; bookingId: string };
  }>(
    "/:workspaceId/supplier-bookings/:bookingId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_UPDATE),
      ],
    },
    async (request) => {
      const result = await SupplierBookingService.deleteBooking(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.bookingId,
      );
      return { success: true, data: result };
    },
  );

  // Request quote
  fastify.post<{
    Params: { workspaceId: string; bookingId: string };
  }>(
    "/:workspaceId/supplier-bookings/:bookingId/request",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_UPDATE),
      ],
    },
    async (request) => {
      const booking = await SupplierBookingService.requestQuote(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.bookingId,
      );
      return { success: true, data: booking };
    },
  );

  // Record quote
  fastify.post<{
    Params: { workspaceId: string; bookingId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/supplier-bookings/:bookingId/record-quote",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_UPDATE),
        validateBody(recordSupplierQuoteSchema),
      ],
    },
    async (request) => {
      const booking = await SupplierBookingService.recordQuote(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.bookingId,
        request.body as never,
      );
      return { success: true, data: booking };
    },
  );

  // Confirm booking
  fastify.post<{
    Params: { workspaceId: string; bookingId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/supplier-bookings/:bookingId/confirm",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_CONFIRM),
        validateBody(confirmSupplierBookingSchema),
      ],
    },
    async (request) => {
      const booking = await SupplierBookingService.confirmBooking(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.bookingId,
        request.body as never,
      );
      return { success: true, data: booking };
    },
  );

  // Mark in-progress
  fastify.post<{
    Params: { workspaceId: string; bookingId: string };
  }>(
    "/:workspaceId/supplier-bookings/:bookingId/in-progress",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_UPDATE),
      ],
    },
    async (request) => {
      const booking = await SupplierBookingService.markInProgress(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.bookingId,
      );
      return { success: true, data: booking };
    },
  );

  // Complete booking
  fastify.post<{
    Params: { workspaceId: string; bookingId: string };
  }>(
    "/:workspaceId/supplier-bookings/:bookingId/complete",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_UPDATE),
      ],
    },
    async (request) => {
      const booking = await SupplierBookingService.completeBooking(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.bookingId,
      );
      return { success: true, data: booking };
    },
  );

  // Cancel booking
  fastify.post<{
    Params: { workspaceId: string; bookingId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/supplier-bookings/:bookingId/cancel",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_CANCEL),
        validateBody(cancelSupplierBookingSchema),
      ],
    },
    async (request) => {
      const booking = await SupplierBookingService.cancelBooking(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.bookingId,
        request.body as never,
      );
      return { success: true, data: booking };
    },
  );

  // Mark no-show
  fastify.post<{
    Params: { workspaceId: string; bookingId: string };
  }>(
    "/:workspaceId/supplier-bookings/:bookingId/no-show",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_UPDATE),
      ],
    },
    async (request) => {
      const booking = await SupplierBookingService.markNoShow(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.bookingId,
      );
      return { success: true, data: booking };
    },
  );

  // Record actual cost
  fastify.patch<{
    Params: { workspaceId: string; bookingId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/supplier-bookings/:bookingId/actual-cost",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_UPDATE),
        validateBody(recordSupplierBookingActualCostSchema),
      ],
    },
    async (request) => {
      const booking = await SupplierBookingService.recordActualCost(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.bookingId,
        request.body as never,
      );
      return { success: true, data: booking };
    },
  );

  // List bookings for trip
  fastify.get<{
    Params: { workspaceId: string; tripId: string };
  }>(
    "/:workspaceId/trips/:tripId/supplier-bookings",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_READ),
      ],
    },
    async (request) => {
      const bookings = await SupplierBookingService.listByTrip(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data: bookings };
    },
  );

  // List bookings for supplier
  fastify.get<{
    Params: { workspaceId: string; supplierId: string };
  }>(
    "/:workspaceId/suppliers/:supplierId/bookings",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.SUPPLIER_BOOKING_READ),
      ],
    },
    async (request) => {
      const bookings = await SupplierBookingService.listBySupplier(
        request.tenant.workspaceId,
        request.params.supplierId,
      );
      return { success: true, data: bookings };
    },
  );
};
