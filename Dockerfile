# ===== Stage 1: Build frontend =====
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN bun run build

# ===== Stage 2: Runtime =====
FROM oven/bun:1.1-alpine AS runtime

WORKDIR /app

# Copy only what's needed for runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/sql ./sql
COPY --from=builder /app/tsconfig.json ./

EXPOSE 7070

CMD ["bun", "run", "start"]
