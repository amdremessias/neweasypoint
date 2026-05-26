import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, employeesTable, attendanceTable, payrollPeriodsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAuth";
import { z } from "zod";

const router: IRouter = Router();

function calcWorkDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

router.get("/payroll", requireAdmin, async (req, res): Promise<void> => {
  const { employeeId, month, year } = req.query as Record<string, string>;

  let query = db.select().from(payrollPeriodsTable).orderBy(payrollPeriodsTable.year, payrollPeriodsTable.month);
  if (employeeId) {
    query = query.where(eq(payrollPeriodsTable.employeeId, Number(employeeId))) as typeof query;
  }

  const periods = await query;

  const enriched = await Promise.all(
    periods.map(async (p) => {
      const [emp] = await db
        .select({ name: employeesTable.name, department: employeesTable.department })
        .from(employeesTable)
        .where(eq(employeesTable.id, p.employeeId));
      return { ...p, employeeName: emp?.name ?? "", employeeDepartment: emp?.department ?? "" };
    })
  );

  res.json(enriched);
});

router.get("/payroll/:employeeId/:month/:year", requireAdmin, async (req, res): Promise<void> => {
  const employeeId = Number(req.params.employeeId);
  const month = Number(req.params.month);
  const year = Number(req.params.year);

  if (isNaN(employeeId) || isNaN(month) || isNaN(year)) {
    res.status(400).json({ error: "Parametros invalidos." });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));
  if (!employee) {
    res.status(404).json({ error: "Funcionario nao encontrado." });
    return;
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const today = new Date();
  const effectiveEnd = today < endDate ? today : endDate;
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = effectiveEnd.toISOString().split("T")[0];

  const records = await db
    .select()
    .from(attendanceTable)
    .where(
      and(
        eq(attendanceTable.employeeId, employeeId),
        gte(attendanceTable.date, startStr),
        lte(attendanceTable.date, endStr)
      )
    );

  let totalMinutes = 0;
  let totalLateMinutes = 0;
  let lateDays = 0;
  let presentDays = 0;
  let overtimeMinutes = 0;
  let absentDays = 0;

  const workDays = calcWorkDays(startDate, effectiveEnd);

  for (const r of records) {
    if (r.totalMinutes) totalMinutes += r.totalMinutes;
    if (r.lateMinutes && r.lateMinutes > 0) {
      totalLateMinutes += r.lateMinutes;
      lateDays++;
    }
    if (r.totalMinutes && r.totalMinutes > 0) presentDays++;
    if (r.overtimeMinutes && r.overtimeMinutes > 0) overtimeMinutes += r.overtimeMinutes;
  }

  absentDays = Math.max(0, workDays - presentDays);

  const salary = Number(employee.salary ?? 0);
  const workloadMinutes = employee.workloadMinutes ?? 480;

  // Base salary: proportional to days worked if partial month
  const dailyMinutes = workloadMinutes;
  const expectedTotalMinutes = workDays * dailyMinutes;
  const baseSalary = salary; // Full month salary

  // Overtime pay: 50% extra per overtime hour
  const overtimeHours = overtimeMinutes / 60;
  const hourlyRate = salary / 220; // 220 hours = standard BR month
  const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5 * 100) / 100;

  // Deductions: proportional for absent days (rough estimate)
  const dailySalary = salary / workDays;
  const deductions = Math.round(absentDays * dailySalary * 100) / 100;

  const netSalary = Math.round((baseSalary + overtimePay - deductions) * 100) / 100;

  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const expectedHours = Math.round((expectedTotalMinutes / 60) * 10) / 10;

  res.json({
    employeeId,
    employeeName: employee.name,
    department: employee.department,
    month,
    year,
    salary,
    totalMinutes,
    totalHours,
    expectedHours,
    workDays,
    presentDays,
    absentDays,
    lateDays,
    totalLateMinutes,
    overtimeMinutes,
    baseSalary,
    overtimePay,
    deductions,
    netSalary,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    bancoDeHorasMinutes: employee.bancoDeHorasMinutes ?? 0,
    records,
  });
});

router.post("/payroll", requireAdmin, async (req, res): Promise<void> => {
  const schema = z.object({
    employeeId: z.number().int().positive(),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { employeeId, month, year } = parsed.data;

  // Calculate
  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));
  if (!employee) {
    res.status(404).json({ error: "Funcionario nao encontrado." });
    return;
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const today = new Date();
  const effectiveEnd = today < endDate ? today : endDate;
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = effectiveEnd.toISOString().split("T")[0];

  const records = await db
    .select()
    .from(attendanceTable)
    .where(
      and(
        eq(attendanceTable.employeeId, employeeId),
        gte(attendanceTable.date, startStr),
        lte(attendanceTable.date, endStr)
      )
    );

  let totalMinutes = 0;
  let overtimeMinutes = 0;
  let absentDays = 0;
  const workDays = calcWorkDays(startDate, effectiveEnd);

  for (const r of records) {
    if (r.totalMinutes) totalMinutes += r.totalMinutes;
    if (r.overtimeMinutes && r.overtimeMinutes > 0) overtimeMinutes += r.overtimeMinutes;
  }
  absentDays = Math.max(0, workDays - records.filter((r) => r.totalMinutes && r.totalMinutes > 0).length);

  const salary = Number(employee.salary ?? 0);
  const hourlyRate = salary / 220;
  const overtimeHours = overtimeMinutes / 60;
  const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5 * 100) / 100;
  const dailySalary = salary / workDays;
  const deductions = Math.round(absentDays * dailySalary * 100) / 100;
  const netSalary = Math.round((salary + overtimePay - deductions) * 100) / 100;

  // Upsert
  const existing = await db
    .select()
    .from(payrollPeriodsTable)
    .where(
      and(
        eq(payrollPeriodsTable.employeeId, employeeId),
        eq(payrollPeriodsTable.month, month),
        eq(payrollPeriodsTable.year, year)
      )
    )
    .limit(1);

  let period;
  if (existing.length > 0) {
    [period] = await db
      .update(payrollPeriodsTable)
      .set({
        totalMinutes,
        baseSalary: String(salary),
        overtimePay: String(overtimePay),
        deductions: String(deductions),
        netSalary: String(netSalary),
      })
      .where(eq(payrollPeriodsTable.id, existing[0].id))
      .returning();
  } else {
    [period] = await db
      .insert(payrollPeriodsTable)
      .values({
        employeeId,
        month,
        year,
        totalMinutes,
        baseSalary: String(salary),
        overtimePay: String(overtimePay),
        deductions: String(deductions),
        netSalary: String(netSalary),
      })
      .returning();
  }

  res.status(201).json(period);
});

export default router;
