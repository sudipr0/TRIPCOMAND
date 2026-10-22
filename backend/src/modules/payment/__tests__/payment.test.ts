import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService } from "../payment.service.js";
import { PaymentRepository } from "../payment.repository.js";
import { BookingRepository } from "../../booking/booking.repository.js";
import { AppError } from "../../../lib/errors.js";

vi.mock("../../../lib/audit.js", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildBooking(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "bkg-1",
    workspaceId: "ws-1",
    customerId: "cust-1",
    quotationId: null,
    bookingNumber: "BKG-2026-001",
    trekName: "ABC 10-Day",
    startDate: new Date("2026-11-01T00:00:00Z"),
    endDate: new Date("2026-11-10T00:00:00Z"),
    groupSize: 2,
    totalAmount: 64000,
    paidAmount: 0,
    balanceAmount: 64000,
    currency: "NPR",
    status: "CONFIRMED" as const,
    confirmedAt: new Date(),
    cancelledAt: null,
    cancellationReason: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    payments: [],
    ...overrides,
  };
}

function buildPayment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "pay-1",
    workspaceId: "ws-1",
    bookingId: "bkg-1",
    amount: 20000,
    currency: "NPR",
    paymentType: "DEPOSIT" as const,
    method: "bank_transfer",
    reference: null,
    receivedAt: new Date("2026-10-20T00:00:00Z"),
    recordedById: "u1",
    evidence: null,
    notes: null,
    createdAt: new Date(),
    ...overrides,
  };
}

const depositInput = {
  amount: 20000,
  paymentType: "DEPOSIT" as const,
  method: "bank_transfer",
  receivedAt: "2026-10-20T00:00:00Z",
};

describe("PaymentService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("recordPayment updates booking paidAmount and balanceAmount", async () => {
    vi.spyOn(BookingRepository, "findById").mockResolvedValue(
      buildBooking() as never,
    );
    vi.spyOn(PaymentRepository, "create").mockResolvedValue(
      buildPayment() as never,
    );
    // After the deposit: 20000 paid, no refunds
    vi.spyOn(PaymentRepository, "sumForBooking").mockResolvedValue({
      paid: 20000,
      refunded: 0,
    });
    const updateSpy = vi
      .spyOn(BookingRepository, "update")
      .mockResolvedValue(
        buildBooking({ paidAmount: 20000, balanceAmount: 44000 }) as never,
      );

    const result = await PaymentService.recordPayment(
      "ws-1",
      "u1",
      "bkg-1",
      depositInput as never,
    );

    expect(updateSpy).toHaveBeenCalledWith(
      "bkg-1",
      "ws-1",
      expect.objectContaining({ paidAmount: 20000, balanceAmount: 44000 }),
    );
    expect(result.payment.paymentType).toBe("DEPOSIT");
    expect(result.booking.paidAmount).toBe("20000");
    expect(result.booking.balanceAmount).toBe("44000");
  });

  it("recordPayment rejects for CANCELLED booking", async () => {
    vi.spyOn(BookingRepository, "findById").mockResolvedValue(
      buildBooking({ status: "CANCELLED" }) as never,
    );
    await expect(
      PaymentService.recordPayment(
        "ws-1",
        "u1",
        "bkg-1",
        depositInput as never,
      ),
    ).rejects.toThrow(AppError);
  });

  it("recordPayment rejects for missing booking", async () => {
    vi.spyOn(BookingRepository, "findById").mockResolvedValue(null);
    await expect(
      PaymentService.recordPayment(
        "ws-1",
        "u1",
        "bkg-1",
        depositInput as never,
      ),
    ).rejects.toThrow(AppError);
  });

  it("refund reduces paidAmount", async () => {
    vi.spyOn(BookingRepository, "findById").mockResolvedValue(
      buildBooking({ paidAmount: 20000, balanceAmount: 44000 }) as never,
    );
    vi.spyOn(PaymentRepository, "create").mockResolvedValue(
      buildPayment({ paymentType: "REFUND", amount: 5000 }) as never,
    );
    // Aggregate: 20000 paid in, 5000 refunded
    vi.spyOn(PaymentRepository, "sumForBooking").mockResolvedValue({
      paid: 20000,
      refunded: 5000,
    });
    const updateSpy = vi
      .spyOn(BookingRepository, "update")
      .mockResolvedValue(
        buildBooking({ paidAmount: 15000, balanceAmount: 49000 }) as never,
      );

    const result = await PaymentService.recordPayment("ws-1", "u1", "bkg-1", {
      amount: 5000,
      paymentType: "REFUND",
      receivedAt: "2026-10-21T00:00:00Z",
    } as never);

    expect(updateSpy).toHaveBeenCalledWith(
      "bkg-1",
      "ws-1",
      expect.objectContaining({ paidAmount: 15000, balanceAmount: 49000 }),
    );
    expect(result.booking.paidAmount).toBe("15000");
  });

  it("cannot record payment for another workspace booking (tenant isolation)", async () => {
    vi.spyOn(BookingRepository, "findById").mockResolvedValue(null);
    await expect(
      PaymentService.recordPayment(
        "ws-1",
        "u1",
        "bkg-other-ws",
        depositInput as never,
      ),
    ).rejects.toThrow(AppError);
  });

  it("getPayment throws notFound across workspaces", async () => {
    vi.spyOn(PaymentRepository, "findById").mockResolvedValue(null);
    await expect(PaymentService.getPayment("ws-1", "pay-1")).rejects.toThrow(
      AppError,
    );
  });
});
