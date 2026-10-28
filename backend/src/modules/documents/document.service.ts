import { documentTypeSchema } from "@trailcomand/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { StoredDocumentMetadata, TripDocumentDetail } from "@trailcomand/shared";

import { AppError } from "../../lib/errors.js";
import { rawPrisma } from "../../lib/prisma.js";
import { logAuditEvent } from "../../lib/audit.js";
import { receiveDocumentUpload } from "./multipart.js";
import { DOCUMENT_MAX_BYTES } from './document-validation.js';
import { extensionForMimeType } from './document-validation.js';
import { localDocumentStorage } from './storage/local-storage.js';
import { safeDownloadContentType } from './document-validation.js';
import { contentDispositionHeader } from './document-validation.js';
import { sanitizeDisplayFilename } from './storage/local-storage.js';
import { isAllowedMimeType, mimeTypeForKey } from './document-validation.js';
import { LocalStorageAdapter, StorageError } from './storage/local-storage.js';

/**
 * Secure document storage for trips.
 *
 * `TripDocument.fileUrl` already exists and is what the portal reads, so a
 * locally stored file is recorded there as `local:<storage key>` — a scheme no
 * browser can follow, which keeps an old row from ever being treated as a public
 * link. Rows with an `http(s)` fileUrl (the earlier "paste a link" flow) keep
 * working exactly as before: this module only changes how *new* uploads are
 * stored and how a stored file is read back.
 */

export const LOCAL_FILE_PREFIX = "local:";

/** Permission error messages are deliberately vague so ids cannot be probed. */
const NOT_FOUND = "Document not found";

const DOCUMENT_SELECT = {
  id: true,
  workspaceId: true,
  tripId: true,
  travelerId: true,
  documentType: true,
  fileName: true,
  fileUrl: true,
  uploadedById: true,
  uploadedByTraveler: true,
  createdAt: true,
} as const;

export interface DocumentRow {
  id: string;
  workspaceId: string;
  tripId: string;
  travelerId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedById: string | null;
  uploadedByTraveler: boolean;
  createdAt: Date;
}

/** True when a `fileUrl` points at a file this adapter stored. */
export function isLocalStorageReference(fileUrl: string): boolean {
  return typeof fileUrl === "string" && fileUrl.startsWith(LOCAL_FILE_PREFIX);
}

/** `local:2026/10/x.pdf` -> `2026/10/x.pdf`. Throws for any other scheme. */
export function storageKeyFromReference(fileUrl: string): string {
  if (!isLocalStorageReference(fileUrl)) {
    throw new StorageError("Not a local storage reference", "INVALID_KEY");
  }
  return fileUrl.slice(LOCAL_FILE_PREFIX.length);
}

/** Content type for a row: derived from the stored key (server-controlled). */
export function contentTypeForRow(row: Pick<DocumentRow, "fileUrl">): string {
  const key = isLocalStorageReference(row.fileUrl)
    ? row.fileUrl.slice(LOCAL_FILE_PREFIX.length)
    : "";
  const mime = mimeTypeForKey(key);
  return mime ? safeDownloadContentType(mime) : "application/octet-stream";
}

export function toStoredDocumentMetadata(
  row: DocumentRow,
): StoredDocumentMetadata {
  const mime = contentTypeForRow(row);
  return {
    id: row.id,
    travelerId: row.travelerId,
    tripId: row.tripId,
    documentType: row.documentType,
    fileName: row.fileName,
    sizeBytes: 0,
    contentType: mime,
    uploadedByTraveler: row.uploadedByTraveler,
    createdAt: row.createdAt.toISOString(),
    // Never the storage key: the caller has to go through the download route,
    // which re-checks authorization on every request.
    downloadUrl: `/api/v1/workspaces/${row.workspaceId}/documents/${row.id}/file`,
  };
}

export class DocumentsRepository {
  /** A traveller must belong to the same workspace *and* trip as the document. */
  static async findTraveler(
    workspaceId: string,
    tripId: string,
    travelerId: string,
  ) {
    return rawPrisma.tripTraveler.findFirst({
      where: { id: travelerId, workspaceId, tripId, trip: { deletedAt: null } },
      select: { id: true, tripId: true },
    });
  }

