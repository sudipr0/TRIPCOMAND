import { describe, it, expect, vi, beforeEach } from "vitest";

import { AppError } from "../../../lib/errors.js";
import { logAuditEvent } from "../../../lib/audit.js";
import { FieldService } from "../field.service.js";
import { FieldRepository } from "../field.repository.js";

vi.mock("../../../lib/audit.js", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

const CLIENT_ID = "11111111-1111-4111-8111-111111111111";

function buildTrip(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "trip-1",
    workspaceId: "ws-1",
    name: "Everest Base Camp — Mitchell Party",
    tripNumber: "TRP-2026-001",
    startDate: new Date("2026-11-10T00:00:00Z"),
    endDate: new Date("2026-11-23T00:00:00Z"),
    status: "IN_PROGRESS" as const,
    groupSize: 4,
    leadGuideId: "guide-1",
    ...overrides,
  };
}

function buildCheckIn(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "chk-1",
    workspaceId: "ws-1",
    tripId: "trip-1",
    staffId: "guide-1",
    checkInType: "START" as const,
    location: "Lukla",
    latitude: null,
    longitude: null,
    altitude: 2860,
    message: "On the trail",
    photoUrls: [],
    recordedAt: new Date("2026-11-10T06:00:00Z"),
    syncedAt: new Date("2026-11-10T06:00:02Z"),
    clientId: CLIENT_ID,
    createdAt: new Date("2026-11-10T06:00:02Z"),
    staff: {
      id: "guide-1",
      fullName: "Dawa Sherpa",
      staffType: "GUIDE" as const,
    },
    ...overrides,
  };
}

function buildReport(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "rep-1",
    workspaceId: "ws-1",
    tripId: "trip-1",
    reporterId: "guide-1",
    reportType: "DELAY" as const,
    severity: "MEDIUM" as const,
    description: "Monsoon downpour slowed the descent",
    location: "Namche Bazaar",
    photoUrls: [],
    recordedAt: new Date("2026-11-12T08:00:00Z"),
    syncedAt: new Date("2026-11-12T08:00:01Z"),
    clientId: CLIENT_ID,
    createdAt: new Date("2026-11-12T08:00:01Z"),
    ...overrides,
  };
}

const checkInInput = {
  checkInType: "START" as const,
  location: "Lukla",
  altitude: 2860,
  message: "On the trail",
  recordedAt: "2026-11-10T06:00:00.000Z",
  clientId: CLIENT_ID,
};

const reportInput = {
  reportType: "DELAY" as const,
  severity: "MEDIUM" as const,
  description: "Monsoon downpour slowed the descent",
  location: "Namche Bazaar",
  recordedAt: "2026-11-12T08:00:00.000Z",
  clientId: CLIENT_ID,
};

