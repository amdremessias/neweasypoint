import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, employeesTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const router: IRouter = Router();

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email e senha são obrigatórios." });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()));

  if (!user) {
    res.status(401).json({ error: "Email ou senha incorretos." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Email ou senha incorretos." });
    return;
  }

  req.session.userId = user.id;
  req.session.userRole = user.role;
  req.session.userName = user.name;
  req.session.userEmail = user.email;
  req.session.employeeId = user.employeeId ?? undefined;

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions ? JSON.parse(user.permissions) : [],
    employeeId: user.employeeId ?? null,
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      permissions: usersTable.permissions,
      employeeId: usersTable.employeeId,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Sessão inválida." });
    return;
  }

  // If employee role, also fetch employee info
  let employee = null;
  if ((user.role === "employee" || user.role === "manager") && user.employeeId) {
    const [emp] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, user.employeeId));
    employee = emp ?? null;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions ? JSON.parse(user.permissions) : [],
    employeeId: user.employeeId,
    employee,
  });
});

export default router;
