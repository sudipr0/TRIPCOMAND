const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const docs = await p.tripDocument.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      fileName: true,
      documentType: true,
      uploadedByTraveler: true,
      createdAt: true,
      traveler: { select: { fullName: true } },
    },
  });
  console.log(JSON.stringify(docs, null, 1));
  await p.$disconnect();
})();
