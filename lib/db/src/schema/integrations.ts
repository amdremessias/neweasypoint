import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const integrationsTable = pgTable("integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "geolocation", "calendar", "api"
  config: text("config").default("{}"), // JSON config object
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const locationSettingsTable = pgTable("location_settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Local Principal"),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  radiusMeters: integer("radius_meters").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Integration = typeof integrationsTable.$inferSelect;
export type InsertIntegration = typeof integrationsTable.$inferInsert;
export type LocationSetting = typeof locationSettingsTable.$inferSelect;
export type InsertLocationSetting = typeof locationSettingsTable.$inferInsert;
