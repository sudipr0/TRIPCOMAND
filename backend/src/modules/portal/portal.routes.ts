import type { FastifyPluginAsync } from "fastify";
import {
  travelerUploadDocumentSchema,
  portalAcknowledgeUpdateSchema,
  portalHelpRequestSchema,
} from "@trailcomand/shared";

import { PortalService } from "./portal.service.js";
import { validateBody } from "../../middleware/validation.js";

interface TokenParams {
  token: string;
}

interface UpdateParams extends TokenParams {
  updateId: string;
}

interface DocumentParams extends TokenParams {
  documentId: string;
}

/**
 * Public, unauthenticated client portal.
 *
 * These routes deliberately do NOT run authMiddleware or tenancyMiddleware:
 * the traveler has no account. The token IS the credential, so:
 *  - every response is a strict allow-list projection (no costs, staff, suppliers, notes);
 *  - invalid, revoked, expired and malformed tokens all return the same 404;
 *  - a tight per-route rate limit blunts brute-force token guessing;
 *  - every resource id in the URL is re-checked against the token's own
 *    workspace/trip/traveller, so a valid token cannot reach a sibling record.
 */
export const portalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: TokenParams }>(
    "/:token",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const data = await PortalService.getClientTripData(request.params.token);
      // Cached traveller data is private to one bearer link: never let a proxy or
      // the browser's back/forward cache hand it to someone else.
      reply.header("Cache-Control", "no-store");
      return { success: true, data };
    },
  );

  // Traveller confirms they have read a published update. Idempotent.
  fastify.post<{ Params: UpdateParams; Body: Record<string, unknown> }>(
    "/:token/acknowledge/:updateId",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      // The body only carries an optional clientId; the update id is in the path
      // and the traveller comes from the token, never from the payload.
      preHandler: [validateBody(portalAcknowledgeUpdateSchema.default({}))],
    },
    async (request, reply) => {
      const ack = await PortalService.acknowledgeUpdate(
        request.params.token,
        request.params.updateId,
      );
      reply.header("Cache-Control", "no-store");
      return { success: true, data: ack };
    },
  );

  // Traveller asks the agency for help. Filed into the office inquiry pipeline.
  fastify.post<{ Params: TokenParams; Body: Record<string, unknown> }>(
    "/:token/help-request",
    {
      // On top of the schema's length limits: a stuck client cannot flood the office.
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      preHandler: [validateBody(portalHelpRequestSchema)],
    },
    async (request, reply) => {
      const result = await PortalService.submitHelpRequest(
        request.params.token,
        request.body as never,
      );
      reply.header("Cache-Control", "no-store");
      return reply.status(201).send({ success: true, data: result });
    },
  );

  // Document metadata for one file the traveller owns. The response is a redirect
  // to the storage URL only after the ownership check passes; a document belonging
  // to another traveller is a 404, identical to a document that does not exist.
  fastify.get<{ Params: DocumentParams }>(
    "/:token/documents/:documentId/file",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const document = await PortalService.getTravelerDocument(
        request.params.token,
        request.params.documentId,
      );
      reply.header("Cache-Control", "no-store");
      return reply.redirect(document.fileUrl, 302);
    },
  );

  fastify.post<{ Params: TokenParams; Body: Record<string, unknown> }>(
    "/:token/documents",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      preHandler: [validateBody(travelerUploadDocumentSchema)],
    },
    async (request, reply) => {
      const document = await PortalService.uploadTravelerDocument(
        request.params.token,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: document });
    },
  );
};
