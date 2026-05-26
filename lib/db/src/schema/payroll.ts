import { pgTable, integer, text, serial, timestamp, numeric } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";

export const payrollPeriodsTable = pgTable("payroll_periods", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalMinutes: integer("total_minutes").notNull().default(0),
  baseSalary: numeric("base_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  overtimePay: numeric("overtime_pay", { precision: 12, scale: 2 }).notNull().default("0"),
  deductions: numeric("deductions", { precision: 12, scale: 2 }).notNull().default("0"),
  netSalary: numeric("net_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PayrollPeriod = typeof payrollPeriodsTable.$inferSelect;
export type InsertPayrollPeriod = typeof payrollPeriodsTable.$inferInsert;
