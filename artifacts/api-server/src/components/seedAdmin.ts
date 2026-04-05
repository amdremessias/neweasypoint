import { db, usersTable } from "@workspace/db";
import { count } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedAdminIfNeeded(): Promise<void> {
  const [row] = await db.select({ total: count() }).from(usersTable);
  if (Number(row?.total ?? 0) > 0) return;

  const passwordHash = await bcrypt.hash("admin123", 10);
  await db.insert(usersTable).values({
    name: "Administrador",
    email: "admin@pontofacil.com",
    passwordHash,
    role: "admin",
  });

  console.log("Admin criado: admin@pontofacil.com / admin123");
}
