import type { FastifyPluginAsync } from "fastify";
import { PaymentService } from "./payment.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@trailcomand/shared";
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  type CreatePaymentInput,
  type ListPaymentsQuery,
} from "@trailcomand/shared";

export const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List payments for a booking (or filtered by query)
  fastify.get<{
    Params: { workspaceId: string; bookingId: string };
    Querystring: ListPaymentsQuery;
  }>(
    "/:workspaceId/bookings/:bookingId/payments",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.PAYMENT_READ),
        validateQuery(listPaymentsQuerySchema),
      ],
    },
    async (request, reply) => {
      const result = await PaymentService.listPayments(
        request.tenant.workspaceId,
        { ...request.query, bookingId: request.params.bookingId },
      );
      return reply.send({ success: true, data: result });
    },
  );

  // Record a payment for a booking
  fastify.post<{
    Params: { workspaceId: string; bookingId: string };
    Body: CreatePaymentInput;
  }>(
    "/:workspaceId/bookings/:bookingId/payments",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.PAYMENT_CREATE),
        validateBody(createPaymentSchema),
      ],
    },
    async (request, reply) => {
      const result = await PaymentService.recordPayment(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.bookingId,
        request.body,
      );
      return reply.status(201).send({ success: true, data: result });
    },
  );

  // Get a single payment
  fastify.get<{ Params: { workspaceId: string; paymentId: string } }>(
    "/:workspaceId/payments/:paymentId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.PAYMENT_READ)] },
    async (request, reply) => {
      const payment = await PaymentService.getPayment(
        request.tenant.workspaceId,
        request.params.paymentId,
      );
      return reply.send({ success: true, data: payment });
    },
  );
};
