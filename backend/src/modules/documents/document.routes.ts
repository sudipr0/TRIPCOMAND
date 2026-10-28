import type { FastifyPluginAsync } from "fastify";
import { PERMISSION_CODES, documentTypeSchema } from "@trailcomand/shared";
import { DocumentsService } from "./document.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { AppError } from "../../lib/errors.js";

interface WorkspaceParams {
  workspaceId: string;
}
interface TripParams extends WorkspaceParams {
  tripId: string;
}
interface DocumentParams extends WorkspaceParams {
  documentId: string;
}

/**
 * Trip documents stored on the local filesystem.
 *
 * Every route runs session auth + tenancy first and takes the workspace from
 * `request.tenant`, never from the URL: the `:workspaceId` segment only selects
 * the tenant that tenancyMiddleware then has to prove membership of. There is no
 * static `/uploads` route — a file is only reachable through `GET /documents/:id/file`,
 * which re-authorises on every request.
 */
export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // Upload. The body is multipart; fields are validated after the stream is read
  // so a malformed part fails before the file is written.
  fastify.post<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/documents/upload",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE)],
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const metadata = await DocumentsService.upload(request, {
        workspaceId: request.tenant.workspaceId,
        tripId: request.params.tripId,
        userId: request.user!.id,
      });
      return reply.status(201).send({ success: true, data: metadata });
    },
  );

  fastify.get<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/documents/files",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request) => {
      const documents = await DocumentsService.list(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data: documents };
    },
  );

  fastify.get<{ Params: DocumentParams; Querystring: { download?: string } }>(
    "/:workspaceId/documents/:documentId/file",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request, reply) => {
      await DocumentsService.sendDocument(reply, {
        workspaceId: request.tenant.workspaceId,
        documentId: request.params.documentId,
        asAttachment: request.query.download === "1",
      });
    },
  );

  fastify.get<{ Params: DocumentParams }>(
    "/:workspaceId/documents/:documentId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request) => {
      const metadata = await DocumentsService.getMetadata(
        request.tenant.workspaceId,
        request.params.documentId,
      );
      return { success: true, data: metadata };
    },
  );

  fastify.delete<{ Params: DocumentParams }>(
    "/:workspaceId/documents/:documentId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE)] },
    async (request) => {
      await DocumentsService.remove(
        request.tenant.workspaceId,
        request.params.documentId,
        request.user!.id,
      );
      return { success: true, data: { id: request.params.documentId } };
    },
  );
};

/** Exported for tests: the same enum the upload path validates against. */
export function parseDocumentType(value: unknown): string {
  const parsed = documentTypeSchema.safeParse(value);
  if (!parsed.success) throw AppError.badRequest("Unsupported document type");
  return parsed.data;
}
