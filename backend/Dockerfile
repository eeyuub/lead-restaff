# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps (include dev for build)
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Copy source + build
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate && npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install prod deps only
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# Copy compiled output
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Run pending migrations then start. Falls back to db push if no migrations dir exists yet.
CMD ["sh", "-c", "(npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss) && node dist/main"]
