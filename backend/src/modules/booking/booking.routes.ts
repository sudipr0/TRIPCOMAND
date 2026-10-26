import type { FastifyPluginAsync } from "fastify";
import { PERMISSION_CODES } from "@trailcomand/shared";
import { updateBookingSchema } from '@trailcomand/shared';
import { cancelBookingSchema } from '@trailcomand/shared';
import { type ListBookingsQuery } from '@trailcomand/shared';
import { listBookingsQuerySchema } from '@trailcomand/shared';
import { type UpdateBookingInput } from '@trailcomand/shared';
import { type CancelBookingInput } from '@trailcomand/shared';
import { createBookingSchemaFromQuotation } from '@trailcomand/shared';
import { type CreateBookingFromQuotationInput } from '@trailcomand/shared';

import { BookingService } from "./booking.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";

export const bookingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List bookings in workspace
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: ListBookingsQuery;
  }>(
    "/:workspaceId/bookings",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.BOOKING_READ),
        validateQuery(listBookingsQuerySchema),
      ],
    },
    async (request, reply) => {
      const result = await BookingService.listBookings(
        request.tenant.workspaceId,
        request.query,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // Create booking from an accepted quotation
  fastify.post<{
    Params: { workspaceId: string };
    Body: CreateBookingFromQuotationInput;
  }>(
    "/:workspaceId/bookings/from-quotation",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.BOOKING_CREATE),
        validateBody(createBookingSchemaFromQuotation),
      ],
    },
    async (request, reply) => {
      const booking = await BookingService.createFromQuotation(
        request.tenant.workspaceId,
        request.user!.id,
        request.body.quotationId,
      );
      return reply.status(201).send({ success: true, data: booking });
    },
  );

  // Get a single booking (with payments)
  fastify.get<{ Params: { workspaceId: string; bookingId: string } }>(
    "/:workspaceId/bookings/:bookingId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.BOOKING_READ)] },
    async (request, reply) => {
      const booking = await BookingService.getBooking(
        request.tenant.workspaceId,
        request.params.bookingId,
      );
      return reply.send({ success: true, data: booking });
    },
  );

  // Update booking
  fastify.patch<{
    Params: { workspaceId: string; bookingId: string };
    Body: UpdateBookingInput;
  }>(
    "/:workspaceId/bookings/:bookingId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.BOOKING_UPDATE),
        validateBody(updateBookingSchema),
      ],
    },
    async (request, reply) => {
      const booking = await BookingService.updateBooking(
        request.tenant.workspaceId,
        request.params.bookingId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: booking });
    },
  );

  // Soft delete booking
  fastify.delete<{ Params: { workspaceId: string; bookingId: string } }>(
    "/:workspaceId/bookings/:bookingId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.BOOKING_UPDATE)] },
    async (request, reply) => {
      await BookingService.deleteBooking(
        request.tenant.workspaceId,
        request.params.bookingId,
        request.user!.id,
      );
      return reply.send({ success: true, data: { success: true, id: request.params.bookingId } });
    },
  );

  // Cancel booking
  fastify.post<{
    Params: { workspaceId: string; bookingId: string };
    Body: CancelBookingInput;
  }>(
    "/:workspaceId/bookings/:bookingId/cancel",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.BOOKING_CANCEL),
        validateBody(cancelBookingSchema),
      ],
    },
    async (request, reply) => {
      const booking = await BookingService.cancelBooking(
        request.tenant.workspaceId,
        request.params.bookingId,
        request.user!.id,
        request.body.reason,
      );
      return reply.send({ success: true, data: booking });
    },
  );

  // Complete booking
  fastify.post<{ Params: { workspaceId: string; bookingId: string } }>(
    "/:workspaceId/bookings/:bookingId/complete",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.BOOKING_UPDATE)],
    },
    async (request, reply) => {
      const booking = await BookingService.completeBooking(
        request.tenant.workspaceId,
        request.params.bookingId,
        request.user!.id,
      );
      return reply.send({ success: true, data: booking });
    },
  );
};
