import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "../auth.service.js";
import { AuthRepository } from "../auth.repository.js";
import { PasswordUtil } from "../../../lib/password.js";
import { lucia } from "../../../lib/lucia.js";
import { AppError } from "../../../lib/errors.js";

describe("AuthService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("login", () => {
    it("throws unauthorized if user does not exist", async () => {
      vi.spyOn(AuthRepository, "findUserByEmail").mockResolvedValue(null);

      await expect(
        AuthService.login(
          { email: "nonexistent@demo.com", password: "Password123!" },
          {},
        ),
      ).rejects.toThrow(AppError);
    });

    it("throws forbidden if user status is not ACTIVE", async () => {
      vi.spyOn(AuthRepository, "findUserByEmail").mockResolvedValue({
        id: "u1",
        email: "suspended@demo.com",
        passwordHash: "hash",
        firstName: "Jane",
        lastName: "Doe",
        status: "SUSPENDED",
        resetToken: null,
        resetTokenExp: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        AuthService.login(
          { email: "suspended@demo.com", password: "Password123!" },
          {},
        ),
      ).rejects.toThrow(AppError);
    });

    it("logs in successfully and returns user and session", async () => {
      const mockUser = {
        id: "u1",
        email: "user@demo.com",
        passwordHash: "valid-hash",
        firstName: "John",
        lastName: "Doe",
        status: "ACTIVE" as const,
        resetToken: null,
        resetTokenExp: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(AuthRepository, "findUserByEmail").mockResolvedValue(mockUser);
      vi.spyOn(PasswordUtil, "verify").mockResolvedValue(true);
      vi.spyOn(AuthRepository, "updateLastLogin").mockResolvedValue(mockUser);
      vi.spyOn(lucia, "createSession").mockResolvedValue({
        id: "session-123",
        userId: "u1",
        expiresAt: new Date(),
        fresh: true,
      });

      const result = await AuthService.login(
        { email: "user@demo.com", password: "Password123!" },
        { ip: "127.0.0.1" },
      );

      expect(result.user.email).toBe("user@demo.com");
      expect(result.session.id).toBe("session-123");
    });
  });

  describe("register", () => {
    it("throws conflict if user already exists with real password", async () => {
      vi.spyOn(AuthRepository, "findUserByEmail").mockResolvedValue({
        id: "u1",
        email: "existing@demo.com",
        passwordHash: "existing-hash",
        firstName: "John",
        lastName: "Doe",
        status: "ACTIVE",
        resetToken: null,
        resetTokenExp: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        AuthService.register(
          {
            email: "existing@demo.com",
            password: "Password123!",
            firstName: "John",
            lastName: "Doe",
          },
          {},
        ),
      ).rejects.toThrow(AppError);
    });
  });
});
