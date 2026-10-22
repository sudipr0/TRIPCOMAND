import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { ROLE_PERMISSIONS, SYSTEM_ROLES } from '@tripchange/shared';
import { ALL_PERMISSIONS, PERMISSION_CODES } from '@tripchange/shared';
import { type PermissionCode, type SystemRoleName } from '@tripchange/shared';

const prisma = new PrismaClient();

const PERMISSION_METADATA: Record<PermissionCode, { category: string; description: string }> = {
  [PERMISSION_CODES.TRIP_CREATE]: { category: 'trip', description: 'Create trips' },
  [PERMISSION_CODES.TRIP_READ]: { category: 'trip', description: 'View trips' },
  [PERMISSION_CODES.TRIP_UPDATE]: { category: 'trip', description: 'Update trips' },
  [PERMISSION_CODES.TRIP_DELETE]: { category: 'trip', description: 'Delete trips' },

  [PERMISSION_CODES.DEPARTURE_CREATE]: { category: 'departure', description: 'Create departures' },
  [PERMISSION_CODES.DEPARTURE_READ]: { category: 'departure', description: 'View departures' },
  [PERMISSION_CODES.DEPARTURE_UPDATE]: { category: 'departure', description: 'Update departures' },
  [PERMISSION_CODES.DEPARTURE_DELETE]: { category: 'departure', description: 'Delete departures' },

  [PERMISSION_CODES.SUPPLIER_CREATE]: { category: 'supplier', description: 'Create suppliers' },
  [PERMISSION_CODES.SUPPLIER_READ]: { category: 'supplier', description: 'View suppliers' },
  [PERMISSION_CODES.SUPPLIER_UPDATE]: { category: 'supplier', description: 'Update suppliers' },
  [PERMISSION_CODES.SUPPLIER_DELETE]: { category: 'supplier', description: 'Delete suppliers' },

  [PERMISSION_CODES.RESOURCE_CREATE]: { category: 'resource', description: 'Create resources' },
  [PERMISSION_CODES.RESOURCE_READ]: { category: 'resource', description: 'View resources' },
  [PERMISSION_CODES.RESOURCE_UPDATE]: { category: 'resource', description: 'Update resources' },
  [PERMISSION_CODES.RESOURCE_DELETE]: { category: 'resource', description: 'Delete resources' },

  [PERMISSION_CODES.SERVICE_CREATE]: { category: 'service', description: 'Create services' },
  [PERMISSION_CODES.SERVICE_READ]: { category: 'service', description: 'View services' },
  [PERMISSION_CODES.SERVICE_UPDATE]: { category: 'service', description: 'Update services' },
  [PERMISSION_CODES.SERVICE_DELETE]: { category: 'service', description: 'Delete services' },
  [PERMISSION_CODES.SERVICE_CONFIRM]: { category: 'service', description: 'Confirm services' },

  [PERMISSION_CODES.INCIDENT_CREATE]: { category: 'incident', description: 'Create incidents' },
  [PERMISSION_CODES.INCIDENT_READ]: { category: 'incident', description: 'View incidents' },
  [PERMISSION_CODES.INCIDENT_UPDATE]: { category: 'incident', description: 'Update incidents' },
  [PERMISSION_CODES.INCIDENT_ASSIGN]: { category: 'incident', description: 'Assign incidents' },
  [PERMISSION_CODES.INCIDENT_ASSESS]: { category: 'incident', description: 'Assess incidents' },
  [PERMISSION_CODES.INCIDENT_CLOSE]: { category: 'incident', description: 'Close incidents' },

  [PERMISSION_CODES.RECOVERY_CREATE]: { category: 'recovery', description: 'Create recovery options' },
  [PERMISSION_CODES.RECOVERY_READ]: { category: 'recovery', description: 'View recovery options' },
  [PERMISSION_CODES.RECOVERY_UPDATE]: { category: 'recovery', description: 'Update recovery options' },
  [PERMISSION_CODES.RECOVERY_APPROVE]: { category: 'recovery', description: 'Approve recovery options' },
  [PERMISSION_CODES.RECOVERY_EXECUTE]: { category: 'recovery', description: 'Execute recovery options' },

  [PERMISSION_CODES.TASK_CREATE]: { category: 'task', description: 'Create tasks' },
  [PERMISSION_CODES.TASK_READ]: { category: 'task', description: 'View tasks' },
  [PERMISSION_CODES.TASK_UPDATE]: { category: 'task', description: 'Update tasks' },
  [PERMISSION_CODES.TASK_ASSIGN]: { category: 'task', description: 'Assign tasks' },
  [PERMISSION_CODES.TASK_EXECUTE]: { category: 'task', description: 'Execute tasks' },

  [PERMISSION_CODES.APPROVAL_READ]: { category: 'approval', description: 'View approvals' },
  [PERMISSION_CODES.APPROVAL_DECIDE]: { category: 'approval', description: 'Decide approvals' },

  [PERMISSION_CODES.EVIDENCE_CREATE]: { category: 'evidence', description: 'Upload evidence' },
  [PERMISSION_CODES.EVIDENCE_READ]: { category: 'evidence', description: 'View evidence' },
  [PERMISSION_CODES.EVIDENCE_DELETE]: { category: 'evidence', description: 'Delete evidence' },
  [PERMISSION_CODES.EVIDENCE_VERIFY]: { category: 'evidence', description: 'Verify evidence' },

  [PERMISSION_CODES.FINANCE_CREATE]: { category: 'finance', description: 'Create finance records' },
  [PERMISSION_CODES.FINANCE_READ]: { category: 'finance', description: 'View finance records' },
  [PERMISSION_CODES.FINANCE_UPDATE]: { category: 'finance', description: 'Update finance records' },

  [PERMISSION_CODES.ANALYTICS_READ]: { category: 'analytics', description: 'View analytics' },

  [PERMISSION_CODES.WORKSPACE_READ]: { category: 'workspace', description: 'View workspace' },
  [PERMISSION_CODES.WORKSPACE_UPDATE]: { category: 'workspace', description: 'Update workspace' },
  [PERMISSION_CODES.WORKSPACE_DELETE]: { category: 'workspace', description: 'Delete workspace' },

  [PERMISSION_CODES.MEMBER_INVITE]: { category: 'member', description: 'Invite members' },
  [PERMISSION_CODES.MEMBER_UPDATE]: { category: 'member', description: 'Update member status/role' },
  [PERMISSION_CODES.MEMBER_REMOVE]: { category: 'member', description: 'Remove members' },

  [PERMISSION_CODES.ROLE_CREATE]: { category: 'role', description: 'Create custom roles' },
  [PERMISSION_CODES.ROLE_READ]: { category: 'role', description: 'View roles' },
  [PERMISSION_CODES.ROLE_UPDATE]: { category: 'role', description: 'Update roles' },
  [PERMISSION_CODES.ROLE_DELETE]: { category: 'role', description: 'Delete roles' },

  [PERMISSION_CODES.AUDIT_READ]: { category: 'audit', description: 'View audit logs' },

  [PERMISSION_CODES.IMPORT_CREATE]: { category: 'import', description: 'Upload imports' },
  [PERMISSION_CODES.IMPORT_READ]: { category: 'import', description: 'View imports' },

  [PERMISSION_CODES.STAFF_CREATE]: { category: 'staff', description: 'Create staff profiles' },
  [PERMISSION_CODES.STAFF_READ]: { category: 'staff', description: 'View staff profiles' },
  [PERMISSION_CODES.STAFF_UPDATE]: { category: 'staff', description: 'Update staff profiles' },
  [PERMISSION_CODES.STAFF_DELETE]: { category: 'staff', description: 'Delete staff profiles' },
  [PERMISSION_CODES.STAFF_VERIFY]: { category: 'staff', description: 'Verify staff documents' },

  [PERMISSION_CODES.TEMPLATE_CREATE]: { category: 'templates', description: 'Create trek templates' },
  [PERMISSION_CODES.TEMPLATE_READ]: { category: 'templates', description: 'View trek templates' },
  [PERMISSION_CODES.TEMPLATE_UPDATE]: { category: 'templates', description: 'Update trek templates' },
  [PERMISSION_CODES.TEMPLATE_DELETE]: { category: 'templates', description: 'Delete trek templates' },

  [PERMISSION_CODES.DESTINATION_CREATE]: { category: 'destinations', description: 'Create destinations' },
  [PERMISSION_CODES.DESTINATION_READ]: { category: 'destinations', description: 'View destinations' },
  [PERMISSION_CODES.DESTINATION_UPDATE]: { category: 'destinations', description: 'Update destinations' },
  [PERMISSION_CODES.DESTINATION_DELETE]: { category: 'destinations', description: 'Delete destinations' },

  [PERMISSION_CODES.AGENCY_READ]: { category: 'agency', description: 'View agency profile' },
  [PERMISSION_CODES.AGENCY_UPDATE]: { category: 'agency', description: 'Update agency profile' },

  [PERMISSION_CODES.CUSTOMER_CREATE]: { category: 'customers', description: 'Create customers' },
  [PERMISSION_CODES.CUSTOMER_READ]: { category: 'customers', description: 'View customers' },
  [PERMISSION_CODES.CUSTOMER_UPDATE]: { category: 'customers', description: 'Update customers' },
  [PERMISSION_CODES.CUSTOMER_DELETE]: { category: 'customers', description: 'Delete customers' },

  [PERMISSION_CODES.INQUIRY_CREATE]: { category: 'inquiries', description: 'Create inquiries' },
  [PERMISSION_CODES.INQUIRY_READ]: { category: 'inquiries', description: 'View inquiries' },
  [PERMISSION_CODES.INQUIRY_UPDATE]: { category: 'inquiries', description: 'Update inquiries' },
  [PERMISSION_CODES.INQUIRY_ASSIGN]: { category: 'inquiries', description: 'Assign inquiries' },
  [PERMISSION_CODES.INQUIRY_CONVERT]: { category: 'inquiries', description: 'Convert inquiries' },

  [PERMISSION_CODES.QUOTATION_CREATE]: { category: 'quotations', description: 'Create quotations' },
  [PERMISSION_CODES.QUOTATION_READ]: { category: 'quotations', description: 'View quotations' },
  [PERMISSION_CODES.QUOTATION_UPDATE]: { category: 'quotations', description: 'Update quotations' },
  [PERMISSION_CODES.QUOTATION_SEND]: { category: 'quotations', description: 'Send quotations' },
  [PERMISSION_CODES.QUOTATION_ACCEPT]: { category: 'quotations', description: 'Accept/reject quotations' },

  [PERMISSION_CODES.BOOKING_CREATE]: { category: 'bookings', description: 'Create bookings' },
  [PERMISSION_CODES.BOOKING_READ]: { category: 'bookings', description: 'View bookings' },
  [PERMISSION_CODES.BOOKING_UPDATE]: { category: 'bookings', description: 'Update bookings' },
  [PERMISSION_CODES.BOOKING_CANCEL]: { category: 'bookings', description: 'Cancel bookings' },

  [PERMISSION_CODES.PAYMENT_CREATE]: { category: 'payments', description: 'Record payments' },
  [PERMISSION_CODES.PAYMENT_READ]: { category: 'payments', description: 'View payments' },

  [PERMISSION_CODES.TRIP_ASSIGN]: { category: 'trips', description: 'Assign trip staff' },
  [PERMISSION_CODES.TRIP_PUBLISH_ITINERARY]: { category: 'trips', description: 'Publish trip itinerary' },

  [PERMISSION_CODES.STAFF_ASSIGNMENT_CREATE]: { category: 'staff_assignments', description: 'Create staff assignments' },
  [PERMISSION_CODES.STAFF_ASSIGNMENT_READ]: { category: 'staff_assignments', description: 'View staff assignments' },
  [PERMISSION_CODES.STAFF_ASSIGNMENT_UPDATE]: { category: 'staff_assignments', description: 'Update staff assignments' },
  [PERMISSION_CODES.STAFF_ASSIGNMENT_DELETE]: { category: 'staff_assignments', description: 'Delete staff assignments' },

  [PERMISSION_CODES.SUPPLIER_BOOKING_CREATE]: { category: 'supplier_bookings', description: 'Create supplier bookings' },
  [PERMISSION_CODES.SUPPLIER_BOOKING_READ]: { category: 'supplier_bookings', description: 'View supplier bookings' },
  [PERMISSION_CODES.SUPPLIER_BOOKING_UPDATE]: { category: 'supplier_bookings', description: 'Update supplier bookings' },
  [PERMISSION_CODES.SUPPLIER_BOOKING_CONFIRM]: { category: 'supplier_bookings', description: 'Confirm supplier bookings' },
  [PERMISSION_CODES.SUPPLIER_BOOKING_CANCEL]: { category: 'supplier_bookings', description: 'Cancel supplier bookings' },
};

