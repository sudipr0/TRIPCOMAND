const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const days = await p.itineraryDay.findMany({
    where: { trip: { tripNumber: "TRP-2026-001" } },
    orderBy: { dayNumber: "asc" },
    select: { dayNumber: true, status: true, clientVisible: true },
  });
  console.log(days.map((d) => `Day ${d.dayNumber}: ${d.status}`).join("\n"));
  await p.$disconnect();
})();
