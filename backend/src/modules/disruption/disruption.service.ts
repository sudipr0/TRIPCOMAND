import type { Prisma } from "@prisma/client";

import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import { rawPrisma } from "../../lib/prisma.js";
import { DependencyEngine } from "./dependency-engine.js";
import { dayStatusStore, setDayStatusFromEvent } from "../itinerary/day-status.js";
import type {
  CreateDisruptionInput,
  CreateRecoveryPlanInput,
  DisruptionCategory,
  ListDisruptionsQuery,
} from "./disruption.schemas.js";

const DISRUPTION_INCLUDE = {
  trip: { select: { id: true, tripNumber: true, name: true } },
  impacts: { orderBy: { createdAt: "asc" as const } },
  recoveryPlan: {
    include: { tasks: { orderBy: { dueAt: "asc" as const } } },
  },
} as const;

type DisruptionRow = Prisma.DisruptionGetPayload<{
  include: typeof DISRUPTION_INCLUDE;
}>;

export interface DisruptionDetail {
  id: string;
  workspaceId: string;
  tripId: string;
  disruptionNumber: string;
  title: string;
  description: string;
  category: DisruptionCategory;
  severity: string;
  status: string;
  reportedById: string | null;
  reportedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  rootCause: string | null;
  /** Day this disruption affects, if any. */
  itineraryDayId: string | null;
  createdAt: string;
  updatedAt: string;
  trip: DisruptionRow["trip"];
  impacts: Array<{
    id: string;
    entityType: string;
    entityId: string;
    entityName: string;
    impactType: string;
    confidence: number;
    reasoning: string;
    createdAt: string;
  }>;
  recoveryPlan: {
    id: string;
    status: string;
    estimatedCost: string | null;
    notes: string | null;
    approvedById: string | null;
    approvedAt: string | null;
    createdAt: string;
    tasks: Array<{
      id: string;
      title: string;
      description: string | null;
      assignedToId: string | null;
      dueAt: string | null;
      status: string;
      evidenceUrl: string | null;
      completedAt: string | null;
    }>;
  } | null;
}

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function toDetail(row: DisruptionRow): DisruptionDetail {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    tripId: row.tripId,
    disruptionNumber: row.disruptionNumber,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    status: row.status,
    reportedById: row.reportedById,
    reportedAt: row.reportedAt.toISOString(),
    resolvedAt: iso(row.resolvedAt),
    closedAt: iso(row.closedAt),
    rootCause: row.rootCause,
    itineraryDayId: row.itineraryDayId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    trip: row.trip,
    impacts: row.impacts.map((impact) => ({
      id: impact.id,
      entityType: impact.entityType,
      entityId: impact.entityId,
      entityName: impact.entityName,
      impactType: impact.impactType,
      confidence: impact.confidence,
      reasoning: impact.reasoning,
      createdAt: impact.createdAt.toISOString(),
    })),
    recoveryPlan: row.recoveryPlan
      ? {
          id: row.recoveryPlan.id,
          status: row.recoveryPlan.status,
          estimatedCost: row.recoveryPlan.estimatedCost?.toString() ?? null,
          notes: row.recoveryPlan.notes,
          approvedById: row.recoveryPlan.approvedById,
          approvedAt: iso(row.recoveryPlan.approvedAt),
          createdAt: row.recoveryPlan.createdAt.toISOString(),
          tasks: row.recoveryPlan.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            assignedToId: task.assignedToId,
            dueAt: iso(task.dueAt),
            status: task.status,
            evidenceUrl: task.evidenceUrl,
            completedAt: iso(task.completedAt),
          })),
        }
      : null,
  };
}

