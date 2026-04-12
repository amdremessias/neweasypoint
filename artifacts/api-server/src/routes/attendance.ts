import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, attendanceTable, employeesTable } from "@workspace/db";
import {
  CreateAttendanceBody,
  GetAttendanceParams,
  UpdateAttendanceParams,
  UpdateAttendanceBody,
  DeleteAttendanceParams,
  ClockInBody,
  ClockOutBody,
} from "@workspace/api-zod";
import { z } from "zod";

const AttendanceListQuery = z.object({
  employeeId: z.coerce.number().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.enum(["open", "closed"]).optional(),
});

const router: IRouter = Router();

function calcMinutes(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 60000);
}

function getBRTMinutes(date: Date): number {
  const brtOffset = -3 * 60;
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return ((utcMinutes + brtOffset) + 1440) % 1440;
}

function calcLateMinutes(expectedCheckin: string, clockIn: Date): number {
  const [expHour, expMin] = expectedCheckin.split(":").map(Number);
  const expectedTotal = expHour * 60 + expMin;
  const clockInTotal = getBRTMinutes(clockIn);
  const diff = clockInTotal - expectedTotal;
  return diff > 0 ? diff : 0;
}

function calcOvertimeMinutes(expectedCheckout: string, clockOut: Date): number {
  const [expHour, expMin] = expectedCheckout.split(":").map(Number);
  const expectedTotal = expHour * 60 + expMin;
  const clockOutTotal = getBRTMinutes(clockOut);
  const diff = clockOutTotal - expectedTotal;
  return diff > 0 ? diff : 0;
}

function formatRecord(record: typeof attendanceTable.$inferSelect, employee: typeof employeesTable.$inferSelect | null) {
  return {
    id: record.id,
    employeeId: record.employeeId,
    employeeName: employee?.name ?? "Unknown",
    employeeDepartment: employee?.department ?? "Unknown",
    date: record.date,
    clockIn: record.clockIn,
    lunchOut: record.lunchOut ?? null,
    lunchIn: record.lunchIn ?? null,
    clockOut: record.clockOut ?? null,
    lunchMinutes: record.lunchMinutes ?? null,
    totalMinutes: record.totalMinutes ?? null,
    status: record.status,
    notes: record.notes ?? null,
    lateMinutes: record.lateMinutes ?? null,
    overtimeMinutes: record.overtimeMinutes ?? null,
  };
}

router.post("/attendance/clockin", async (req, res): Promise<void> => {
  const parsed = ClockInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, parsed.data.employeeId));
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const existing = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.employeeId, parsed.data.employeeId), eq(attendanceTable.date, todayStr)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Já existe registro de entrada para hoje." });
    return;
  }

  const lateMinutes = calcLateMinutes(employee.expectedCheckin, now);

  const [record] = await db
    .insert(attendanceTable)
    .values({
      employeeId: parsed.data.employeeId,
      date: todayStr,
      clockIn: now,
      status: "open",
      lateMinutes,
    })
    .returning();

  res.status(201).json(formatRecord(record, employee));
});

router.post("/attendance/lunch-out", async (req, res): Promise<void> => {
  const parsed = ClockOutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, parsed.data.employeeId));
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const [openRecord] = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.employeeId, parsed.data.employeeId), eq(attendanceTable.date, todayStr), eq(attendanceTable.status, "open")))
    .orderBy(desc(attendanceTable.clockIn))
    .limit(1);

  if (!openRecord) {
    res.status(404).json({ error: "Nenhum registro de entrada em aberto para hoje." });
    return;
  }

  if (openRecord.lunchOut) {
    res.status(409).json({ error: "Saída para almoço já registrada." });
    return;
  }

  const now = new Date();

  const [updated] = await db
    .update(attendanceTable)
    .set({ lunchOut: now })
    .where(eq(attendanceTable.id, openRecord.id))
    .returning();

  res.json(formatRecord(updated, employee));
});

router.post("/attendance/lunch-in", async (req, res): Promise<void> => {
  const parsed = ClockOutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, parsed.data.employeeId));
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const [openRecord] = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.employeeId, parsed.data.employeeId), eq(attendanceTable.date, todayStr), eq(attendanceTable.status, "open")))
    .orderBy(desc(attendanceTable.clockIn))
    .limit(1);

  if (!openRecord) {
    res.status(404).json({ error: "Nenhum registro de entrada em aberto para hoje." });
    return;
  }

  if (!openRecord.lunchOut) {
    res.status(409).json({ error: "Registre a saída para almoço primeiro." });
    return;
  }

  if (openRecord.lunchIn) {
    res.status(409).json({ error: "Retorno do almoço já registrado." });
    return;
  }

  const now = new Date();
  const lunchMinutes = calcMinutes(openRecord.lunchOut, now);

  const [updated] = await db
    .update(attendanceTable)
    .set({ lunchIn: now, lunchMinutes })
    .where(eq(attendanceTable.id, openRecord.id))
    .returning();

  res.json(formatRecord(updated, employee));
});

