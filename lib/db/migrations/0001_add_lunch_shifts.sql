ALTER TABLE "attendance" ADD COLUMN "lunch_out" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "lunch_in" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "lunch_minutes" integer;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "expected_lunch_out" text NOT NULL DEFAULT '12:00';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "expected_lunch_in" text NOT NULL DEFAULT '13:00';
