import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  department: text("department").notNull(),
  position: text("position").notNull(),
  expectedCheckin: text("expected_checkin").notNull().default("09:00"),
  expectedLunchOut: text("expected_lunch_out").notNull().default("12:00"),
  expectedLunchIn: text("expected_lunch_in").notNull().default("13:00"),
  expectedCheckout: text("expected_checkout").notNull().default("18:00"),
  status: text("status").notNull().default("active"),
  salary: numeric("salary", { precision: 12, scale: 2 }).default("0"),
  workloadMinutes: integer("workload_minutes").notNull().default(480),
  bancoDeHorasMinutes: integer("banco_de_horas_minutes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