router.post("/attendance/clockout", async (req, res): Promise<void> => {
  const parsed = ClockOutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, parsed.data.employeeId));
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const [openRecord] = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.employeeId, parsed.data.employeeId), eq(attendanceTable.date, todayStr), eq(attendanceTable.status, "open")))
    .orderBy(desc(attendanceTable.clockIn))
    .limit(1);

  if (!openRecord) {
    res.status(404).json({ error: "Nenhum registro de entrada em aberto para hoje." });
    return;
  }

  const now = new Date();

  let totalMinutes: number;
  if (openRecord.lunchOut && openRecord.lunchIn) {
    const morningMinutes = calcMinutes(openRecord.clockIn, openRecord.lunchOut);
    const afternoonMinutes = calcMinutes(openRecord.lunchIn, now);
    totalMinutes = morningMinutes + afternoonMinutes;
  } else {
    totalMinutes = calcMinutes(openRecord.clockIn, now);
  }

  const overtimeMinutes = calcOvertimeMinutes(employee.expectedCheckout, now);

  const [updated] = await db
    .update(attendanceTable)
    .set({ clockOut: now, totalMinutes, status: "closed", overtimeMinutes })
    .where(eq(attendanceTable.id, openRecord.id))
    .returning();

  res.json(formatRecord(updated, employee));
});

router.get("/attendance", async (req, res): Promise<void> => {
  const query = AttendanceListQuery.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { employeeId, dateFrom, dateTo, status } = query.data;

  const conditions = [];
  if (employeeId) conditions.push(eq(attendanceTable.employeeId, employeeId));
  if (dateFrom) conditions.push(gte(attendanceTable.date, dateFrom));
  if (dateTo) conditions.push(lte(attendanceTable.date, dateTo));
  if (status) conditions.push(eq(attendanceTable.status, status));

  const records = await db
    .select({ attendance: attendanceTable, employee: employeesTable })
    .from(attendanceTable)
    .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(attendanceTable.clockIn));

  const result = records.map(r => formatRecord(r.attendance, r.employee ?? null));

  res.json(result);
});

router.post("/attendance", async (req, res): Promise<void> => {
  const parsed = CreateAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, parsed.data.employeeId));

  const clockIn = new Date(parsed.data.clockIn);
  const dateStr = clockIn.toISOString().split("T")[0];
  const lateMinutes = employee ? calcLateMinutes(employee.expectedCheckin, clockIn) : 0;

  let totalMinutes: number | undefined;
  let overtimeMinutes: number | undefined;
  let status = "open";

  if (parsed.data.clockOut) {
    const clockOut = new Date(parsed.data.clockOut);
    totalMinutes = calcMinutes(clockIn, clockOut);
    overtimeMinutes = employee ? calcOvertimeMinutes(employee.expectedCheckout, clockOut) : 0;
    status = "closed";
  }

  const [record] = await db
    .insert(attendanceTable)
    .values({
      employeeId: parsed.data.employeeId,
      date: dateStr,
      clockIn,
      clockOut: parsed.data.clockOut ? new Date(parsed.data.clockOut) : null,
      totalMinutes,
      status,
      notes: parsed.data.notes ?? null,
      lateMinutes,
      overtimeMinutes,
    })
    .returning();

  res.status(201).json(formatRecord(record, employee ?? null));
});

router.get("/attendance/:id", async (req, res): Promise<void> => {
  const params = GetAttendanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ attendance: attendanceTable, employee: employeesTable })
    .from(attendanceTable)
    .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
    .where(eq(attendanceTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Attendance record not found" });
    return;
  }

  res.json(formatRecord(row.attendance, row.employee ?? null));
});

router.put("/attendance/:id", async (req, res): Promise<void> => {
  const params = UpdateAttendanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select({ attendance: attendanceTable, employee: employeesTable })
    .from(attendanceTable)
    .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
    .where(eq(attendanceTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Attendance record not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  if (parsed.data.clockIn) updateData.clockIn = new Date(parsed.data.clockIn);
  if (parsed.data.clockOut) {
    const clockOut = new Date(parsed.data.clockOut);
    updateData.clockOut = clockOut;
    const clockIn = parsed.data.clockIn ? new Date(parsed.data.clockIn) : existing.attendance.clockIn;
    updateData.totalMinutes = calcMinutes(clockIn, clockOut);
    updateData.status = "closed";
    if (existing.employee) {
      updateData.overtimeMinutes = calcOvertimeMinutes(existing.employee.expectedCheckout, clockOut);
    }
  }

  const [updated] = await db
    .update(attendanceTable)
    .set(updateData)
    .where(eq(attendanceTable.id, params.data.id))
    .returning();

  res.json(formatRecord(updated, existing.employee ?? null));
});

router.delete("/attendance/:id", async (req, res): Promise<void> => {
  const params = DeleteAttendanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [record] = await db
    .delete(attendanceTable)
    .where(eq(attendanceTable.id, params.data.id))
    .returning();

  if (!record) {
    res.status(404).json({ error: "Attendance record not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
