FROM node:24-alpine

RUN corepack enable pnpm

WORKDIR /app

# Copy all source files
COPY . .

# Install all dependencies (including devDeps needed for build)
RUN pnpm install

# Build the Vite frontend
ENV PORT=3000
ENV BASE_PATH=/
ENV NODE_ENV=production

RUN pnpm --filter @workspace/ponto-app run build

# Build the API server
RUN pnpm --filter @workspace/api-server run build

EXPOSE 3000

# Runtime environment
ENV STATIC_FILES_PATH=/app/artifacts/ponto-app/dist/public

# Migrations run automatically on startup via migrateDb()
CMD ["node", "./artifacts/api-server/dist/index.mjs"]
