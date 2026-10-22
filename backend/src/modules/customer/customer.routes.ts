import type { FastifyPluginAsync } from "fastify";
import { CustomerService } from "./customer.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@tripchange/shared";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type ListCustomersQuery,
} from "./customer.schemas.js";

export const customerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List customers in workspace
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: ListCustomersQuery;
  }>(
    "/:workspaceId/customers",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.CUSTOMER_READ),
        validateQuery(listCustomersQuerySchema),
      ],
    },
    async (request, reply) => {
      const result = await CustomerService.listCustomers(
        request.tenant.workspaceId,
        request.query,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // Get a single customer
  fastify.get<{ Params: { workspaceId: string; customerId: string } }>(
    "/:workspaceId/customers/:customerId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.CUSTOMER_READ)] },
    async (request, reply) => {
      const customer = await CustomerService.getCustomer(
        request.tenant.workspaceId,
        request.params.customerId,
      );
      return reply.send({ success: true, data: customer });
    },
  );

  // Create customer
  fastify.post<{
    Params: { workspaceId: string };
    Body: CreateCustomerInput;
  }>(
    "/:workspaceId/customers",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.CUSTOMER_CREATE),
        validateBody(createCustomerSchema),
      ],
    },
    async (request, reply) => {
      const customer = await CustomerService.createCustomer(
        request.tenant.workspaceId,
        request.user!.id,
        request.body,
      );
      return reply.status(201).send({ success: true, data: customer });
    },
  );

  // Update customer
  fastify.patch<{
    Params: { workspaceId: string; customerId: string };
    Body: UpdateCustomerInput;
  }>(
    "/:workspaceId/customers/:customerId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.CUSTOMER_UPDATE),
        validateBody(updateCustomerSchema),
      ],
    },
    async (request, reply) => {
      const updated = await CustomerService.updateCustomer(
        request.tenant.workspaceId,
        request.params.customerId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: updated });
    },
  );

  // Soft delete customer
  fastify.delete<{ Params: { workspaceId: string; customerId: string } }>(
    "/:workspaceId/customers/:customerId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.CUSTOMER_DELETE)] },
    async (request, reply) => {
      const result = await CustomerService.deleteCustomer(
        request.tenant.workspaceId,
        request.params.customerId,
        request.user!.id,
      );
      return reply.send({ success: true, data: result });
    },
  );
};
