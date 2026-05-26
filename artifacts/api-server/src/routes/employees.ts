import { Router, type IRouter } from "express";
import { eq, and, ilike, or } from "drizzle-orm";
import { db, employeesTable } from "@workspace/db";
import {
  ListEmployeesQueryParams,
  CreateEmployeeBody,
  GetEmployeeParams,
  UpdateEmployeeParams,
  UpdateEmployeeBody,
  DeleteEmployeeParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/employees", async (req, res): Promise<void> => {
  const query = ListEmployeesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, department, status } = query.data;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(employeesTable.name, `%${search}%`),
        ilike(employeesTable.email, `%${search}%`),
        ilike(employeesTable.position, `%${search}%`)
      )
    );
  }
  if (department) {
    conditions.push(eq(employeesTable.department, department));
  }
  if (status) {
    conditions.push(eq(employeesTable.status, status));
  }

  const employees = await db
    .select()
    .from(employeesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(employeesTable.name);

  res.json(employees.map(e => ({
    id: e.id,
    name: e.name,
    email: e.email,
    department: e.department,
    position: e.position,
    expectedCheckin: e.expectedCheckin,
    expectedCheckout: e.expectedCheckout,
    status: e.status,
    salary: e.salary,
    workloadMinutes: e.workloadMinutes,
    bancoDeHorasMinutes: e.bancoDeHorasMinutes,
    createdAt: e.createdAt,
  })));
});

router.post("/employees", async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [employee] = await db
    .insert(employeesTable)
    .values(parsed.data)
    .returning();

  res.status(201).json({
    id: employee.id,
    name: employee.name,
    email: employee.email,
    department: employee.department,
    position: employee.position,
    expectedCheckin: employee.expectedCheckin,
    expectedCheckout: employee.expectedCheckout,
    status: employee.status,
    createdAt: employee.createdAt,
  });
});

router.get("/employees/:id/banco-de-horas", async (req, res): Promise<void> => {
  const params = GetEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, params.data.id));
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.json({
    employeeId: employee.id,
    employeeName: employee.name,
    bancoDeHorasMinutes: employee.bancoDeHorasMinutes ?? 0,
    bancoDeHorasHours: Math.round((employee.bancoDeHorasMinutes ?? 0) / 6) / 10,
  });
});

router.get("/employees/:id", async (req, res): Promise<void> => {
  const params = GetEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.id, params.data.id));

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.json({
    id: employee.id,
    name: employee.name,
    email: employee.email,
    department: employee.department,
    position: employee.position,
    expectedCheckin: employee.expectedCheckin,
    expectedLunchOut: employee.expectedLunchOut,
    expectedLunchIn: employee.expectedLunchIn,
    expectedCheckout: employee.expectedCheckout,
    status: employee.status,
    salary: employee.salary,
    workloadMinutes: employee.workloadMinutes,
    bancoDeHorasMinutes: employee.bancoDeHorasMinutes,
    createdAt: employee.createdAt,
  });
});

router.put("/employees/:id", async (req, res): Promise<void> => {
  const params = UpdateEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.department !== undefined) updateData.department = parsed.data.department;
  if (parsed.data.position !== undefined) updateData.position = parsed.data.position;
  if (parsed.data.expectedCheckin !== undefined) updateData.expectedCheckin = parsed.data.expectedCheckin;
  if (parsed.data.expectedCheckout !== undefined) updateData.expectedCheckout = parsed.data.expectedCheckout;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (req.body.salary !== undefined) updateData.salary = req.body.salary;
  if (req.body.workloadMinutes !== undefined) updateData.workloadMinutes = req.body.workloadMinutes;

  const [employee] = await db
    .update(employeesTable)
    .set(updateData)
    .where(eq(employeesTable.id, params.data.id))
    .returning();

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.json({
    id: employee.id,
    name: employee.name,
    email: employee.email,
    department: employee.department,
    position: employee.position,
    expectedCheckin: employee.expectedCheckin,
    expectedCheckout: employee.expectedCheckout,
    status: employee.status,
    createdAt: employee.createdAt,
  });
});

router.delete("/employees/:id", async (req, res): Promise<void> => {
  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [employee] = await db
    .delete(employeesTable)
    .where(eq(employeesTable.id, params.data.id))
    .returning();

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