  static async findTrip(workspaceId: string, tripId: string) {
    return rawPrisma.trip.findFirst({
      where: { id: tripId, workspaceId, deletedAt: null },
      select: { id: true },
    });
  }

  /** Scoped lookup: the workspace is always part of the WHERE clause. */
  static async findDocument(
    workspaceId: string,
    documentId: string,
  ): Promise<DocumentRow | null> {
    return rawPrisma.tripDocument.findFirst({
      where: { id: documentId, workspaceId, trip: { deletedAt: null } },
      select: DOCUMENT_SELECT,
    });
  }

  static async listForTrip(
    workspaceId: string,
    tripId: string,
  ): Promise<DocumentRow[]> {
    return rawPrisma.tripDocument.findMany({
      where: { workspaceId, tripId },
      orderBy: { createdAt: "desc" },
      select: DOCUMENT_SELECT,
    });
  }

  static async createDocument(data: {
    workspaceId: string;
    tripId: string;
    travelerId: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    uploadedById: string | null;
    uploadedByTraveler: boolean;
  }): Promise<DocumentRow> {
    return rawPrisma.tripDocument.create({
      data: { ...data, documentType: data.documentType as never },
      select: DOCUMENT_SELECT,
    });
  }

  static async deleteDocument(
    workspaceId: string,
    documentId: string,
  ): Promise<void> {
    await rawPrisma.tripDocument.deleteMany({
      where: { id: documentId, workspaceId },
    });
  }
}

export interface UploadDocumentInput {
  workspaceId: string;
  tripId: string;
  userId: string;
  /** When omitted the multipart field is read from the body. */
  travelerId?: string;
  documentType?: string;
  maxBytes?: number;
}

