import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function migrateDb(migrationsFolder: string): Promise<void> {
  const client = await pool.connect();
  try {
    const migrationDb = drizzle(client);
    await migrate(migrationDb, { migrationsFolder });
  } finally {
    client.release();
  }
}

export * from "./schema";
