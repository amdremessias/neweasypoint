import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

const CreateUserBody = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "employee"]).default("employee"),
  employeeId: z.number().nullable().optional(),
});

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      employeeId: usersTable.employeeId,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  res.json(users);
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, role, employeeId } = parsed.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()));

  if (existing) {
    res.status(409).json({ error: "Este e-mail já está em uso." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      employeeId: employeeId ?? null,
    })
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      employeeId: usersTable.employeeId,
    });

  res.status(201).json(user);
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  // Prevent deleting self
  if (id === req.session.userId) {
    res.status(400).json({ error: "Você não pode excluir sua própria conta." });
    return;
  }

  const [deleted] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Usuário não encontrado." });
    return;
  }

  res.json({ ok: true });
});

export default router;