export async function seedPermissions(tx: PrismaClient = prisma) {
  for (const code of ALL_PERMISSIONS) {
    const meta = PERMISSION_METADATA[code];
    await tx.permission.upsert({
      where: { code },
      update: {
        description: meta?.description ?? null,
        category: meta?.category ?? 'general',
      },
      create: {
        code,
        description: meta?.description ?? null,
        category: meta?.category ?? 'general',
      },
    });
  }
}

export async function createSystemRolesForWorkspace(workspaceId: string, tx: PrismaClient = prisma) {
  const permissions = await tx.permission.findMany();
  const permMap = new Map(permissions.map((p) => [p.code, p.id]));

  for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS) as [SystemRoleName, PermissionCode[]][]) {
    const role = await tx.role.upsert({
      where: {
        workspaceId_name: {
          workspaceId,
          name: roleName,
        },
      },
      update: {
        isSystem: true,
      },
      create: {
        workspaceId,
        name: roleName,
        description: `System defined ${roleName} role`,
        isSystem: true,
      },
    });

    for (const code of permCodes) {
      const permissionId = permMap.get(code);
      if (permissionId) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId,
          },
        });
      }
    }
  }
}

async function main() {
  console.log('Starting Phase 0 database seed...');
  await seedPermissions();

  const demoWorkspace = await prisma.workspace.upsert({
    where: { slug: 'demo' },
    update: {
      name: 'Demo Workspace',
      status: 'ACTIVE',
    },
    create: {
      name: 'Demo Workspace',
      slug: 'demo',
      status: 'ACTIVE',
    },
  });

  await createSystemRolesForWorkspace(demoWorkspace.id);

  const ownerRole = await prisma.role.findUniqueOrThrow({
    where: {
      workspaceId_name: {
        workspaceId: demoWorkspace.id,
        name: SYSTEM_ROLES.OWNER,
      },
    },
  });

  const passwordHash = await argon2.hash('Demo123!');
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {
      firstName: 'Demo',
      lastName: 'Owner',
      passwordHash,
      status: 'ACTIVE',
    },
    create: {
      email: 'owner@demo.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Owner',
      status: 'ACTIVE',
    },
  });

  await prisma.membership.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: demoWorkspace.id,
        userId: ownerUser.id,
      },
    },
    update: {
      roleId: ownerRole.id,
      status: 'ACTIVE',
    },
    create: {
      workspaceId: demoWorkspace.id,
      userId: ownerUser.id,
      roleId: ownerRole.id,
      status: 'ACTIVE',
    },
  });

  await prisma.auditEvent.create({
    data: {
      workspaceId: demoWorkspace.id,
      userId: ownerUser.id,
      action: 'workspace:seeded',
      entityType: 'workspace',
      entityId: demoWorkspace.id,
      details: {
        message: 'Demo workspace initialized with Owner user and default roles',
      },
    },
  });

  console.log('Seed completed successfully!');
  console.log('Demo Credentials:');
  console.log('Email: owner@demo.com');
  console.log('Password: Demo123!');
}

if (process.argv[1]?.includes('seed.ts')) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
