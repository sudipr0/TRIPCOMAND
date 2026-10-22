import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from '@tripchange/shared';

const prisma = new PrismaClient();

async function main() {
  let permCreated = 0;
  for (const code of ALL_PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { code } });
    if (!existing) {
      await prisma.permission.create({
        data: { code, category: code.split(':')[0] || 'general', description: code },
      });
      permCreated++;
    }
  }
  console.log('Permissions created:', permCreated, '/ total', ALL_PERMISSIONS.length);

  let workspace = await prisma.workspace.findUnique({ where: { slug: 'demo' } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: 'Demo Workspace', slug: 'demo', status: 'ACTIVE' },
    });
  }
  console.log('Workspace:', workspace.id);

  const perms = await prisma.permission.findMany();
  const permMap = new Map(perms.map((p) => [p.code, p.id]));

  for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: roleName } },
      update: { isSystem: true },
      create: { workspaceId: workspace.id, name: roleName, description: roleName, isSystem: true },
    });
    for (const code of permCodes) {
      const permId = permMap.get(code);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
          update: {},
          create: { roleId: role.id, permissionId: permId },
        });
      }
    }
  }
  console.log('Roles ensured:', Object.keys(ROLE_PERMISSIONS).length);

  const hash = await argon2.hash('Demo123!');
  const user = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: { passwordHash: hash },
    create: { email: 'owner@demo.com', passwordHash: hash, firstName: 'Demo', lastName: 'Owner', status: 'ACTIVE' },
  });
  console.log('User:', user.email);

  const ownerRole = await prisma.role.findUnique({
    where: { workspaceId_name: { workspaceId: workspace.id, name: 'Owner' } },
  });
  if (!ownerRole) throw new Error('Owner role missing');

  await prisma.membership.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { roleId: ownerRole.id, status: 'ACTIVE' },
    create: { workspaceId: workspace.id, userId: user.id, roleId: ownerRole.id, status: 'ACTIVE' },
  });
  console.log('Membership: OK');
  console.log('✅ Done. Login: owner@demo.com / Demo123!');
}

main().catch(e => { console.error('❌ ERROR:', e.message); console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
