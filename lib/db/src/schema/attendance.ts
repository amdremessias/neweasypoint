import { pgTable, integer, text, serial, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  clockIn: timestamp("clock_in", { withTimezone: true }).notNull(),
  lunchOut: timestamp("lunch_out", { withTimezone: true }),
  lunchIn: timestamp("lunch_in", { withTimezone: true }),
  clockOut: timestamp("clock_out", { withTimezone: true }),
  lunchMinutes: integer("lunch_minutes"),
  totalMinutes: integer("total_minutes"),
  status: text("status").notNull().default("open"),
  notes: text("notes"),
  lateMinutes: integer("late_minutes"),
  overtimeMinutes: integer("overtime_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, createdAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
