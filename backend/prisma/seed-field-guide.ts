/**
 * Phase 7 demo access — a Guide who can only use the field app.
 *
 * Run after seed.ts + seed-demo-data.ts (it links to the seeded EBC trip's lead guide):
 *   pnpm --filter @trailcomand/backend exec tsx prisma/seed-field-guide.ts
 *
 * Idempotent. Credentials: guide@demo.com / Demo123!
 */
import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { PERMISSION_CODES, ROLE_PERMISSIONS } from '@trailcomand/shared';

const prisma = new PrismaClient();

const GUIDE_ROLE = 'Guide';
const GUIDE_PERMISSIONS = [
  PERMISSION_CODES.TRIP_READ,
  PERMISSION_CODES.TRIP_UPDATE,
  PERMISSION_CODES.WORKSPACE_READ,
  PERMISSION_CODES.STAFF_READ,
];

async function main() {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { slug: 'demo' } });

  const role = await prisma.role.upsert({
    where: { workspaceId_name: { workspaceId: workspace.id, name: GUIDE_ROLE } },
    update: { isSystem: false },
    create: { workspaceId: workspace.id, name: GUIDE_ROLE, description: 'Field guide — assigned trips only', isSystem: false },
  });

  const permissions = await prisma.permission.findMany({ where: { code: { in: GUIDE_PERMISSIONS } } });
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }
  console.log(`Role "${GUIDE_ROLE}" has ${permissions.length} permissions`);

  const passwordHash = await argon2.hash('Demo123!');
  const user = await prisma.user.upsert({
    where: { email: 'guide@demo.com' },
    update: { firstName: 'Dawa', lastName: 'Sherpa', passwordHash, status: 'ACTIVE' },
    create: { email: 'guide@demo.com', passwordHash, firstName: 'Dawa', lastName: 'Sherpa', status: 'ACTIVE' },
  });

  await prisma.membership.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { roleId: role.id, status: 'ACTIVE' },
    create: { workspaceId: workspace.id, userId: user.id, roleId: role.id, status: 'ACTIVE' },
  });

  const staff = await prisma.staffProfile.findFirst({ where: { workspaceId: workspace.id, fullName: 'Dawa Sherpa' } });
  if (staff) {
    await prisma.staffProfile.update({
      where: { id: staff.id },
      data: { userId: user.id, staffType: 'GUIDE', status: 'ASSIGNED' },
    });
    const trip = await prisma.trip.findFirst({ where: { workspaceId: workspace.id, leadGuideId: staff.id } });
    if (trip) console.log(`Linked guide profile to trip ${trip.tripNumber}`);
  } else {
    console.warn('No "Dawa Sherpa" staff profile found — run seed-demo-data.ts first');
  }

  console.log('Guide login: guide@demo.com / Demo123!');
  console.log('Office roles in ROLE_PERMISSIONS:', Object.keys(ROLE_PERMISSIONS).length);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
