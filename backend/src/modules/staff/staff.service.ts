import { StaffRepository } from './staff.repository.js';
import type { StaffProfileWithDocuments } from './staff.repository.js';
import { AppError } from '../../lib/errors.js';
import { logAuditEvent } from '../../lib/audit.js';
import type {
  CreateStaffInput,
  UpdateStaffInput,
  ListStaffInput,
  CreateStaffDocumentInput,
  VerifyStaffDocumentInput,
  StaffProfileDetail,
  StaffDocumentDetail,
  ListStaffResult,
} from '@trailcomand/shared';
import type { Prisma } from '@prisma/client';

function toDocumentDetail(doc: {
  id: string;
  workspaceId: string;
  staffId: string;
  documentType: string;
  title: string;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  expiresAt: Date | null;
  verified: boolean;
  verifiedById: string | null;
  verifiedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): StaffDocumentDetail {
  return {
    id: doc.id,
    workspaceId: doc.workspaceId,
    staffId: doc.staffId,
    documentType: doc.documentType,
    title: doc.title,
    fileUrl: doc.fileUrl,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
    verified: doc.verified,
    verifiedById: doc.verifiedById,
    verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
    notes: doc.notes,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toStaffDetail(staff: StaffProfileWithDocuments): StaffProfileDetail {
  return {
    id: staff.id,
    workspaceId: staff.workspaceId,
    userId: staff.userId,
    staffType: staff.staffType,
    fullName: staff.fullName,
    email: staff.email,
    phone: staff.phone,
    whatsapp: staff.whatsapp,
    photoUrl: staff.photoUrl,
    licenseNumber: staff.licenseNumber,
    licenseExpiry: staff.licenseExpiry ? staff.licenseExpiry.toISOString() : null,
    languages: staff.languages,
    certifications: staff.certifications,
    experienceYears: staff.experienceYears,
    experienceLevel: staff.experienceLevel,
    preferredRoutes: staff.preferredRoutes,
    emergencyContactName: staff.emergencyContactName,
    emergencyContactPhone: staff.emergencyContactPhone,
    status: staff.status,
    notes: staff.notes,
    metadata: (staff.metadata ?? {}) as Record<string, unknown>,
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
    deletedAt: staff.deletedAt ? staff.deletedAt.toISOString() : null,
    documents: staff.documents.map(toDocumentDetail),
  };
}

export class StaffService {
  static async listStaff(
    workspaceId: string,
    filter: ListStaffInput,
  ): Promise<ListStaffResult> {
    const { total, items } = await StaffRepository.listStaff(workspaceId, filter);

    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map(toStaffDetail),
    };
  }

  static async getStaff(
    workspaceId: string,
    staffId: string,
  ): Promise<StaffProfileDetail> {
    const staff = await StaffRepository.findById(staffId, workspaceId);
    if (!staff) {
      throw AppError.notFound('Staff profile not found');
    }
    return toStaffDetail(staff);
  }

  static async createStaff(
    workspaceId: string,
    userId: string,
    input: CreateStaffInput,
  ): Promise<StaffProfileDetail> {
    if (input.email) {
      const existing = await StaffRepository.findByEmail(input.email, workspaceId);
      if (existing) {
        throw AppError.conflict(
          'A staff profile with this email already exists in this workspace',
        );
      }
    }

    const created = await StaffRepository.create(workspaceId, {
      staffType: input.staffType,
      fullName: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      photoUrl: input.photoUrl ?? null,
      licenseNumber: input.licenseNumber ?? null,
      licenseExpiry: input.licenseExpiry ?? null,
      languages: input.languages ?? [],
      certifications: input.certifications ?? [],
      experienceYears: input.experienceYears ?? null,
      experienceLevel: input.experienceLevel ?? null,
      preferredRoutes: input.preferredRoutes ?? [],
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      status: input.status ?? 'AVAILABLE',
      notes: input.notes ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'staff:created',
      entityType: 'staff_profile',
      entityId: created.id,
      details: {
        staffType: created.staffType,
        fullName: created.fullName,
        status: created.status,
      },
    });

    return this.getStaff(workspaceId, created.id);
  }

  static async updateStaff(
    workspaceId: string,
    staffId: string,
    userId: string,
    input: UpdateStaffInput,
  ): Promise<StaffProfileDetail> {
    const existing = await StaffRepository.findById(staffId, workspaceId);
    if (!existing) {
      throw AppError.notFound('Staff profile not found');
    }

    if (input.email && input.email !== existing.email) {
      const duplicate = await StaffRepository.findByEmail(input.email, workspaceId);
      if (duplicate) {
        throw AppError.conflict(
          'A staff profile with this email already exists in this workspace',
        );
      }
    }

    const updateData: Prisma.StaffProfileUpdateInput = {};
    if (input.staffType !== undefined) updateData.staffType = input.staffType;
    if (input.fullName !== undefined) updateData.fullName = input.fullName;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.whatsapp !== undefined) updateData.whatsapp = input.whatsapp;
    if (input.photoUrl !== undefined) updateData.photoUrl = input.photoUrl;
    if (input.licenseNumber !== undefined)
      updateData.licenseNumber = input.licenseNumber;
    if (input.licenseExpiry !== undefined)
      updateData.licenseExpiry = input.licenseExpiry;
    if (input.languages !== undefined) updateData.languages = input.languages;
    if (input.certifications !== undefined)
      updateData.certifications = input.certifications;
    if (input.experienceYears !== undefined)
      updateData.experienceYears = input.experienceYears;
    if (input.experienceLevel !== undefined)
      updateData.experienceLevel = input.experienceLevel;
    if (input.preferredRoutes !== undefined)
      updateData.preferredRoutes = input.preferredRoutes;
    if (input.emergencyContactName !== undefined)
      updateData.emergencyContactName = input.emergencyContactName;
    if (input.emergencyContactPhone !== undefined)
      updateData.emergencyContactPhone = input.emergencyContactPhone;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.metadata !== undefined)
      updateData.metadata = input.metadata as Prisma.InputJsonValue;

    await StaffRepository.update(staffId, workspaceId, updateData);

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'staff:updated',
      entityType: 'staff_profile',
      entityId: staffId,
      details: { changedFields: Object.keys(updateData) },
    });

    return this.getStaff(workspaceId, staffId);
  }

  static async deleteStaff(
    workspaceId: string,
    staffId: string,
    userId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await StaffRepository.findById(staffId, workspaceId);
    if (!existing) {
      throw AppError.notFound('Staff profile not found');
    }

    await StaffRepository.softDelete(staffId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'staff:deleted',
      entityType: 'staff_profile',
      entityId: staffId,
      details: { fullName: existing.fullName, staffType: existing.staffType },
    });

    return { success: true, id: staffId };
  }

  static async createDocument(
    workspaceId: string,
    staffId: string,
    userId: string,
    input: CreateStaffDocumentInput,
  ): Promise<StaffDocumentDetail> {
    const staff = await StaffRepository.findById(staffId, workspaceId);
    if (!staff) {
      throw AppError.notFound('Staff profile not found');
    }

    const document = await StaffRepository.createDocument(workspaceId, staffId, {
      documentType: input.documentType,
      title: input.title,
      fileUrl: input.fileUrl,
      fileName: input.fileName ?? null,
      fileSize: input.fileSize ?? null,
      mimeType: input.mimeType ?? null,
      expiresAt: input.expiresAt ?? null,
      notes: input.notes ?? null,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'staff:document_created',
      entityType: 'staff_document',
      entityId: document.id,
      details: {
        staffId,
        documentType: document.documentType,
        title: document.title,
      },
    });

    return toDocumentDetail(document);
  }

  static async verifyDocument(
    workspaceId: string,
    documentId: string,
    userId: string,
    input: VerifyStaffDocumentInput,
  ): Promise<StaffDocumentDetail> {
    const document = await StaffRepository.findDocumentById(documentId, workspaceId);
    if (!document) {
      throw AppError.notFound('Staff document not found');
    }

    const updated = await StaffRepository.verifyDocument(
      documentId,
      workspaceId,
      userId,
      input.verified,
      input.notes ?? null,
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: input.verified
        ? 'staff:document_verified'
        : 'staff:document_unverified',
      entityType: 'staff_document',
      entityId: documentId,
      details: {
        staffId: document.staffId,
        documentType: document.documentType,
      },
    });

    return toDocumentDetail(updated);
  }

  static async deleteDocument(
    workspaceId: string,
    documentId: string,
    userId: string,
  ): Promise<{ success: true; id: string }> {
    const document = await StaffRepository.findDocumentById(documentId, workspaceId);
    if (!document) {
      throw AppError.notFound('Staff document not found');
    }

    await StaffRepository.deleteDocument(documentId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'staff:document_deleted',
      entityType: 'staff_document',
      entityId: documentId,
      details: {
        staffId: document.staffId,
        documentType: document.documentType,
      },
    });

    return { success: true, id: documentId };
  }
}
