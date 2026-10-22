import type { StaffType, StaffStatus } from '@prisma/client';
import type { Prisma, StaffProfile, StaffDocument } from '@prisma/client';

import { rawPrisma } from '../../lib/prisma.js';
import type { ListStaffInput } from './staff.schemas.js';

const STAFF_DOCUMENT_INCLUDE = {
  documents: {
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.StaffProfileInclude;

export type StaffProfileWithDocuments = Prisma.StaffProfileGetPayload<{
  include: typeof STAFF_DOCUMENT_INCLUDE;
}>;

export class StaffRepository {
  /**
   * List staff profiles scoped to a workspace.
   * Every query filters by workspaceId to enforce tenancy.
   */
  static async listStaff(
    workspaceId: string,
    filter: ListStaffInput,
  ): Promise<{ total: number; items: StaffProfileWithDocuments[] }> {
    const where: Prisma.StaffProfileWhereInput = {
      workspaceId,
      ...(filter.includeDeleted ? {} : { deletedAt: null }),
      ...(filter.staffType ? { staffType: filter.staffType } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search
        ? {
            OR: [
              { fullName: { contains: filter.search, mode: 'insensitive' } },
              { email: { contains: filter.search, mode: 'insensitive' } },
              { phone: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      rawPrisma.staffProfile.count({ where }),
      rawPrisma.staffProfile.findMany({
        where,
        include: STAFF_DOCUMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: filter.limit,
        skip: filter.offset,
      }),
    ]);

    return { total, items };
  }

  static async findById(
    id: string,
    workspaceId: string,
  ): Promise<StaffProfileWithDocuments | null> {
    return rawPrisma.staffProfile.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: STAFF_DOCUMENT_INCLUDE,
    });
  }

  static async findByEmail(
    email: string,
    workspaceId: string,
  ): Promise<StaffProfile | null> {
    return rawPrisma.staffProfile.findFirst({
      where: { email, workspaceId, deletedAt: null },
    });
  }

  static async create(
    workspaceId: string,
    data: {
      staffType: StaffType;
      fullName: string;
      email?: string | null;
      phone?: string | null;
      whatsapp?: string | null;
      photoUrl?: string | null;
      licenseNumber?: string | null;
      licenseExpiry?: Date | null;
      languages: string[];
      certifications: string[];
      experienceYears?: number | null;
      experienceLevel?: string | null;
      preferredRoutes: string[];
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      status: StaffStatus;
      notes?: string | null;
      metadata: Prisma.InputJsonValue;
    },
  ): Promise<StaffProfile> {
    return rawPrisma.staffProfile.create({
      data: {
        workspaceId,
        ...data,
      },
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.StaffProfileUpdateInput,
  ): Promise<StaffProfile> {
    // Guard tenancy by asserting existence within workspace first.
    const existing = await rawPrisma.staffProfile.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('Staff profile not found in workspace');
    }

    return rawPrisma.staffProfile.update({
      where: { id },
      data,
    });
  }

  static async softDelete(
    id: string,
    workspaceId: string,
  ): Promise<StaffProfile> {
    const existing = await rawPrisma.staffProfile.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('Staff profile not found in workspace');
    }

    return rawPrisma.staffProfile.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });
  }

  // ---- Staff documents ----

  static async findDocumentById(
    id: string,
    workspaceId: string,
  ): Promise<StaffDocument | null> {
    return rawPrisma.staffDocument.findFirst({
      where: { id, workspaceId },
    });
  }

  static async createDocument(
    workspaceId: string,
    staffId: string,
    data: {
      documentType: string;
      title: string;
      fileUrl: string;
      fileName?: string | null;
      fileSize?: number | null;
      mimeType?: string | null;
      expiresAt?: Date | null;
      notes?: string | null;
    },
  ): Promise<StaffDocument> {
    return rawPrisma.staffDocument.create({
      data: {
        workspaceId,
        staffId,
        ...data,
      },
    });
  }

  static async verifyDocument(
    id: string,
    workspaceId: string,
    verifiedById: string,
    verified: boolean,
    notes?: string | null,
  ): Promise<StaffDocument> {
    const existing = await rawPrisma.staffDocument.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('Staff document not found in workspace');
    }

    return rawPrisma.staffDocument.update({
      where: { id },
      data: {
        verified,
        verifiedById: verified ? verifiedById : null,
        verifiedAt: verified ? new Date() : null,
        ...(notes !== undefined ? { notes } : {}),
      },
    });
  }

  static async deleteDocument(
    id: string,
    workspaceId: string,
  ): Promise<StaffDocument> {
    const existing = await rawPrisma.staffDocument.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('Staff document not found in workspace');
    }

    return rawPrisma.staffDocument.delete({
      where: { id },
    });
  }
}
