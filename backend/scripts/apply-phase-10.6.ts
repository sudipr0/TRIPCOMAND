/**
 * Dry-run guard for prisma/sql/phase-10.6.sql.
 *
 * Runs the whole additive migration inside a transaction and always rolls it
 * back, so a syntax or constraint error surfaces before anything is applied.
 *
 *   npx tsx scripts/apply-phase-10.6.mjs --dry-run   (see the .mjs wrapper)
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  join(here, "..", "prisma", "sql", "phase-10.6.sql"),
  "utf8",
);

/** Statements are split on ';' at end of line; the file contains no procedural blocks. */
export function statements(source: string): string[] {
  return source
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const block = statements(sql);

  // This migration is additive only. `ON DELETE CASCADE` on a new FK is fine; a
  // statement that actually removes schema or rows is not.
  const destructive = block.filter((stmt) =>
    /^\s*(DROP\s+(TABLE|COLUMN|INDEX|CONSTRAINT)|TRUNCATE|DELETE\s+FROM)\b/i.test(stmt),
  );
  if (destructive.length) {
    throw new Error(
      `Migration contains destructive statements: ${destructive.join(" | ")}`,
    );
  }

  if (dryRun) {
    await prisma.$executeRawUnsafe("BEGIN");
    try {
      for (const stmt of block) await prisma.$executeRawUnsafe(stmt);
      console.log(
        `DRY RUN OK — ${block.length} statements applied, now rolling back.`,
      );
    } finally {
      await prisma.$executeRawUnsafe("ROLLBACK");
      console.log("Rolled back; nothing was persisted.");
    }
    return;
  }

  for (const stmt of block) await prisma.$executeRawUnsafe(stmt);
  console.log(`APPLIED — ${block.length} statements.`);
}

main()
  .catch((error) => {
    console.error(
      "Migration failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
