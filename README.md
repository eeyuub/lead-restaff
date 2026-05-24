# Restaff Leads

Internal lead-gen tool for Restaff. Scrapes Moroccan restaurants/cafés/hotels from
Google Maps via Apify, enriches with contacts, generates personalized WhatsApp
messages with Claude, and tracks outreach.

## Stack
- **Backend:** NestJS + Prisma + PostgreSQL
- **Frontend:** React + Vite + Tailwind + TanStack Query
- **Scraping:** Apify (`lukaskrivka/google-maps-with-contact-details`) — async via webhook
- **WhatsApp:** [@wiicode/wiisender](https://www.npmjs.com/package/@wiicode/wiisender) (WiiSender server, wraps Evolution API)
- **AI:** OpenAI API (`gpt-4o-mini`) for personalized outreach messages
- **Deploy:** Coolify (Docker Compose)

## Project structure
```
.
├── backend/         # NestJS API
├── frontend/        # React SPA
├── docker-compose.yml
├── .env.example
└── README.md
```

## Quick start (local)

```bash
# 1. Copy env file
cp .env.example .env
# Edit .env with your secrets

# 2. Install + run backend
cd backend
npm install
npx prisma migrate dev
npm run start:dev

# 3. Install + run frontend (new terminal)
cd frontend
npm install
npm run dev
```

Backend: http://localhost:3000
Frontend: http://localhost:5173

## Deploy to Coolify

Push to GitHub, create new resource in Coolify, point at the repo, use
`docker-compose.yml`. Set environment variables in Coolify UI.

For Apify webhooks to reach you, your Coolify domain must be public HTTPS.

## How it works

1. **Launch a scrape:** pick cities + categories + leads per zone → backend
   creates a `ScrapeJob` and starts an Apify run (async). Apify will POST
   results to `/apify/webhook` when done.
2. **Ingest:** webhook handler fetches the dataset, deduplicates by `placeId`,
   inserts into `leads` table with computed priority score.
3. **Browse leads:** filter by city, category, priority, status. See full
   contact info, social links, address, rating.
4. **Generate message:** click a lead → "Generate WhatsApp message" → Claude
   generates a French/Darija message tailored to that business.
5. **Send via WhatsApp:** one click → WiiSender (`@wiicode/wiisender`) sends the message →
   status updates to `sent`. Track responses manually.

## Extending

- Add a new scraping source: implement `LeadSource` interface in `apify/`.
  Then bind it in `LeadSourceModule`.
- Add new outreach channel: implement `OutreachChannel` interface.
- Add new lead categories: edit `CITY_ZONES` in `config/zones.ts`.
