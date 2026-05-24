#!/bin/bash
# Quick local setup. Run from project root.
set -e

echo "==> Copying .env.example -> .env (if not present)"
[ -f .env ] || cp .env.example .env

echo "==> Installing backend dependencies"
cd backend && npm install
echo "==> Generating Prisma client"
npx prisma generate

echo "==> Installing frontend dependencies"
cd ../frontend && npm install

echo ""
echo "Setup complete."
echo ""
echo "Next steps:"
echo "  1. Edit .env with your real APIFY_TOKEN, ANTHROPIC_API_KEY, EVOLUTION_* values"
echo "  2. Start Postgres: docker compose up -d postgres"
echo "  3. Run migrations: cd backend && npx prisma migrate dev --name init"
echo "  4. Start backend: cd backend && npm run start:dev"
echo "  5. Start frontend: cd frontend && npm run dev"
echo ""
echo "For Apify webhooks during local dev, expose your backend with ngrok:"
echo "  ngrok http 3000"
echo "Then set PUBLIC_URL in .env to the ngrok HTTPS URL and restart backend."
