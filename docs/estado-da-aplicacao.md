# Estado da Aplicação — PontoFácil

> Documento gerado em 12/04/2026. Descreve a arquitetura atual, schema de banco, APIs, autenticação e fluxo de UI.

---

## 1. Visão Geral

O **PontoFácil** é um sistema SaaS brasileiro de controle de ponto (time-tracking) para empregados. É um monorepo pnpm com:

- **Frontend**: React + Vite (`artifacts/ponto-app`)
- **Backend**: Express 5 (`artifacts/api-server`)
- **Banco de Dados**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Gerenciamento de dependências**: pnpm workspaces com catalog

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19, Vite 7.3.2, Tailwind CSS v4, Radix UI, Wouter (routing), TanStack Query, Recharts, date-fns |
| Backend | Express 5, esbuild (CJS bundle), pino (logging) |
| Banco | PostgreSQL, Drizzle ORM, Drizzle Kit (migrations) |
| Validação | Zod v4, drizzle-zod |
| Auth | express-session + connect-pg-simple (sessões no PostgreSQL), bcryptjs |
| API Spec | OpenAPI + Orval (codegen para hooks e schemas) |

---

## 3. Estrutura do Monorepo

```
artifacts/ponto-app      → React frontend (@workspace/ponto-app)
artifacts/api-server     → Express API (@workspace/api-server)
artifacts/mockup-sandbox → Canvas component preview
lib/db                   → Drizzle schema & migrations (@workspace/db)
lib/api-spec             → OpenAPI spec
lib/api-zod              → Zod schemas gerados
lib/api-client-react     → TanStack Query hooks gerados
```

---

## 4. Autenticação

