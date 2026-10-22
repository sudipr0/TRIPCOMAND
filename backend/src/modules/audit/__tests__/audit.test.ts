import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditService } from "../audit.service.js";
import { AuditRepository } from "../audit.repository.js";

describe("AuditService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("queryLogs", () => {
    it("returns formatted audit logs with pagination metadata", async () => {
      const mockEvents = [
        {
          id: "log-1",
          workspaceId: "ws-1",
          userId: "u-1",
          action: "auth:login",
          entityType: "session",
          entityId: "s-1",
          details: { ip: "127.0.0.1" },
          ipAddress: "127.0.0.1",
          userAgent: "test-agent",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          user: {
            id: "u-1",
            email: "admin@demo.com",
            firstName: "Admin",
            lastName: "Demo",
          },
        },
      ];

      vi.spyOn(AuditRepository, "queryLogs").mockResolvedValue({
        total: 1,
        events: mockEvents,
      });

      const res = await AuditService.queryLogs("ws-1", {
        limit: 10,
        offset: 0,
      });

      expect(res.total).toBe(1);
      expect(res.events[0].id).toBe("log-1");
      expect(res.events[0].action).toBe("auth:login");
    });
  });
});
