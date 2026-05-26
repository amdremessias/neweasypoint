import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("employee"), // "admin" | "manager" | "employee"
  permissions: text("permissions").default("{}"), // JSON array of permission strings
  employeeId: integer("employee_id").references(() => employeesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
