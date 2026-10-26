import type { Prisma } from '@prisma/client';

import type { DestinationDetail } from '@trailcomand/shared';
import type { TrekTemplateDetail } from '@trailcomand/shared';
import type { TrekTemplateDayDetail } from '@trailcomand/shared';
import type { ListTrekTemplatesQuery } from '@trailcomand/shared';
import type { CreateTrekTemplateInput } from '@trailcomand/shared';
import type { UpdateTrekTemplateInput } from '@trailcomand/shared';
import type { ListTrekTemplatesResult } from '@trailcomand/shared';
import type { CreateTrekTemplateDayInput } from '@trailcomand/shared';
import type { UpdateTrekTemplateDayInput } from '@trailcomand/shared';
import type { ReorderTrekTemplateDaysInput } from '@trailcomand/shared';

import { AppError } from '../../lib/errors.js';
import { logAuditEvent } from '../../lib/audit.js';
import { TrekTemplateRepository } from './trek-template.repository.js';
import type { TrekTemplateWithDays } from './trek-template.repository.js';
import type { TrekTemplateWithDetail } from './trek-template.repository.js';
import type { CreateTrekTemplateDayData } from './trek-template.repository.js';

function toDestinationDetail(destination: {
  id: string;
  workspaceId: string;
  name: string;
  region: string | null;
  country: string;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  altitude: number | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): DestinationDetail {
  return {
    id: destination.id,
    workspaceId: destination.workspaceId,
    name: destination.name,
    region: destination.region,
    country: destination.country,
    latitude:
      destination.latitude !== null ? destination.latitude.toString() : null,
    longitude:
      destination.longitude !== null ? destination.longitude.toString() : null,
    altitude: destination.altitude,
    description: destination.description,
    imageUrl: destination.imageUrl,
    createdAt: destination.createdAt.toISOString(),
    updatedAt: destination.updatedAt.toISOString(),
    deletedAt: destination.deletedAt ? destination.deletedAt.toISOString() : null,
  };
}

function toDayDetail(day: {
  id: string;
  templateId: string;
  dayNumber: number;
  title: string;
  description: string | null;
  startLocation: string | null;
  endLocation: string | null;
  altitude: number | null;
  walkingHours: Prisma.Decimal | null;
  accommodation: string | null;
  meals: string[];
  activities: string[];
  createdAt: Date;
  updatedAt: Date;
}): TrekTemplateDayDetail {
  return {
    id: day.id,
    templateId: day.templateId,
    dayNumber: day.dayNumber,
    title: day.title,
    description: day.description,
    startLocation: day.startLocation,
    endLocation: day.endLocation,
    altitude: day.altitude,
    walkingHours: day.walkingHours !== null ? day.walkingHours.toString() : null,
    accommodation: day.accommodation,
    meals: day.meals,
    activities: day.activities,
    createdAt: day.createdAt.toISOString(),
    updatedAt: day.updatedAt.toISOString(),
  };
}

type TemplateForDetail = TrekTemplateWithDetail | TrekTemplateWithDays;

function toTemplateDetail(
  template: TemplateForDetail,
  options: { withDays: boolean; withDestination: boolean },
): TrekTemplateDetail {
  const base: TrekTemplateDetail = {
    id: template.id,
    workspaceId: template.workspaceId,
    destinationId: template.destinationId,
    name: template.name,
    code: template.code,
    description: template.description,
    region: template.region,
    difficulty: template.difficulty,
    durationDays: template.durationDays,
    maxAltitude: template.maxAltitude,
    bestSeasons: template.bestSeasons,
    basePrice: template.basePrice !== null ? template.basePrice.toString() : null,
    basePriceCurrency: template.basePriceCurrency,
    requiredDocuments: template.requiredDocuments,
    packingList: (template.packingList ?? null) as unknown,
    preparationNotes: template.preparationNotes,
    inclusions: template.inclusions,
    exclusions: template.exclusions,
    terms: template.terms,
    status: template.status,
    metadata: (template.metadata ?? {}) as unknown,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    deletedAt: template.deletedAt ? template.deletedAt.toISOString() : null,
  };

  if (options.withDays && 'days' in template) {
    base.days = template.days.map(toDayDetail);
  }

  if (options.withDestination && 'destination' in template) {
    base.destination = template.destination
      ? toDestinationDetail(template.destination)
      : null;
  }

  return base;
}

function toDayInputs(
  days: CreateTrekTemplateInput['days'],
): CreateTrekTemplateDayData[] {
  if (!days) return [];
  return days.map((day) => ({
    dayNumber: day.dayNumber,
    title: day.title,
    description: day.description ?? null,
    startLocation: day.startLocation ?? null,
    endLocation: day.endLocation ?? null,
    altitude: day.altitude ?? null,
    walkingHours: day.walkingHours ?? null,
    accommodation: day.accommodation ?? null,
    meals: day.meals ?? [],
    activities: day.activities ?? [],
  }));
}

export class TrekTemplateService {
  static async listTemplates(
    workspaceId: string,
    filter: ListTrekTemplatesQuery,
  ): Promise<ListTrekTemplatesResult> {
    const { total, items } = await TrekTemplateRepository.listTemplates(
      workspaceId,
      filter,
    );

    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map((item) =>
        toTemplateDetail(item, { withDays: true, withDestination: false }),
      ),
    };
  }

  static async getTemplate(
    workspaceId: string,
    templateId: string,
  ): Promise<TrekTemplateDetail> {
    const template = await TrekTemplateRepository.findById(
      templateId,
      workspaceId,
    );
    if (!template) {
      throw AppError.notFound('Trek template not found');
    }
    return toTemplateDetail(template, {
      withDays: true,
      withDestination: true,
    });
  }

  static async createTemplate(
    workspaceId: string,
    userId: string,
    input: CreateTrekTemplateInput,
  ): Promise<TrekTemplateDetail> {
    const existing = await TrekTemplateRepository.findByName(
      input.name,
      workspaceId,
    );
    if (existing) {
      throw AppError.conflict(
        'A trek template with this name already exists in this workspace',
      );
    }

    const created = await TrekTemplateRepository.create(workspaceId, {
      name: input.name,
      code: input.code ?? null,
      description: input.description ?? null,
      region: input.region ?? null,
      difficulty: input.difficulty,
      durationDays: input.durationDays,
      maxAltitude: input.maxAltitude ?? null,
      bestSeasons: input.bestSeasons ?? [],
      basePrice: input.basePrice ?? null,
      basePriceCurrency: input.basePriceCurrency ?? 'NPR',
      requiredDocuments: input.requiredDocuments ?? [],
      packingList: (input.packingList ?? null) as Prisma.InputJsonValue | null,
      preparationNotes: input.preparationNotes ?? null,
      inclusions: input.inclusions ?? [],
      exclusions: input.exclusions ?? [],
      terms: input.terms ?? null,
      destinationId: input.destinationId ?? null,
      status: 'DRAFT',
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      days: toDayInputs(input.days),
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'template.created',
      entityType: 'trek_template',
      entityId: created.id,
      details: { name: created.name, difficulty: created.difficulty },
    });

    return toTemplateDetail(created, {
      withDays: true,
      withDestination: true,
    });
  }

  static async updateTemplate(
    workspaceId: string,
    templateId: string,
    userId: string,
    input: UpdateTrekTemplateInput,
  ): Promise<TrekTemplateDetail> {
    const existing = await TrekTemplateRepository.findById(
      templateId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound('Trek template not found');
    }

    if (input.name !== undefined && input.name !== existing.name) {
      const duplicate = await TrekTemplateRepository.findByName(
        input.name,
        workspaceId,
      );
      if (duplicate) {
        throw AppError.conflict(
          'A trek template with this name already exists in this workspace',
        );
      }
    }

    const updateData: Prisma.TrekTemplateUpdateInput = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.code !== undefined) updateData.code = input.code;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.region !== undefined) updateData.region = input.region;
    if (input.difficulty !== undefined)
      updateData.difficulty = input.difficulty;
    if (input.durationDays !== undefined)
      updateData.durationDays = input.durationDays;
    if (input.maxAltitude !== undefined)
      updateData.maxAltitude = input.maxAltitude;
    if (input.bestSeasons !== undefined)
      updateData.bestSeasons = input.bestSeasons;
    if (input.basePrice !== undefined) updateData.basePrice = input.basePrice;
    if (input.basePriceCurrency !== undefined)
      updateData.basePriceCurrency = input.basePriceCurrency;
    if (input.requiredDocuments !== undefined)
      updateData.requiredDocuments = input.requiredDocuments;
    if (input.packingList !== undefined)
      updateData.packingList = input.packingList as Prisma.InputJsonValue;
    if (input.preparationNotes !== undefined)
      updateData.preparationNotes = input.preparationNotes;
    if (input.inclusions !== undefined)
      updateData.inclusions = input.inclusions;
    if (input.exclusions !== undefined)
      updateData.exclusions = input.exclusions;
    if (input.terms !== undefined) updateData.terms = input.terms;
    if (input.destinationId !== undefined)
      updateData.destination = input.destinationId
        ? { connect: { id: input.destinationId } }
        : { disconnect: true };
    if (input.status !== undefined) updateData.status = input.status;
    if (input.metadata !== undefined)
      updateData.metadata = input.metadata as Prisma.InputJsonValue;

    const updated = await TrekTemplateRepository.update(
      templateId,
      workspaceId,
      updateData,
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'template.updated',
      entityType: 'trek_template',
      entityId: templateId,
      details: { changedFields: Object.keys(updateData) },
    });

    return toTemplateDetail(updated, {
      withDays: true,
      withDestination: true,
    });
  }

  static async deleteTemplate(
    workspaceId: string,
    templateId: string,
    userId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await TrekTemplateRepository.findById(
      templateId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound('Trek template not found');
    }

    await TrekTemplateRepository.softDelete(templateId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'template.deleted',
      entityType: 'trek_template',
      entityId: templateId,
      details: { name: existing.name },
    });

    return { success: true, id: templateId };
  }

  static async duplicateTemplate(
    workspaceId: string,
    templateId: string,
    userId: string,
    newName: string,
  ): Promise<TrekTemplateDetail> {
    const source = await TrekTemplateRepository.findById(
      templateId,
      workspaceId,
    );
    if (!source) {
      throw AppError.notFound('Trek template not found');
    }

    const existing = await TrekTemplateRepository.findByName(
      newName,
      workspaceId,
    );
    if (existing) {
      throw AppError.conflict(
        'A trek template with this name already exists in this workspace',
      );
    }

    const created = await TrekTemplateRepository.create(workspaceId, {
      name: newName,
      code: source.code,
      description: source.description,
      region: source.region,
      difficulty: source.difficulty,
      durationDays: source.durationDays,
      maxAltitude: source.maxAltitude,
      bestSeasons: source.bestSeasons,
      basePrice: source.basePrice !== null ? source.basePrice.toNumber() : null,
      basePriceCurrency: source.basePriceCurrency,
      requiredDocuments: source.requiredDocuments,
      packingList: source.packingList as Prisma.InputJsonValue | null,
      preparationNotes: source.preparationNotes,
      inclusions: source.inclusions,
      exclusions: source.exclusions,
      terms: source.terms,
      destinationId: source.destinationId,
      status: 'DRAFT',
      metadata: source.metadata as Prisma.InputJsonValue,
      days: source.days.map((day) => ({
        dayNumber: day.dayNumber,
        title: day.title,
        description: day.description,
        startLocation: day.startLocation,
        endLocation: day.endLocation,
        altitude: day.altitude,
        walkingHours: day.walkingHours !== null ? day.walkingHours.toNumber() : null,
        accommodation: day.accommodation,
        meals: day.meals,
        activities: day.activities,
      })),
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'template.duplicated',
      entityType: 'trek_template',
      entityId: created.id,
      details: { sourceTemplateId: templateId, name: created.name },
    });

    return toTemplateDetail(created, {
      withDays: true,
      withDestination: true,
    });
  }

  static async listDays(
    workspaceId: string,
    templateId: string,
  ): Promise<TrekTemplateDayDetail[]> {
    const template = await TrekTemplateRepository.findById(
      templateId,
      workspaceId,
    );
    if (!template) {
      throw AppError.notFound('Trek template not found');
    }
    return template.days.map(toDayDetail);
  }

  static async addDay(
    workspaceId: string,
    templateId: string,
    userId: string,
    input: CreateTrekTemplateDayInput,
  ): Promise<TrekTemplateDayDetail> {
    const template = await TrekTemplateRepository.findById(
      templateId,
      workspaceId,
    );
    if (!template) {
      throw AppError.notFound('Trek template not found');
    }

    const duplicate = await TrekTemplateRepository.findDayByNumber(
      templateId,
      input.dayNumber,
    );
    if (duplicate) {
      throw AppError.conflict(
        'A day with this day number already exists in this trek template',
      );
    }

    const day = await TrekTemplateRepository.addDay(workspaceId, templateId, {
      dayNumber: input.dayNumber,
      title: input.title,
      description: input.description ?? null,
      startLocation: input.startLocation ?? null,
      endLocation: input.endLocation ?? null,
      altitude: input.altitude ?? null,
      walkingHours: input.walkingHours ?? null,
      accommodation: input.accommodation ?? null,
      meals: input.meals ?? [],
      activities: input.activities ?? [],
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'template.day.added',
      entityType: 'trek_template_day',
      entityId: day.id,
      details: { templateId, dayNumber: day.dayNumber },
    });

    return toDayDetail(day);
  }

  static async updateDay(
    workspaceId: string,
    dayId: string,
    userId: string,
    input: UpdateTrekTemplateDayInput,
  ): Promise<TrekTemplateDayDetail> {
    const existing = await TrekTemplateRepository.findDayById(dayId, workspaceId);
    if (!existing) {
      throw AppError.notFound('Trek template day not found');
    }

    if (input.dayNumber !== undefined && input.dayNumber !== existing.dayNumber) {
      const duplicate = await TrekTemplateRepository.findDayByNumber(
        existing.templateId,
        input.dayNumber,
      );
      if (duplicate) {
        throw AppError.conflict(
          'A day with this day number already exists in this trek template',
        );
      }
    }

    const updateData: Prisma.TrekTemplateDayUpdateInput = {};
    if (input.dayNumber !== undefined) updateData.dayNumber = input.dayNumber;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.startLocation !== undefined)
      updateData.startLocation = input.startLocation;
    if (input.endLocation !== undefined)
      updateData.endLocation = input.endLocation;
    if (input.altitude !== undefined) updateData.altitude = input.altitude;
    if (input.walkingHours !== undefined)
      updateData.walkingHours = input.walkingHours;
    if (input.accommodation !== undefined)
      updateData.accommodation = input.accommodation;
    if (input.meals !== undefined) updateData.meals = input.meals;
    if (input.activities !== undefined)
      updateData.activities = input.activities;

    const updated = await TrekTemplateRepository.updateDay(
      workspaceId,
      dayId,
      updateData,
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'template.day.updated',
      entityType: 'trek_template_day',
      entityId: dayId,
      details: {
        templateId: existing.templateId,
        changedFields: Object.keys(updateData),
      },
    });

    return toDayDetail(updated);
  }

  static async deleteDay(
    workspaceId: string,
    dayId: string,
    userId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await TrekTemplateRepository.findDayById(dayId, workspaceId);
    if (!existing) {
      throw AppError.notFound('Trek template day not found');
    }

    await TrekTemplateRepository.deleteDay(workspaceId, dayId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'template.day.deleted',
      entityType: 'trek_template_day',
      entityId: dayId,
      details: { templateId: existing.templateId },
    });

    return { success: true, id: dayId };
  }

  static async reorderDays(
    workspaceId: string,
    templateId: string,
    userId: string,
    input: ReorderTrekTemplateDaysInput,
  ): Promise<TrekTemplateDayDetail[]> {
    const template = await TrekTemplateRepository.findById(
      templateId,
      workspaceId,
    );
    if (!template) {
      throw AppError.notFound('Trek template not found');
    }

    const dayIds = input.items.map((item) => item.id);
    const ownedDays = await TrekTemplateRepository.findDaysByIds(dayIds);
    const ownedIds = new Set(ownedDays.map((day) => day.id));
    const foreignDay = input.items.find((item) => !ownedIds.has(item.id));
    if (foreignDay) {
      throw AppError.notFound(
        'One or more days do not belong to this trek template',
      );
    }
    const crossTemplate = ownedDays.find(
      (day) => day.templateId !== templateId,
    );
    if (crossTemplate) {
      throw AppError.forbidden(
        'One or more days do not belong to this trek template',
      );
    }

    await TrekTemplateRepository.reorderDays(workspaceId, templateId, input.items);

    await logAuditEvent({
      workspaceId,
      userId,
      action: 'template.days.reordered',
      entityType: 'trek_template',
      entityId: templateId,
      details: { dayIds },
    });

    const refreshed = await TrekTemplateRepository.findById(
      templateId,
      workspaceId,
    );
    if (!refreshed) {
      throw AppError.notFound('Trek template not found');
    }
    return refreshed.days.map(toDayDetail);
  }
}
