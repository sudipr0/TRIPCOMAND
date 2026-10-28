const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const result = await p.tripDocument.deleteMany({
    where: { fileName: "sarah-passport-scan.pdf", uploadedByTraveler: true },
  });
  console.log(`deleted ${result.count} smoke-test documents`);
  await p.$disconnect();
})();
