# Build context: repo root (Coolify default).
# In Coolify: Dockerfile Location = /backend/Dockerfile, Base Directory = /

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci

COPY backend/tsconfig.json backend/nest-cli.json ./
COPY backend/src ./src
RUN npx prisma generate && npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Run pending migrations then start. Falls back to db push if no migrations dir exists yet.
CMD ["sh", "-c", "(npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss) && node dist/main"]
