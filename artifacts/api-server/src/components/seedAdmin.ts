import { db, usersTable } from "@workspace/db";
import { count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function seedAdminIfNeeded(): Promise<void> {
  const [row] = await db.select({ total: count() }).from(usersTable);
  if (Number(row?.total ?? 0) > 0) return;

  const email = process.env.ADMIN_EMAIL ?? "admin@pontofacil.com";
  const name = process.env.ADMIN_NAME ?? "Administrador";

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    // Generate a random password and print it — ONLY on first startup with no users
    password = crypto.randomBytes(10).toString("hex");
    console.log("=".repeat(60));
    console.log("ATENÇÃO: Nenhum usuário encontrado.");
    console.log("Criando administrador com senha gerada automaticamente:");
    console.log(`  Email: ${email}`);
    console.log(`  Senha: ${password}`);
    console.log("Defina ADMIN_PASSWORD no ambiente para controlar a senha.");
    console.log("=".repeat(60));
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(usersTable).values({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role: "admin",
  });

  console.log(`Admin criado: ${email}`);
}
