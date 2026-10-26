import type { FastifyPluginAsync } from 'fastify';
import { StaffService } from './staff.service.js';
import { authMiddleware } from '../../middleware/auth.js';
import { tenancyMiddleware } from '../../middleware/tenancy.js';
import { permissionMiddleware } from '../../middleware/permission.js';
import { validateBody, validateQuery } from '../../middleware/validation.js';
import { PERMISSION_CODES } from '@trailcomand/shared';
import {
  createStaffSchema,
  updateStaffSchema,
  listStaffSchema,
  createStaffDocumentSchema,
  verifyStaffDocumentSchema,
  type CreateStaffInput,
  type UpdateStaffInput,
  type ListStaffInput,
  type CreateStaffDocumentInput,
  type VerifyStaffDocumentInput,
} from './staff.schemas.js';

export const staffRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', tenancyMiddleware);

  // List staff profiles in workspace
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: ListStaffInput;
  }>(
    '/:workspaceId/staff',
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_READ),
        validateQuery(listStaffSchema),
      ],
    },
    async (request, reply) => {
      const result = await StaffService.listStaff(
        request.tenant.workspaceId,
        request.query,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // Get a single staff profile
  fastify.get<{ Params: { workspaceId: string; staffId: string } }>(
    '/:workspaceId/staff/:staffId',
    { preHandler: [permissionMiddleware(PERMISSION_CODES.STAFF_READ)] },
    async (request, reply) => {
      const staff = await StaffService.getStaff(
        request.tenant.workspaceId,
        request.params.staffId,
      );
      return reply.send({ success: true, data: staff });
    },
  );

  // Create staff profile
  fastify.post<{ Params: { workspaceId: string }; Body: CreateStaffInput }>(
    '/:workspaceId/staff',
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_CREATE),
        validateBody(createStaffSchema),
      ],
    },
    async (request, reply) => {
      const staff = await StaffService.createStaff(
        request.tenant.workspaceId,
        request.user!.id,
        request.body,
      );
      return reply.status(201).send({ success: true, data: staff });
    },
  );

  // Update staff profile
  fastify.patch<{
    Params: { workspaceId: string; staffId: string };
    Body: UpdateStaffInput;
  }>(
    '/:workspaceId/staff/:staffId',
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_UPDATE),
        validateBody(updateStaffSchema),
      ],
    },
    async (request, reply) => {
      const updated = await StaffService.updateStaff(
        request.tenant.workspaceId,
        request.params.staffId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: updated });
    },
  );

  // Soft delete staff profile
  fastify.delete<{ Params: { workspaceId: string; staffId: string } }>(
    '/:workspaceId/staff/:staffId',
    { preHandler: [permissionMiddleware(PERMISSION_CODES.STAFF_DELETE)] },
    async (request, reply) => {
      const result = await StaffService.deleteStaff(
        request.tenant.workspaceId,
        request.params.staffId,
        request.user!.id,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // Create staff document
  fastify.post<{
    Params: { workspaceId: string; staffId: string };
    Body: CreateStaffDocumentInput;
  }>(
    '/:workspaceId/staff/:staffId/documents',
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_UPDATE),
        validateBody(createStaffDocumentSchema),
      ],
    },
    async (request, reply) => {
      const document = await StaffService.createDocument(
        request.tenant.workspaceId,
        request.params.staffId,
        request.user!.id,
        request.body,
      );
      return reply.status(201).send({ success: true, data: document });
    },
  );

  // Verify/unverify staff document
  fastify.patch<{
    Params: { workspaceId: string; documentId: string };
    Body: VerifyStaffDocumentInput;
  }>(
    '/:workspaceId/staff-documents/:documentId/verify',
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_VERIFY),
        validateBody(verifyStaffDocumentSchema),
      ],
    },
    async (request, reply) => {
      const document = await StaffService.verifyDocument(
        request.tenant.workspaceId,
        request.params.documentId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: document });
    },
  );

  // Delete staff document
  fastify.delete<{ Params: { workspaceId: string; documentId: string } }>(
    '/:workspaceId/staff-documents/:documentId',
    { preHandler: [permissionMiddleware(PERMISSION_CODES.STAFF_UPDATE)] },
    async (request, reply) => {
      const result = await StaffService.deleteDocument(
        request.tenant.workspaceId,
        request.params.documentId,
        request.user!.id,
      );
      return reply.send({ success: true, data: result });
    },
  );
};
