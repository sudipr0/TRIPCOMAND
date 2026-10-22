import type { Prisma } from "@prisma/client";

import { AgencyRepository } from "./agency.repository.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import type {
  UpdateAgencyProfileInput,
  UpdateAgencySettingsInput,
  AgencyProfileDetail,
} from "@tripchange/shared";

type WorkspaceSettings = Record<string, unknown>;

function readSettings(settings: Prisma.JsonValue | null): WorkspaceSettings {
  if (settings && typeof settings === "object" && !Array.isArray(settings)) {
    return settings as WorkspaceSettings;
  }
  return {};
}

function readString(settings: WorkspaceSettings, key: string): string | null {
  const value = settings[key];
  return typeof value === "string" ? value : null;
}

function toAgencyProfileDetail(workspace: {
  id: string;
  name: string;
  slug: string;
  settings: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}): AgencyProfileDetail {
  const settings = readSettings(workspace.settings);

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    status: readString(settings, "status") ?? "active",
    currency: readString(settings, "currency") ?? "NPR",
    timezone: readString(settings, "timezone") ?? "Asia/Kathmandu",
    locale: readString(settings, "locale") ?? "en",
    contactEmail: readString(settings, "contactEmail"),
    contactPhone: readString(settings, "contactPhone"),
    address: readString(settings, "address"),
    taxId: readString(settings, "taxId"),
    website: readString(settings, "website"),
    logoUrl: readString(settings, "logoUrl"),
    businessPolicies: settings.businessPolicies ?? null,
    settings: workspace.settings ?? null,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

function mergeSettings(
  current: Prisma.JsonValue | null,
  patch: WorkspaceSettings,
): Prisma.InputJsonValue {
  return { ...readSettings(current), ...patch } as Prisma.InputJsonValue;
}

export class AgencyService {
  static async getProfile(workspaceId: string): Promise<AgencyProfileDetail> {
    const workspace = await AgencyRepository.findById(workspaceId);
    if (!workspace) {
      throw AppError.notFound("Agency profile not found");
    }

    return toAgencyProfileDetail(workspace);
  }

  static async updateProfile(
    workspaceId: string,
    userId: string,
    input: UpdateAgencyProfileInput,
  ): Promise<AgencyProfileDetail> {
    const existing = await AgencyRepository.findById(workspaceId);
    if (!existing) {
      throw AppError.notFound("Agency profile not found");
    }

    const { name, ...settingsPatch } = input;

    const updateData: Prisma.WorkspaceUpdateInput = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    const settings = mergeSettings(existing.settings, settingsPatch);
    updateData.settings = settings;

    const updated = await AgencyRepository.update(workspaceId, updateData);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "agency.profile.updated",
      entityType: "workspace",
      entityId: workspaceId,
      details: { changedFields: Object.keys(input) },
    });

    return toAgencyProfileDetail(updated);
  }

  static async updateSettings(
    workspaceId: string,
    userId: string,
    input: UpdateAgencySettingsInput,
  ): Promise<AgencyProfileDetail> {
    const existing = await AgencyRepository.findById(workspaceId);
    if (!existing) {
      throw AppError.notFound("Agency profile not found");
    }

    const settings = mergeSettings(existing.settings, input);

    const updated = await AgencyRepository.update(workspaceId, { settings });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "agency.settings.updated",
      entityType: "workspace",
      entityId: workspaceId,
      details: { changedFields: Object.keys(input) },
    });

    return toAgencyProfileDetail(updated);
  }
}
