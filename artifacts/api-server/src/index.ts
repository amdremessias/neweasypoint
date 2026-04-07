import path from "path";
import { fileURLToPath } from "url";
import app from "./app";
import { logger } from "./lib/logger";
import { seedAdminIfNeeded } from "./components/seedAdmin";
import { migrateDb } from "@workspace/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  try {
    logger.info("Applying database migrations...");
    await migrateDb(path.join(__dirname, "migrations"));
    logger.info("Database migrations applied successfully.");
    await seedAdminIfNeeded();
  } catch (err) {
    logger.error({ err }, "Falha na inicialização do banco de dados");
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

main();
