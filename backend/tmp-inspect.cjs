const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const ws = await p.workspace.findUnique({
    where: { id: process.argv[2] },
    select: { name: true, settings: true },
  });
  const access = await p.portalAccess.findMany({
    select: {
      status: true,
      expiresAt: true,
      token: true,
      traveler: { select: { fullName: true } },
    },
  });
  const docs = await p.tripDocument.findMany({
    select: { fileName: true, documentType: true, uploadedByTraveler: true },
  });
  console.log(JSON.stringify({ ws, access, docs }, null, 1));
  await p.$disconnect();
})();
