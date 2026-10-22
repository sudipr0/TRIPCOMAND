import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { rawPrisma } from "./lib/prisma.js";

async function startServer() {
  try {
    const app = await buildApp();

    const host = "0.0.0.0";
    const port = env.API_PORT;

    await app.listen({ port, host });
    logger.info(
      `🚀 TripChange Intelligence API running at http://${host}:${port}`,
    );

    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        await app.close();
        await rawPrisma.$disconnect();
        process.exit(0);
      });
    }
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

startServer();
