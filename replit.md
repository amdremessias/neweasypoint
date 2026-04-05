# PontoFácil — Controle de Ponto

## Overview

Brazilian employee time-tracking SaaS built as a pnpm workspace monorepo. Full-stack React + Vite frontend with Express 5 backend, PostgreSQL + Drizzle ORM.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (`artifacts/ponto-app`), Wouter routing, TanStack Query, Recharts, Radix UI, Tailwind
- **Backend**: Express 5 (`artifacts/api-server`), esbuild (CJS bundle)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod, `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)

## Project Structure

- `artifacts/ponto-app` — React frontend (@workspace/ponto-app)
- `artifacts/api-server` — Express API server (@workspace/api-server)
- `lib/db` — Drizzle ORM schema & client (@workspace/db)
- `lib/api-spec` — OpenAPI spec (@workspace/api-spec)
- `lib/api-zod` — Generated Zod schemas (@workspace/api-zod)
- `lib/api-client-react` — Generated TanStack Query hooks (@workspace/api-client-react)

## DB Schema

- `employeesTable` — employees (id, name, email, cpf, department, position, status, expectedCheckin, expectedCheckout, phone, hireDate)
- `attendanceTable` — attendance records (id, employeeId, date, clockIn, clockOut, totalMinutes, status, lateMinutes, overtimeMinutes, notes)

## API Routes

- `GET/POST /api/employees` — list, create employees
- `GET/PUT/DELETE /api/employees/:id` — get, update, delete employee
- `POST /api/attendance/clockin` — clock in an employee
- `POST /api/attendance/clockout` — clock out an employee
- `GET/POST /api/attendance` — list, create attendance records
- `GET/PUT/DELETE /api/attendance/:id` — get, update, delete attendance record
- `GET /api/reports/dashboard` — dashboard stats
- `GET /api/reports/department-summary` — department presence summary
- `GET /api/reports/recent-activity` — recent clock-in/out activity
- `GET /api/reports/late-arrivals` — late arrival stats
- `GET /api/reports/employee/:id/hours` — employee hours report

## Timezone Handling

All time comparisons use **BRT (UTC-3)**. The `getBRTMinutes()` helper converts UTC timestamps to Brazilian local time before comparing against expected check-in/check-out times. Always use UTC-3 offset for time calculations.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Seeded Data

8 employees seeded, 95+ historical attendance records (last 3 months), plus today's records for 6 employees. All lateMinutes stored in DB are BRT-correct.

## UI Pages

- `/` → Dashboard (stats cards, department chart, recent activity)
- `/employees` → Funcionários list with search/filter
- `/employees/new` → Create employee form
- `/employees/:id` → Employee detail
- `/employees/:id/edit` → Edit employee form
- `/attendance` → Registros de Ponto list with filters
- `/reports` → Relatórios (department presence, employee hours report)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
