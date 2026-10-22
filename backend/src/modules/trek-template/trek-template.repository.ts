import type { Prisma, TrekDifficulty, TemplateStatus } from '@prisma/client';

import { rawPrisma } from '../../lib/prisma.js';
import type { ListTrekTemplatesQuery } from './trek-template.schemas.js';

const TEMPLATE_DAYS_INCLUDE = {
  days: {
    orderBy: { dayNumber: 'asc' },
  },
} satisfies Prisma.TrekTemplateInclude;

const TEMPLATE_DETAIL_INCLUDE = {
  destination: true,
  days: {
    orderBy: { dayNumber: 'asc' },
  },
} satisfies Prisma.TrekTemplateInclude;

export type TrekTemplateWithDays = Prisma.TrekTemplateGetPayload<{
  include: typeof TEMPLATE_DAYS_INCLUDE;
}>;

export type TrekTemplateWithDetail = Prisma.TrekTemplateGetPayload<{
  include: typeof TEMPLATE_DETAIL_INCLUDE;
}>;

export interface CreateTrekTemplateData {
  name: string;
  code?: string | null;
  description?: string | null;
  region?: string | null;
  difficulty: TrekDifficulty;
  durationDays: number;
  maxAltitude?: number | null;
  bestSeasons: string[];
  basePrice?: number | null;
  basePriceCurrency: string;
  requiredDocuments: string[];
  packingList?: Prisma.InputJsonValue | null;
  preparationNotes?: string | null;
  inclusions: string[];
  exclusions: string[];
  terms?: string | null;
  destinationId?: string | null;
  status?: TemplateStatus;
  metadata: Prisma.InputJsonValue;
  days?: {
    dayNumber: number;
    title: string;
    description?: string | null;
    startLocation?: string | null;
    endLocation?: string | null;
    altitude?: number | null;
    walkingHours?: number | null;
    accommodation?: string | null;
    meals: string[];
    activities: string[];
  }[];
}

export interface CreateTrekTemplateDayData {
  dayNumber: number;
  title: string;
  description?: string | null;
  startLocation?: string | null;
  endLocation?: string | null;
  altitude?: number | null;
  walkingHours?: number | null;
  accommodation?: string | null;
  meals: string[];
  activities: string[];
}

