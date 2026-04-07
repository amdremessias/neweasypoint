# PontoFácil — Controle de Ponto

Sistema de controle de ponto para funcionários, desenvolvido em React + Express + PostgreSQL.

---

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/) — **forma mais fácil**
- **ou** Node.js 24 + pnpm 10 + PostgreSQL 16 (setup manual)

---

## Instalação rápida com Docker (recomendado)

### 1. Clone o repositório

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd SEU_REPOSITORIO
```

### 2. Configure as credenciais

Edite o arquivo `docker-compose.yml` e preencha os campos do serviço `app`:

```yaml
ADMIN_EMAIL: admin@suaempresa.com      # e-mail do administrador inicial
ADMIN_PASSWORD: sua-senha-segura       # senha do administrador inicial
ADMIN_NAME: Administrador              # nome do administrador
SESSION_SECRET: um-valor-longo-e-secreto  # segredo para assinar sessões
```

> **Importante:** Altere `SESSION_SECRET` para um valor aleatório longo antes de rodar em produção.

### 3. Suba o ambiente

```bash
docker compose up --build
```

### 4. Acesse o sistema

Abra [http://localhost:3000](http://localhost:3000) no navegador e faça login com as credenciais configuradas.

---

## Instalação manual (sem Docker)

### Pré-requisitos

- Node.js 24
- pnpm 10 (`npm install -g pnpm`)
- PostgreSQL 16 rodando localmente

### 1. Clone e instale as dependências

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd SEU_REPOSITORIO
pnpm install
```

### 2. Crie o arquivo `.env` no servidor

Crie `artifacts/api-server/.env`:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/pontofacil
SESSION_SECRET=um-valor-longo-e-secreto
ADMIN_EMAIL=admin@suaempresa.com
ADMIN_PASSWORD=sua-senha-segura
ADMIN_NAME=Administrador
PORT=3000
NODE_ENV=development
```

### 3. Aplique o schema do banco de dados

```bash
pnpm --filter @workspace/db run push
```

### 4. Rode o projeto em modo desenvolvimento

Em terminais separados:

```bash
# Terminal 1 — API
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
pnpm --filter @workspace/ponto-app run dev
```

O frontend estará disponível em [http://localhost:5173](http://localhost:5173) e a API em [http://localhost:3000](http://localhost:3000).

---

## Variáveis de ambiente

| Variável | Descrição | Obrigatório |
|---|---|---|
| `DATABASE_URL` | String de conexão com o PostgreSQL | Sim |
| `SESSION_SECRET` | Segredo para assinar sessões (use valor longo e aleatório) | Sim |
| `ADMIN_EMAIL` | E-mail do administrador criado na primeira execução | Não (padrão: `admin@pontofacil.com`) |
| `ADMIN_PASSWORD` | Senha do administrador | Não (gerada automaticamente se omitida) |
| `ADMIN_NAME` | Nome do administrador | Não (padrão: `Administrador`) |
| `PORT` | Porta do servidor | Não (padrão: `3000`) |
| `NODE_ENV` | `development` ou `production` | Não |

---

## Comandos úteis

```bash
pnpm run typecheck              # verifica tipos em todos os pacotes
pnpm run build                 # build completo (frontend + API)
pnpm --filter @workspace/db run push   # aplica schema no banco de dados
```

---

## Stack

- **Frontend:** React + Vite, Tailwind CSS, Radix UI, TanStack Query, Recharts
- **Backend:** Express 5, Drizzle ORM, Zod
- **Banco de dados:** PostgreSQL 16
- **Monorepo:** pnpm workspaces
- **Build:** esbuild (API), Vite (frontend)
- **Autenticação:** Sessões com express-session + bcryptjs

---

## Páginas disponíveis

| Rota | Descrição |
|---|---|
| `/` | Dashboard com estatísticas e gráficos |
| `/employees` | Lista de funcionários |
| `/employees/new` | Cadastrar funcionário |
| `/employees/:id` | Detalhes do funcionário |
| `/attendance` | Registros de ponto |
| `/reports` | Relatórios por departamento e funcionário |
