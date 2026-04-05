import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { db, attendanceTable, employeesTable } from "@workspace/db";
import {
  GetEmployeeHoursReportParams,
  GetEmployeeHoursReportQueryParams,
  GetRecentActivityQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports/dashboard", async (req, res): Promise<void> => {
  const todayStr = new Date().toISOString().split("T")[0];

  const [totalRow] = await db
    .select({ count: count() })
    .from(employeesTable)
    .where(eq(employeesTable.status, "active"));

  const totalEmployees = totalRow?.count ?? 0;

  const todayRecords = await db
    .select({ attendance: attendanceTable, employee: employeesTable })
    .from(attendanceTable)
    .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
    .where(eq(attendanceTable.date, todayStr));

  const presentIds = new Set(todayRecords.map(r => r.attendance.employeeId));
  const presentToday = presentIds.size;
  const absentToday = Math.max(0, totalEmployees - presentToday);
  const lateToday = todayRecords.filter(r => (r.attendance.lateMinutes ?? 0) > 0).length;
  const clockedOutToday = todayRecords.filter(r => r.attendance.status === "closed").length;
  const stillWorkingNow = todayRecords.filter(r => r.attendance.status === "open").length;

  // Average hours this week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  const startOfWeekStr = startOfWeek.toISOString().split("T")[0];

  const weekRecords = await db
    .select({ totalMinutes: attendanceTable.totalMinutes })
    .from(attendanceTable)
    .where(and(
      gte(attendanceTable.date, startOfWeekStr),
      lte(attendanceTable.date, todayStr),
      eq(attendanceTable.status, "closed")
    ));

  const totalWeekMinutes = weekRecords.reduce((sum, r) => sum + (r.totalMinutes ?? 0), 0);
  const averageHoursThisWeek = weekRecords.length > 0
    ? Math.round((totalWeekMinutes / weekRecords.length / 60) * 10) / 10
    : 0;

  // Attendance rate this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthRecordsResult = await db
    .select({ employeeId: attendanceTable.employeeId, date: attendanceTable.date })
    .from(attendanceTable)
    .where(and(gte(attendanceTable.date, startOfMonth), lte(attendanceTable.date, todayStr)));

  const workDays = getWorkDaysInRange(new Date(startOfMonth), now);
  const expectedAttendances = totalEmployees * workDays;
  const attendanceRateThisMonth = expectedAttendances > 0
    ? Math.round((monthRecordsResult.length / expectedAttendances) * 1000) / 10
    : 0;

  res.json({
    totalEmployees,
    presentToday,
    absentToday,
    lateToday,
    clockedOutToday,
    stillWorkingNow,
    averageHoursThisWeek,
    attendanceRateThisMonth: Math.min(100, attendanceRateThisMonth),
  });
});