describe("FieldService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logAuditEvent).mockClear();
  });

  describe("createCheckIn", () => {
    it("rejects a trip from another workspace", async () => {
      vi.spyOn(FieldRepository, "findTrip").mockResolvedValue(null);
      const upsertSpy = vi.spyOn(FieldRepository, "upsertCheckIn");

      await expect(
        FieldService.createCheckIn("ws-1", "user-1", "trip-1", checkInInput),
      ).rejects.toThrow(AppError);
      expect(upsertSpy).not.toHaveBeenCalled();
    });

    it("rejects a user without a staff profile", async () => {
      vi.spyOn(FieldRepository, "findTrip").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(FieldRepository, "findStaffByUserId").mockResolvedValue(null);

      await expect(
        FieldService.createCheckIn("ws-1", "user-1", "trip-1", checkInInput),
      ).rejects.toThrow(AppError);
    });

    it("rejects staff that are not assigned to the trip", async () => {
      vi.spyOn(FieldRepository, "findTrip").mockResolvedValue(
        buildTrip({ leadGuideId: "guide-other" }) as never,
      );
      vi.spyOn(FieldRepository, "findStaffByUserId").mockResolvedValue({
        id: "guide-1",
        fullName: "Dawa Sherpa",
        staffType: "GUIDE",
      } as never);
      vi.spyOn(FieldRepository, "isAssigned").mockResolvedValue(false);
      const upsertSpy = vi.spyOn(FieldRepository, "upsertCheckIn");

      await expect(
        FieldService.createCheckIn("ws-1", "user-1", "trip-1", checkInInput),
      ).rejects.toThrow(AppError);
      expect(upsertSpy).not.toHaveBeenCalled();
    });

    it("creates the check-in for the assigned guide and audits it", async () => {
      vi.spyOn(FieldRepository, "findTrip").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(FieldRepository, "findStaffByUserId").mockResolvedValue({
        id: "guide-1",
        fullName: "Dawa Sherpa",
        staffType: "GUIDE",
      } as never);
      vi.spyOn(FieldRepository, "findCheckInByClientId").mockResolvedValue(
        null,
      );
      const upsertSpy = vi
        .spyOn(FieldRepository, "upsertCheckIn")
        .mockResolvedValue(buildCheckIn() as never);

      const result = await FieldService.createCheckIn(
        "ws-1",
        "user-1",
        "trip-1",
        checkInInput,
      );

      expect(upsertSpy).toHaveBeenCalledWith(
        "ws-1",
        "trip-1",
        "guide-1",
        expect.objectContaining({
          checkInType: "START",
          clientId: CLIENT_ID,
          altitude: 2860,
        }),
      );
      expect(result.id).toBe("chk-1");
      expect(result.staff?.fullName).toBe("Dawa Sherpa");
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "field.checkin.created",
          entityType: "field_check_in",
          entityId: "chk-1",
        }),
      );
    });

    it("is idempotent on clientId (sync retry does not duplicate)", async () => {
      vi.spyOn(FieldRepository, "findTrip").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(FieldRepository, "findStaffByUserId").mockResolvedValue({
        id: "guide-1",
        fullName: "Dawa Sherpa",
        staffType: "GUIDE",
      } as never);
      vi.spyOn(FieldRepository, "findCheckInByClientId").mockResolvedValue(
        buildCheckIn() as never,
      );
      const upsertSpy = vi.spyOn(FieldRepository, "upsertCheckIn");

      const result = await FieldService.createCheckIn(
        "ws-1",
        "user-1",
        "trip-1",
        checkInInput,
      );

      expect(upsertSpy).not.toHaveBeenCalled();
      expect(result.id).toBe("chk-1");
      expect(logAuditEvent).not.toHaveBeenCalled();
    });

    it("rejects reusing a clientId on a different trip", async () => {
      vi.spyOn(FieldRepository, "findTrip").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(FieldRepository, "findStaffByUserId").mockResolvedValue({
        id: "guide-1",
        fullName: "Dawa Sherpa",
        staffType: "GUIDE",
      } as never);
      vi.spyOn(FieldRepository, "findCheckInByClientId").mockResolvedValue(
        buildCheckIn({ tripId: "trip-other" }) as never,
      );

      await expect(
        FieldService.createCheckIn("ws-1", "user-1", "trip-1", checkInInput),
      ).rejects.toThrow(AppError);
    });
  });

  describe("createReport", () => {
    it("creates a normal report and audits it without an emergency marker", async () => {
      vi.spyOn(FieldRepository, "findTrip").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(FieldRepository, "findStaffByUserId").mockResolvedValue({
        id: "guide-1",
        fullName: "Dawa Sherpa",
        staffType: "GUIDE",
      } as never);
      vi.spyOn(FieldRepository, "findReportByClientId").mockResolvedValue(null);
      vi.spyOn(FieldRepository, "upsertReport").mockResolvedValue(
        buildReport() as never,
      );

      const result = await FieldService.createReport(
        "ws-1",
        "user-1",
        "trip-1",
        reportInput,
      );

      expect(result.reportType).toBe("DELAY");
      expect(result.reporterId).toBe("guide-1");
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "field.report.created" }),
      );
    });

    it("forces URGENT severity and a high-priority audit event for emergencies", async () => {
      vi.spyOn(FieldRepository, "findTrip").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(FieldRepository, "findStaffByUserId").mockResolvedValue({
        id: "guide-1",
        fullName: "Dawa Sherpa",
        staffType: "GUIDE",
      } as never);
      vi.spyOn(FieldRepository, "findReportByClientId").mockResolvedValue(null);
      const upsertSpy = vi
        .spyOn(FieldRepository, "upsertReport")
        .mockResolvedValue(
          buildReport({ reportType: "EMERGENCY", severity: "URGENT" }) as never,
        );

      await FieldService.createReport("ws-1", "user-1", "trip-1", {
        ...reportInput,
        reportType: "EMERGENCY",
        severity: "LOW",
      });

      expect(upsertSpy).toHaveBeenCalledWith(
        "ws-1",
        "trip-1",
        "guide-1",
        expect.objectContaining({
          reportType: "EMERGENCY",
          severity: "URGENT",
        }),
      );
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "field.report.emergency",
          details: expect.objectContaining({ bypassedApproval: true }),
        }),
      );
    });

    it("allows office users without a staff profile to file a report", async () => {
      vi.spyOn(FieldRepository, "findTrip").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(FieldRepository, "findStaffByUserId").mockResolvedValue(null);
      vi.spyOn(FieldRepository, "findReportByClientId").mockResolvedValue(null);
      const upsertSpy = vi
        .spyOn(FieldRepository, "upsertReport")
        .mockResolvedValue(buildReport({ reporterId: "user-1" }) as never);

      await FieldService.createReport("ws-1", "user-1", "trip-1", reportInput);

      expect(upsertSpy).toHaveBeenCalledWith(
        "ws-1",
        "trip-1",
        "user-1",
        expect.anything(),
      );
    });
  });

  describe("listTripFieldData", () => {
    it("returns both streams for the trip", async () => {
      vi.spyOn(FieldRepository, "findTrip").mockResolvedValue(
        buildTrip() as never,
      );
      vi.spyOn(FieldRepository, "listCheckIns").mockResolvedValue([
        buildCheckIn() as never,
      ]);
      vi.spyOn(FieldRepository, "listReports").mockResolvedValue([
        buildReport() as never,
      ]);

      const result = await FieldService.listTripFieldData("ws-1", "trip-1");

      expect(result.checkIns).toHaveLength(1);
      expect(result.reports).toHaveLength(1);
      expect(FieldRepository.listCheckIns).toHaveBeenCalledWith(
        "ws-1",
        "trip-1",
      );
    });

    it("rejects an unknown trip", async () => {
      vi.spyOn(FieldRepository, "findTrip").mockResolvedValue(null);

      await expect(
        FieldService.listTripFieldData("ws-1", "trip-x"),
      ).rejects.toThrow(AppError);
    });
  });
});