export class TrekTemplateRepository {
  /**
   * List trek templates scoped to a workspace.
   * Every query filters by workspaceId to enforce tenancy.
   */
  static async listTemplates(
    workspaceId: string,
    filter: ListTrekTemplatesQuery,
  ): Promise<{ total: number; items: TrekTemplateWithDays[] }> {
    const where: Prisma.TrekTemplateWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.difficulty ? { difficulty: filter.difficulty } : {}),
      ...(filter.search
        ? { name: { contains: filter.search, mode: 'insensitive' } }
        : {}),
    };

    const [total, items] = await Promise.all([
      rawPrisma.trekTemplate.count({ where }),
      rawPrisma.trekTemplate.findMany({
        where,
        include: TEMPLATE_DAYS_INCLUDE,
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
  ): Promise<TrekTemplateWithDetail | null> {
    return rawPrisma.trekTemplate.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: TEMPLATE_DETAIL_INCLUDE,
    });
  }

  static async findByName(
    name: string,
    workspaceId: string,
  ): Promise<TrekTemplateWithDetail | null> {
    return rawPrisma.trekTemplate.findFirst({
      where: { name, workspaceId, deletedAt: null },
      include: TEMPLATE_DETAIL_INCLUDE,
    });
  }

  static async create(
    workspaceId: string,
    data: CreateTrekTemplateData,
  ): Promise<TrekTemplateWithDetail> {
    const { days, destinationId, packingList, ...template } = data;

    const createData: Prisma.TrekTemplateCreateInput = {
      ...template,
      workspace: { connect: { id: workspaceId } },
    };

    // Prisma's JSON input type does not accept a bare `null`; omit the field
    // instead so an absent packing list is stored as SQL NULL.
    if (packingList !== undefined && packingList !== null) {
      createData.packingList = packingList;
    }

    if (destinationId) {
      createData.destination = { connect: { id: destinationId } };
    }

    if (days && days.length > 0) {
      createData.days = {
        create: days.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description ?? null,
          startLocation: day.startLocation ?? null,
          endLocation: day.endLocation ?? null,
          altitude: day.altitude ?? null,
          walkingHours: day.walkingHours ?? null,
          accommodation: day.accommodation ?? null,
          meals: day.meals,
          activities: day.activities,
        })),
      };
    }

    return rawPrisma.trekTemplate.create({
      data: createData,
      include: TEMPLATE_DETAIL_INCLUDE,
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.TrekTemplateUpdateInput,
  ): Promise<TrekTemplateWithDetail> {
    // Guard tenancy by asserting existence within workspace first.
    const existing = await rawPrisma.trekTemplate.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('Trek template not found in workspace');
    }

    return rawPrisma.trekTemplate.update({
      where: { id },
      data,
      include: TEMPLATE_DETAIL_INCLUDE,
    });
  }

  static async softDelete(
    id: string,
    workspaceId: string,
  ): Promise<TrekTemplateWithDetail> {
    const existing = await rawPrisma.trekTemplate.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('Trek template not found in workspace');
    }

    return rawPrisma.trekTemplate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'ARCHIVED',
      },
      include: TEMPLATE_DETAIL_INCLUDE,
    });
  }

  // ---- Days ----

  static async findDayById(
    dayId: string,
    workspaceId: string,
  ): Promise<Prisma.TrekTemplateDayGetPayload<object> | null> {
    return rawPrisma.trekTemplateDay.findFirst({
      where: { id: dayId, template: { workspaceId, deletedAt: null } },
    });
  }

  static async findDayByNumber(
    templateId: string,
    dayNumber: number,
  ): Promise<Prisma.TrekTemplateDayGetPayload<object> | null> {
    return rawPrisma.trekTemplateDay.findFirst({
      where: { templateId, dayNumber },
    });
  }

  static async addDay(
    workspaceId: string,
    templateId: string,
    data: CreateTrekTemplateDayData,
  ): Promise<Prisma.TrekTemplateDayGetPayload<object>> {
    // Assert the template belongs to the workspace before writing a day.
    const template = await rawPrisma.trekTemplate.findFirst({
      where: { id: templateId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!template) {
      throw new Error('Trek template not found in workspace');
    }

    return rawPrisma.trekTemplateDay.create({
      data: {
        templateId,
        dayNumber: data.dayNumber,
        title: data.title,
        description: data.description ?? null,
        startLocation: data.startLocation ?? null,
        endLocation: data.endLocation ?? null,
        altitude: data.altitude ?? null,
        walkingHours: data.walkingHours ?? null,
        accommodation: data.accommodation ?? null,
        meals: data.meals,
        activities: data.activities,
      },
    });
  }

  static async updateDay(
    workspaceId: string,
    dayId: string,
    data: Prisma.TrekTemplateDayUpdateInput,
  ): Promise<Prisma.TrekTemplateDayGetPayload<object>> {
    // Ownership is enforced by joining through the parent template.
    const existing = await rawPrisma.trekTemplateDay.findFirst({
      where: { id: dayId, template: { workspaceId, deletedAt: null } },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('Trek template day not found in workspace');
    }

    return rawPrisma.trekTemplateDay.update({
      where: { id: dayId },
      data,
    });
  }

  static async deleteDay(
    workspaceId: string,
    dayId: string,
  ): Promise<Prisma.TrekTemplateDayGetPayload<object>> {
    const existing = await rawPrisma.trekTemplateDay.findFirst({
      where: { id: dayId, template: { workspaceId, deletedAt: null } },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('Trek template day not found in workspace');
    }

    return rawPrisma.trekTemplateDay.delete({
      where: { id: dayId },
    });
  }

  static async findDaysByIds(
    dayIds: string[],
  ): Promise<{ id: string; templateId: string; dayNumber: number }[]> {
    return rawPrisma.trekTemplateDay.findMany({
      where: { id: { in: dayIds } },
      select: { id: true, templateId: true, dayNumber: true },
    });
  }

  static async reorderDays(
    workspaceId: string,
    templateId: string,
    items: { id: string; dayNumber: number }[],
  ): Promise<void> {
    // Assert the template belongs to the workspace before reordering.
    const template = await rawPrisma.trekTemplate.findFirst({
      where: { id: templateId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!template) {
      throw new Error('Trek template not found in workspace');
    }

    const dayIds = items.map((item) => item.id);
    const ownedDays = await rawPrisma.trekTemplateDay.findMany({
      where: { id: { in: dayIds }, templateId },
      select: { id: true },
    });
    if (ownedDays.length !== dayIds.length) {
      throw new Error('One or more days do not belong to this trek template');
    }

    await rawPrisma.$transaction(
      items.map((item) =>
        rawPrisma.trekTemplateDay.update({
          where: { id: item.id },
          data: { dayNumber: item.dayNumber },
        }),
      ),
    );
  }
}