function getWorkDaysInRange(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

router.get("/reports/employee/:id/hours", async (req, res): Promise<void> => {
  const params = GetEmployeeHoursReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = GetEmployeeHoursReportQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const now = new Date();
  const month = query.data.month ?? now.getMonth() + 1;
  const year = query.data.year ?? now.getFullYear();

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, params.data.id));
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  const records = await db
    .select()
    .from(attendanceTable)
    .where(and(
      eq(attendanceTable.employeeId, params.data.id),
      gte(attendanceTable.date, startStr),
      lte(attendanceTable.date, endStr)
    ));

  const recordsByDate = new Map(records.map(r => [r.date, r]));

  const dailyBreakdown = [];
  const current = new Date(startDate);
  let presentDays = 0, absentDays = 0, lateDays = 0;
  let totalMinutes = 0;

  const todayStr = now.toISOString().split("T")[0];

  while (current <= endDate && current.toISOString().split("T")[0] <= todayStr) {
    const dateStr = current.toISOString().split("T")[0];
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const record = recordsByDate.get(dateStr);

    if (isWeekend) {
      dailyBreakdown.push({
        date: dateStr,
        clockIn: null,
        clockOut: null,
        hoursWorked: null,
        status: "weekend",
        lateMinutes: null,
      });
    } else if (record) {
      presentDays++;
      if ((record.lateMinutes ?? 0) > 0) lateDays++;
      const hours = record.totalMinutes ? Math.round(record.totalMinutes / 6) / 10 : null;
      if (record.totalMinutes) totalMinutes += record.totalMinutes;
      dailyBreakdown.push({
        date: dateStr,
        clockIn: record.clockIn ? record.clockIn.toISOString().substr(11, 5) : null,
        clockOut: record.clockOut ? record.clockOut.toISOString().substr(11, 5) : null,
        hoursWorked: hours,
        status: "present",
        lateMinutes: record.lateMinutes ?? null,
      });
    } else {
      absentDays++;
      dailyBreakdown.push({
        date: dateStr,
        clockIn: null,
        clockOut: null,
        hoursWorked: null,
        status: "absent",
        lateMinutes: null,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  const workDays = getWorkDaysInRange(startDate, now < endDate ? now : endDate);
  const [expHour, expMin] = employee.expectedCheckin.split(":").map(Number);
  const [outHour, outMin] = employee.expectedCheckout.split(":").map(Number);
  const dailyExpectedMinutes = (outHour * 60 + outMin) - (expHour * 60 + expMin);
  const expectedHours = Math.round((workDays * dailyExpectedMinutes / 60) * 10) / 10;
  const totalHours = Math.round(totalMinutes / 6) / 10;
  const overtimeHours = Math.max(0, Math.round((totalHours - expectedHours) * 10) / 10);

  res.json({
    employeeId: employee.id,
    employeeName: employee.name,
    month,
    year,
    totalDays: workDays,
    presentDays,
    absentDays,
    lateDays,
    totalHours,
    expectedHours,
    overtimeHours,
    dailyBreakdown,
  });
});

router.get("/reports/department-summary", async (req, res): Promise<void> => {
  const todayStr = new Date().toISOString().split("T")[0];

  const employees = await db.select().from(employeesTable).where(eq(employeesTable.status, "active"));

  const todayAttendance = await db
    .select({ employeeId: attendanceTable.employeeId, lateMinutes: attendanceTable.lateMinutes })
    .from(attendanceTable)
    .where(eq(attendanceTable.date, todayStr));

  const presentSet = new Set(todayAttendance.map(r => r.employeeId));
  const lateSet = new Set(todayAttendance.filter(r => (r.lateMinutes ?? 0) > 0).map(r => r.employeeId));

  const departmentMap = new Map<string, { total: number; present: number; late: number }>();

  for (const emp of employees) {
    if (!departmentMap.has(emp.department)) {
      departmentMap.set(emp.department, { total: 0, present: 0, late: 0 });
    }
    const dept = departmentMap.get(emp.department)!;
    dept.total++;
    if (presentSet.has(emp.id)) dept.present++;
    if (lateSet.has(emp.id)) dept.late++;
  }

  const result = Array.from(departmentMap.entries()).map(([department, data]) => ({
    department,
    totalEmployees: data.total,
    presentToday: data.present,
    absentToday: data.total - data.present,
    lateToday: data.late,
    attendanceRate: data.total > 0 ? Math.round((data.present / data.total) * 1000) / 10 : 0,
  }));

  res.json(result);
});

router.get("/reports/recent-activity", async (req, res): Promise<void> => {
  const query = GetRecentActivityQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const limit = query.data.limit ?? 20;

  const clockIns = await db
    .select({ attendance: attendanceTable, employee: employeesTable })
    .from(attendanceTable)
    .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
    .orderBy(desc(attendanceTable.clockIn))
    .limit(limit);

  const clockOuts = await db
    .select({ attendance: attendanceTable, employee: employeesTable })
    .from(attendanceTable)
    .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
    .where(sql`${attendanceTable.clockOut} IS NOT NULL`)
    .orderBy(desc(attendanceTable.clockOut))
    .limit(limit);

  const activity: {
    id: number;
    employeeId: number;
    employeeName: string;
    department: string;
    type: "clock_in" | "clock_out";
    timestamp: Date;
    lateMinutes: number | null;
  }[] = [];

  for (const r of clockIns) {
    activity.push({
      id: r.attendance.id * 2,
      employeeId: r.attendance.employeeId,
      employeeName: r.employee?.name ?? "Unknown",
      department: r.employee?.department ?? "Unknown",
      type: "clock_in",
      timestamp: r.attendance.clockIn,
      lateMinutes: r.attendance.lateMinutes ?? null,
    });
  }

  for (const r of clockOuts) {
    if (r.attendance.clockOut) {
      activity.push({
        id: r.attendance.id * 2 + 1,
        employeeId: r.attendance.employeeId,
        employeeName: r.employee?.name ?? "Unknown",
        department: r.employee?.department ?? "Unknown",
        type: "clock_out",
        timestamp: r.attendance.clockOut,
        lateMinutes: null,
      });
    }
  }

  activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  res.json(activity.slice(0, limit));
});

router.get("/reports/late-arrivals", async (req, res): Promise<void> => {
  const todayStr = new Date().toISOString().split("T")[0];

  const lateRecords = await db
    .select({ attendance: attendanceTable, employee: employeesTable })
    .from(attendanceTable)
    .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
    .where(and(
      eq(attendanceTable.date, todayStr),
      sql`${attendanceTable.lateMinutes} > 0`
    ))
    .orderBy(desc(attendanceTable.lateMinutes));

  const result = lateRecords.map(r => ({
    employeeId: r.attendance.employeeId,
    employeeName: r.employee?.name ?? "Unknown",
    department: r.employee?.department ?? "Unknown",
    expectedCheckin: r.employee?.expectedCheckin ?? "09:00",
    actualCheckin: r.attendance.clockIn,
    lateMinutes: r.attendance.lateMinutes ?? 0,
  }));

  res.json(result);
});

export default router;
