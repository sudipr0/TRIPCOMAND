import type { Prisma } from "@prisma/client";
import { CustomerRepository } from "./customer.repository.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersQuery,
  CustomerDetail,
  ListCustomersResult,
} from "@trailcomand/shared";

function toCustomerDetail(customer: {
  id: string;
  workspaceId: string;
  customerType: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  nationality: string | null;
  address: string | null;
  dateOfBirth: Date | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  source: string | null;
  tags: string[];
  notes: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): CustomerDetail {
  return {
    id: customer.id,
    workspaceId: customer.workspaceId,
    customerType: customer.customerType,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    whatsapp: customer.whatsapp,
    nationality: customer.nationality,
    address: customer.address,
    dateOfBirth: customer.dateOfBirth
      ? customer.dateOfBirth.toISOString()
      : null,
    emergencyContactName: customer.emergencyContactName,
    emergencyContactPhone: customer.emergencyContactPhone,
    source: customer.source,
    tags: customer.tags,
    notes: customer.notes,
    metadata: customer.metadata,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    deletedAt: customer.deletedAt ? customer.deletedAt.toISOString() : null,
  };
}

export class CustomerService {
  static async listCustomers(
    workspaceId: string,
    filter: ListCustomersQuery,
  ): Promise<ListCustomersResult> {
    const { total, items } = await CustomerRepository.listCustomers(
      workspaceId,
      filter,
    );
    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map(toCustomerDetail),
    };
  }

  static async getCustomer(
    workspaceId: string,
    customerId: string,
  ): Promise<CustomerDetail> {
    const customer = await CustomerRepository.findById(customerId, workspaceId);
    if (!customer) {
      throw AppError.notFound("Customer not found");
    }
    return toCustomerDetail(customer);
  }

  static async createCustomer(
    workspaceId: string,
    userId: string,
    input: CreateCustomerInput,
  ): Promise<CustomerDetail> {
    if (input.email) {
      const duplicate = await CustomerRepository.findByEmail(
        input.email,
        workspaceId,
      );
      if (duplicate) {
        throw AppError.conflict(
          "A customer with this email already exists in this workspace",
        );
      }
    }

    const created = await CustomerRepository.create(workspaceId, {
      customerType: input.customerType,
      fullName: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      nationality: input.nationality ?? null,
      address: input.address ?? null,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      source: input.source ?? null,
      tags: input.tags ?? [],
      notes: input.notes ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "customer.created",
      entityType: "customer",
      entityId: created.id,
      details: {
        fullName: created.fullName,
        customerType: created.customerType,
      },
    });

    return toCustomerDetail(created);
  }

  static async updateCustomer(
    workspaceId: string,
    customerId: string,
    userId: string,
    input: UpdateCustomerInput,
  ): Promise<CustomerDetail> {
    const existing = await CustomerRepository.findById(customerId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Customer not found");
    }

    if (
      input.email !== undefined &&
      input.email !== null &&
      input.email !== existing.email
    ) {
      const duplicate = await CustomerRepository.findByEmail(
        input.email,
        workspaceId,
      );
      if (duplicate) {
        throw AppError.conflict(
          "A customer with this email already exists in this workspace",
        );
      }
    }

    const updateData: Prisma.CustomerUpdateInput = {};
    if (input.customerType !== undefined)
      updateData.customerType = input.customerType;
    if (input.fullName !== undefined) updateData.fullName = input.fullName;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.whatsapp !== undefined) updateData.whatsapp = input.whatsapp;
    if (input.nationality !== undefined)
      updateData.nationality = input.nationality;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.dateOfBirth !== undefined)
      updateData.dateOfBirth = input.dateOfBirth
        ? new Date(input.dateOfBirth)
        : null;
    if (input.emergencyContactName !== undefined)
      updateData.emergencyContactName = input.emergencyContactName;
    if (input.emergencyContactPhone !== undefined)
      updateData.emergencyContactPhone = input.emergencyContactPhone;
    if (input.source !== undefined) updateData.source = input.source;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.metadata !== undefined)
      updateData.metadata = input.metadata as Prisma.InputJsonValue;

    const updated = await CustomerRepository.update(
      customerId,
      workspaceId,
      updateData,
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "customer.updated",
      entityType: "customer",
      entityId: customerId,
      details: { changedFields: Object.keys(updateData) },
    });

    return toCustomerDetail(updated);
  }

  static async deleteCustomer(
    workspaceId: string,
    customerId: string,
    userId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await CustomerRepository.findById(customerId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Customer not found");
    }

    await CustomerRepository.softDelete(customerId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "customer.deleted",
      entityType: "customer",
      entityId: customerId,
      details: { fullName: existing.fullName },
    });

    return { success: true, id: customerId };
  }
}