async function generateDisruptionNumber(workspaceId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DIS-${year}-`;
  const rows = await rawPrisma.$queryRaw<{ maxnum: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING(disruption_number FROM 'DIS-[0-9]+-([0-9]+)') AS INT)) AS maxnum
    FROM disruptions
    WHERE workspace_id = ${workspaceId}
      AND disruption_number LIKE ${prefix + "%"}
  `;
  const next = (rows[0]?.maxnum ?? 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export class DisruptionService {
  static async listDisruptions(
    workspaceId: string,
    query: ListDisruptionsQuery,
  ): Promise<DisruptionDetail[]> {
    const rows = await rawPrisma.disruption.findMany({
      where: { workspaceId, ...(query.tripId ? { tripId: query.tripId } : {}) },
      orderBy: { createdAt: "desc" },
      include: DISRUPTION_INCLUDE,
    });
    return rows.map(toDetail);
  }

  static async createDisruption(
    workspaceId: string,
    userId: string,
    input: CreateDisruptionInput,
  ): Promise<DisruptionDetail> {
    const trip = await rawPrisma.trip.findFirst({
      where: { id: input.tripId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!trip) throw AppError.notFound("Trip not found in this workspace");

    const engine = new DependencyEngine();
    const impacts = await engine.analyze(input.category, input.tripId, workspaceId);
    const disruptionNumber = await generateDisruptionNumber(workspaceId);

    const created = await rawPrisma.$transaction(async (tx) => {
      const disruption = await tx.disruption.create({
        data: {
          workspaceId,
          tripId: input.tripId,
          disruptionNumber,
          title: input.title,
          description: input.description,
          category: input.category,
          severity: input.severity,
          reportedById: userId,
          itineraryDayId: input.itineraryDayId ?? null,
        },
      });

      // Any disruption affecting a day escalates that day to PROBLEM.
      if (input.itineraryDayId) {
        await setDayStatusFromEvent(
          dayStatusStore(tx, { workspaceId, tripId: input.tripId }),
          {
            workspaceId,
            tripId: input.tripId,
            dayId: input.itineraryDayId,
            status: "PROBLEM",
            entityType: "disruption",
            entityId: disruption.id,
          },
        );
      }

      if (impacts.length) {
        await tx.impactAssessment.createMany({
          data: impacts.map((impact) => ({ ...impact, disruptionId: disruption.id })),
        });
      }

      return tx.disruption.findUniqueOrThrow({
        where: { id: disruption.id },
        include: DISRUPTION_INCLUDE,
      });
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "disruption.created",
      entityType: "disruption",
      entityId: created.id,
      details: {
        disruptionNumber,
        tripId: input.tripId,
        category: input.category,
        impactCount: impacts.length,
      },
    });

    return toDetail(created);
  }

  static async createRecoveryPlan(
    workspaceId: string,
    disruptionId: string,
    userId: string,
    input: CreateRecoveryPlanInput,
  ): Promise<DisruptionDetail> {
    const disruption = await rawPrisma.disruption.findFirst({
      where: { id: disruptionId, workspaceId },
      include: { recoveryPlan: { select: { id: true } } },
    });
    if (!disruption) throw AppError.notFound("Disruption not found");
    if (disruption.recoveryPlan) throw AppError.conflict("A recovery plan already exists");

    await rawPrisma.recoveryPlan.create({
      data: {
        disruptionId,
        estimatedCost: input.estimatedCost ?? null,
        notes: input.notes ?? null,
        tasks: {
          create: input.tasks.map((task) => ({
            title: task.title,
            assignedToId: task.assignedToId ?? null,
            dueAt: task.dueAt ?? null,
          })),
        },
      },
    });
    await rawPrisma.disruption.update({
      where: { id: disruptionId },
      data: { status: "AWAITING_APPROVAL" },
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "recovery.plan.created",
      entityType: "recovery_plan",
      entityId: disruptionId,
      details: { disruptionId, taskCount: input.tasks.length },
    });

    return this.getDisruptionDetails(workspaceId, disruptionId);
  }

  static async approvePlan(
    workspaceId: string,
    disruptionId: string,
    userId: string,
  ): Promise<DisruptionDetail> {
    const disruption = await rawPrisma.disruption.findFirst({
      where: { id: disruptionId, workspaceId },
      include: { recoveryPlan: true },
    });
    if (!disruption) throw AppError.notFound("Disruption not found");
    if (!disruption.recoveryPlan) throw AppError.notFound("Recovery plan not found");
    if (disruption.recoveryPlan.status !== "DRAFT") {
      throw AppError.conflict("Recovery plan is not awaiting approval");
    }

    await rawPrisma.$transaction([
      rawPrisma.recoveryPlan.update({
        where: { id: disruption.recoveryPlan.id },
        data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() },
      }),
      rawPrisma.disruption.update({
        where: { id: disruptionId },
        data: { status: "EXECUTING" },
      }),
    ]);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "recovery.plan.approved",
      entityType: "recovery_plan",
      entityId: disruption.recoveryPlan.id,
      details: { disruptionId },
    });

    return this.getDisruptionDetails(workspaceId, disruptionId);
  }

  static async completeTask(
    workspaceId: string,
    taskId: string,
    userId: string,
    evidenceUrl?: string | null,
  ): Promise<DisruptionDetail> {
    const task = await rawPrisma.recoveryTask.findFirst({
      where: { id: taskId, plan: { disruption: { workspaceId } } },
      include: { plan: { include: { disruption: true } } },
    });
    if (!task) throw AppError.notFound("Recovery task not found");
    if (task.plan.disruption.status !== "EXECUTING") {
      throw AppError.conflict("The disruption must be executing before tasks can be completed");
    }
    if (task.status === "COMPLETED") {
      return this.getDisruptionDetails(workspaceId, task.plan.disruptionId);
    }

    await rawPrisma.recoveryTask.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        evidenceUrl: evidenceUrl ?? null,
        completedAt: new Date(),
      },
    });

    const remaining = await rawPrisma.recoveryTask.count({
      where: { planId: task.planId, status: { not: "COMPLETED" } },
    });
    if (remaining === 0) {
      await rawPrisma.$transaction([
        rawPrisma.recoveryPlan.update({ where: { id: task.planId }, data: { status: "COMPLETED" } }),
        rawPrisma.disruption.update({
          where: { id: task.plan.disruptionId },
          data: { status: "RESOLVED", resolvedAt: new Date() },
        }),
      ]);
    }

    await logAuditEvent({
      workspaceId,
      userId,
      action: "recovery.task.completed",
      entityType: "recovery_task",
      entityId: taskId,
      details: { disruptionId: task.plan.disruptionId, evidenceUrl: evidenceUrl ?? null, remaining },
    });

    return this.getDisruptionDetails(workspaceId, task.plan.disruptionId);
  }

  static async getDisruptionDetails(
    workspaceId: string,
    disruptionId: string,
  ): Promise<DisruptionDetail> {
    const row = await rawPrisma.disruption.findFirst({
      where: { id: disruptionId, workspaceId },
      include: DISRUPTION_INCLUDE,
    });
    if (!row) throw AppError.notFound("Disruption not found");
    return toDetail(row);
  }
}