### 4.1 Backend (Session-based)
- `express-session` com `connect-pg-simple` — sessões persistidas na tabela `user_sessions` do PostgreSQL
- Cookie: `pf_session`
- Senhas hash com `bcryptjs` (salt rounds: 10)
- Roles: `admin` | `employee`
- Seed automático de admin no startup via env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`)

### 4.2 Middlewares
- `requireAuth` → verifica `req.session.userId`
- `requireAdmin` → verifica `req.session.userRole === "admin"`

### 4.3 Frontend
- `AuthContext` (`contexts/AuthContext.tsx`) gerencia estado de login, logout, `isAdmin`
- `App.tsx` faz routing condicional:
  - Sem login → `LoginPage`
  - `employee` → `MeuPontoPage` (visão simplificada)
  - `admin` → `AppLayout` + todas as páginas

---

## 5. Schema do Banco de Dados

### 5.1 `users` (usersTable)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial PK | |
| email | text, unique | Login |
| password_hash | text | Hash bcrypt |
| name | text | Nome |
| role | text | `admin` ou `employee` |
| employee_id | integer FK → employees | Vínculo opcional |
| created_at | timestamp | |

### 5.2 `employees` (employeesTable)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial PK | |
| name | text | |
| email | text, unique | |
| department | text | |
| position | text | Cargo |
| expected_checkin | text | Horário entrada padrão (ex: "09:00") |
| expected_lunch_out | text | Saída almoço padrão (ex: "12:00") |
| expected_lunch_in | text | Retorno almoço padrão (ex: "13:00") |
| expected_checkout | text | Saída padrão (ex: "18:00") |
| status | text | `active` / `inactive` |
| created_at | timestamp | |

### 5.3 `attendance` (attendanceTable)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | serial PK | |
| employee_id | integer FK → employees | |
| date | date (string) | YYYY-MM-DD |
| clock_in | timestamp | Entrada |
| lunch_out | timestamp | Saída almoço |
| lunch_in | timestamp | Retorno almoço |
| clock_out | timestamp | Saída |
| lunch_minutes | integer | Duração almoço |
| total_minutes | integer | Total trabalhado |
| status | text | `open` / `closed` |
| notes | text | Observações |
| late_minutes | integer | Minutos de atraso (BRT) |
| overtime_minutes | integer | Minutos extras na saída |
| created_at | timestamp | |

---

## 6. Rotas da API

### 6.1 Auth (público)
- `POST /api/auth/login` → login com email/senha
- `POST /api/auth/logout` → destrói sessão
- `GET /api/auth/me` → retorna usuário logado + dados do employee (se role=employee)

### 6.2 Funcionários (protegido)
- `GET /api/employees` → lista com filtros (search, department, status)
- `POST /api/employees` → cria funcionário
- `GET /api/employees/:id` → detalhes
- `PUT /api/employees/:id` → atualiza
- `DELETE /api/employees/:id` → remove

### 6.3 Registros de Ponto (protegido)
- `POST /api/attendance/clockin` → entrada
- `POST /api/attendance/lunch-out` → saída almoço
- `POST /api/attendance/lunch-in` → retorno almoço
- `POST /api/attendance/clockout` → saída + cálculo total/overtime
- `GET /api/attendance` → lista com filtros
- `POST /api/attendance` → criação manual
- `GET/PUT/DELETE /api/attendance/:id` → CRUD individual

### 6.4 Relatórios (protegido)
- `GET /api/reports/dashboard` → estatísticas do dia/semana/mês
- `GET /api/reports/department-summary` → presença por departamento
- `GET /api/reports/recent-activity` → atividade recente
- `GET /api/reports/late-arrivals` → atrasos do dia
- `GET /api/reports/employee/:id/hours` → relatório mensal de horas por funcionário

### 6.5 Usuários (admin only)
- `GET /api/users` → lista usuários
- `POST /api/users` → cria usuário
- `DELETE /api/users/:id` → remove usuário

---

## 7. Timezone

Todas as comparações de horário usam **BRT (UTC-3)**. A função `getBRTMinutes()` converte timestamps UTC para minutos do dia no fuso brasileiro antes de comparar com `expectedCheckin`/`expectedCheckout`.

---

## 8. Páginas da UI

| Rota | Descrição | Acesso |
|------|-----------|--------|
| `/` | Dashboard (stats, gráficos, atividade) | admin |
| `/employees` | Lista de funcionários com busca/filtro | admin |
| `/employees/new` | Criar funcionário | admin |
| `/employees/:id` | Detalhe do funcionário | admin |
| `/employees/:id/edit` | Editar funcionário | admin |
| `/attendance` | Registros de ponto com filtros | admin |
| `/reports` | Relatórios (departamentos, horas) | admin |
| `/users` | Gerenciar usuários do sistema | admin |
| `/login` | Tela de login | público |
| `/meu-ponto` | Visão simplificada para funcionário | employee |

---

## 9. Componentes Reutilizáveis

- `RegistrarPontoModal` — modal para registrar entrada/saída (usado no header)
- `AppLayout` — layout com sidebar e header
- `Sidebar` — navegação lateral
- Hooks do TanStack Query gerados via Orval em `lib/api-client-react`

---

## 10. Seeded Data

- 8 funcionários cadastrados
- 95+ registros históricos de ponto (últimos 3 meses)
- Registros do dia para 6 funcionários
- Todos os `lateMinutes` armazenados no DB já são BRT-correct

---

## 11. Comandos Úteis

```bash
# Typecheck completo
pnpm run typecheck

# Gerar migration após alteração de schema
pnpm --filter @workspace/db run generate

# Aplicar schema no banco (dev)
pnpm --filter @workspace/db run push

# Regenerar hooks Zod da OpenAPI
pnpm --filter @workspace/api-spec run codegen

# Rodar API server localmente
pnpm --filter @workspace/api-server run dev
```

---

## 12. Estado Atual das Features (pré-implementação)

| Feature | Status |
|---------|--------|
| Autenticação & Roles (admin/employee) | ✅ Implementado |
| CRUD Funcionários | ✅ Implementado |
| Registro de Ponto (entrada/saída/almoço) | ✅ Implementado |
| Dashboard com estatísticas | ✅ Implementado |
| Relatórios (horas, departamentos, atrasos) | ✅ Implementado |
| CRUD Usuários do sistema | ✅ Implementado |
| Troca de senha por admin | ❌ Não implementado |
| Níveis hierárquicos de permissões (manager) | ❌ Não implementado |
| Integração com geolocalização | ❌ Não implementado |
| Cálculo de folha de pagamento | ❌ Não implementado |
| Banco de horas | ❌ Não implementado |
| Relatório detalhado de atrasos | ❌ Parcial (apenas atrasos do dia) |