export class DocumentsService {
  /**
   * Accepts one multipart upload and records it.
   *
   * Order matters: the trip and traveller are authorised *before* any bytes are
   * written, so an unauthorised caller cannot use the endpoint to fill the disk.
   */
  static async upload(
    request: FastifyRequest,
    input: UploadDocumentInput,
    storage: LocalStorageAdapter = localDocumentStorage,
  ): Promise<StoredDocumentMetadata> {
    const trip = await DocumentsRepository.findTrip(
      input.workspaceId,
      input.tripId,
    );
    if (!trip) throw AppError.notFound("Trip not found");

    const { fields, file } = await receiveDocumentUpload(request, storage, {
      maxBytes: input.maxBytes ?? DOCUMENT_MAX_BYTES,
    });

    const travelerId = input.travelerId ?? fields.travelerId;
    const documentType = input.documentType ?? fields.documentType;
    if (!travelerId) {
      await storage.remove(file.storageKey).catch(() => undefined);
      throw AppError.badRequest("travelerId is required");
    }
    if (!documentType || !documentTypeSchema.safeParse(documentType).success) {
      await storage.remove(file.storageKey).catch(() => undefined);
      throw AppError.badRequest("documentType is invalid");
    }
    if (!isAllowedMimeType(file.mimeType)) {
      await storage.remove(file.storageKey).catch(() => undefined);
      throw AppError.badRequest("Only PDF, JPEG and PNG files are accepted");
    }

    const traveler = await DocumentsRepository.findTraveler(
      input.workspaceId,
      input.tripId,
      travelerId,
    );
    if (!traveler) {
      await storage.remove(file.storageKey).catch(() => undefined);
      throw AppError.notFound("Traveler not found on this trip");
    }

    const displayName = sanitizeDisplayFilename(
      file.originalName,
      extensionForMimeType(file.mimeType),
    );

    let created: DocumentRow;
    try {
      created = await DocumentsRepository.createDocument({
        workspaceId: input.workspaceId,
        tripId: input.tripId,
        travelerId,
        documentType,
        fileName: displayName,
        fileUrl: `${LOCAL_FILE_PREFIX}${file.storageKey}`,
        uploadedById: input.userId,
        uploadedByTraveler: false,
      });
    } catch (error) {
      // The row is the source of truth; without it the file is unreachable.
      await storage.remove(file.storageKey).catch(() => undefined);
      throw error;
    }

    await logAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: "trip.document.uploaded",
      entityType: "trip_document",
      entityId: created.id,
      details: {
        tripId: input.tripId,
        travelerId,
        documentType,
        sizeBytes: file.sizeBytes,
        storage: "local",
      },
    });

    return { ...toStoredDocumentMetadata(created), sizeBytes: file.sizeBytes };
  }

  /**
   * Streams a stored document to an authorised office user.
   *
   * The workspace comes from the tenant context, so a document belonging to
   * another workspace is indistinguishable from one that does not exist.
   */
  static async sendDocument(
    reply: FastifyReply,
    input: { workspaceId: string; documentId: string; asAttachment?: boolean },
    storage: LocalStorageAdapter = localDocumentStorage,
  ): Promise<void> {
    const row = await DocumentsRepository.findDocument(
      input.workspaceId,
      input.documentId,
    );
    if (!row) throw AppError.notFound(NOT_FOUND);

    const payload = await readStoredFile(row, storage);

    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Cache-Control", "private, no-store");
    reply.header("Content-Type", payload.contentType);
    reply.header("Content-Length", String(payload.sizeBytes));
    reply.header(
      "Content-Disposition",
      contentDispositionHeader(row.fileName, input.asAttachment !== true),
    );
    reply.header("Referrer-Policy", "no-referrer");
    reply.send(payload.stream);
  }

  /** Metadata for one document, for the trip's document list. */
  static async getMetadata(workspaceId: string, documentId: string) {
    const row = await DocumentsRepository.findDocument(workspaceId, documentId);
    if (!row) throw AppError.notFound(NOT_FOUND);
    const size = isLocalStorageReference(row.fileUrl)
      ? await localDocumentStorage.sizeOf(storageKeyFromReference(row.fileUrl))
      : null;
    return { ...toStoredDocumentMetadata(row), sizeBytes: size ?? 0 };
  }

  static async list(
    workspaceId: string,
    tripId: string,
  ): Promise<TripDocumentDetail[]> {
    const trip = await DocumentsRepository.findTrip(workspaceId, tripId);
    if (!trip) throw AppError.notFound("Trip not found");
    const rows = await DocumentsRepository.listForTrip(workspaceId, tripId);
    return rows.map((row) => ({
      id: row.id,
      documentType: row.documentType as TripDocumentDetail["documentType"],
      fileName: row.fileName,
      fileUrl: isLocalStorageReference(row.fileUrl)
        ? `/api/v1/workspaces/${row.workspaceId}/documents/${row.id}/file`
        : row.fileUrl,
      uploadedByTraveler: row.uploadedByTraveler,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /** Removes the row and, when it points at local storage, the file behind it. */
  static async remove(
    workspaceId: string,
    documentId: string,
    userId: string,
    storage: LocalStorageAdapter = localDocumentStorage,
  ): Promise<void> {
    const row = await DocumentsRepository.findDocument(workspaceId, documentId);
    if (!row) throw AppError.notFound(NOT_FOUND);
    await DocumentsRepository.deleteDocument(workspaceId, documentId);
    if (isLocalStorageReference(row.fileUrl)) {
      await storage
        .remove(storageKeyFromReference(row.fileUrl))
        .catch(() => undefined);
    }
    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.document.deleted",
      entityType: "trip_document",
      entityId: documentId,
      details: { tripId: row.tripId, travelerId: row.travelerId },
    });
  }
}

/** Resolves a row to a readable stream plus the headers it should be sent with. */
export async function readStoredFile(
  row: Pick<DocumentRow, "fileUrl" | "fileName">,
  storage: LocalStorageAdapter = localDocumentStorage,
): Promise<{
  stream: NodeJS.ReadableStream;
  contentType: string;
  sizeBytes: number;
}> {
  if (!isLocalStorageReference(row.fileUrl)) {
    // Legacy external links are not proxied: fetching them would turn this
    // endpoint into an SSRF gadget and leak the agency's links.
    throw AppError.notFound(
      "This document is stored externally and has no local file",
    );
  }
  const key = storageKeyFromReference(row.fileUrl);
  const sizeBytes = await storage.sizeOf(key);
  if (sizeBytes === null) throw AppError.notFound(NOT_FOUND);
  return {
    stream: storage.createReadStream(key),
    contentType: contentTypeForRow(row),
    sizeBytes,
  };
}
