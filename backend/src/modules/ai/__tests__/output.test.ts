import { describe, it, expect } from "vitest";
import {
  OUTPUT_LIMITS,
  stripWrapping,
  validateSupplierEmail,
  validateTravelerUpdate,
  validateTripSummary,
} from "../ai.output.js";

describe("stripWrapping", () => {
  it("removes markdown fences", () => {
    expect(stripWrapping("```\nHello\n```")).toBe("Hello");
  });

  it("removes a leading label and wrapping quotes", () => {
    expect(stripWrapping('Message: "Hello"')).toBe("Hello");
  });
});

describe("validateTravelerUpdate", () => {
  it("accepts a normal message", () => {
    expect(validateTravelerUpdate("Hi everyone, we are on it.")).toBe(
      "Hi everyone, we are on it.",
    );
  });

  it("rejects an empty message", () => {
    expect(() => validateTravelerUpdate("   ")).toThrow();
  });

  it("rejects an over-long message", () => {
    expect(() =>
      validateTravelerUpdate("x".repeat(OUTPUT_LIMITS.travelerUpdateChars + 1)),
    ).toThrow();
  });
});

describe("validateSupplierEmail", () => {
  it("splits SUBJECT and BODY", () => {
    const parsed = validateSupplierEmail(
      "SUBJECT: Helicopter availability 3 April\nBODY:\nDear Ops Desk,\n\nPlease confirm availability.",
    );
    expect(parsed.subject).toBe("Helicopter availability 3 April");
    expect(parsed.body).toBe("Dear Ops Desk,\n\nPlease confirm availability.");
  });

  it("handles a missing BODY marker", () => {
    const parsed = validateSupplierEmail(
      "SUBJECT: Availability\nDear team, please confirm.",
    );
    expect(parsed.subject).toBe("Availability");
    expect(parsed.body).toBe("Dear team, please confirm.");
  });

  it("falls back to a neutral subject when none is produced", () => {
    const parsed = validateSupplierEmail("Dear team, please confirm availability.");
    expect(parsed.subject).toBe("Availability inquiry");
    expect(parsed.body).toContain("please confirm");
  });

  it("rejects an empty body", () => {
    expect(() => validateSupplierEmail("SUBJECT: Hi\nBODY:\n")).toThrow();
  });
});

describe("validateTripSummary", () => {
  it("accepts exactly three bullets in any common marker style", () => {
    expect(
      validateTripSummary("- One\n* Two\n3. Three"),
    ).toEqual(["One", "Two", "Three"]);
  });

  it("rejects two or four bullets rather than padding", () => {
    expect(() => validateTripSummary("- One\n- Two")).toThrow();
    expect(() => validateTripSummary("- One\n- Two\n- Three\n- Four")).toThrow();
  });

  it("bounds an over-long bullet", () => {
    const [bullet] = validateTripSummary(
      `- ${"a".repeat(400)}\n- Two\n- Three`,
    );
    expect(bullet.length).toBeLessThanOrEqual(OUTPUT_LIMITS.summaryBulletChars);
  });
});
