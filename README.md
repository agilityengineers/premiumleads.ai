# Premium Leads — premiumleads.ai

Production website for Premium Leads: the audience landing-page template, the Get started intake, the Resources page and the admin. Built from the design package in this repo (`*.dc.html`, `content.js`, `HANDOFF-*.md`) and mirroring [The Authority Desk](https://github.com/agilityengineers/The-Authority-Desk)'s stack so the apps share patterns.

## Stack

Vite + React 18 + TypeScript · Express 5 · Postgres (Drizzle schema + migrations, raw SQL where the lead pipeline needs locks) · zod 4 · Tailwind · Vitest · Playwright (resource snapshots) · Anthropic / OpenAI SDKs · SendGrid.

One server on port 5000: Vite in middleware mode in development, the built `dist/` in production. Per-page SEO/social meta and analytics tags are injected into `index.html` at request time.

## Run locally

```bash
npm install
cp .env.local.example .env   # then export its values, or use a dotenv runner
npm run dev                  # http://localhost:5000
npm test                     # vitest
npm run check                # typecheck client + server
```

Needs a Postgres `DATABASE_URL`. Migrations in `drizzle/` run at boot; the five pages, three resources and the super admin are seeded on an empty database.

## Replit

`.replit` runs `npm run dev` on port 5000 and deploys with `npm run build` / `npm run start`. Secrets to set: `DATABASE_URL` (Postgres module), `SESSION_SECRET`, `SECRETS_KEY` (`openssl rand -hex 32`), optionally `PUBLIC_BASE_URL`. API keys and partner secrets can go in Admin → Integrations (stored encrypted) or as env vars (`SENDGRID_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `AD_EVENTS_URL`, `AD_WEBHOOK_SECRET`, `AD_CONTACTS_URL`, `SMART_SCHEDULER_WEBHOOK_SECRET`). If Playwright's bundled Chromium is unavailable, set `PLAYWRIGHT_CHROMIUM_PATH` to the nix `chromium` binary.

## Admin

`/admin` — first login `emailme@clarencewilliams.com` / `Success2026`, which must be changed immediately. Roles: super admin (everything), admin (pages, resources, settings, leads), advisor (leads only).

## Layout

- `shared/` — zod schemas shared by client and server (form, pre-qualification contract, routing, contacts, variants, settings, users).
- `src/content/` — the typed port of `content.js`.
- `src/pages/` — Landing, GetStarted, Resources, Admin; `src/components/` — sections and admin panels.
- `server/` — Express entry, routes, Drizzle schema, settings, auth, variants, prequalification, contacts, The Authority Desk relay (`authorityDesk.ts`, outbox worker), inbound partner events, SmartScheduler webhook, resources (extract + snapshot), AI, email, traffic.
- `tests/` — Vitest suites.
- `STATUS.md` — every open TODO and the questions still waiting on an answer.

## Integration contract (PL → The Authority Desk → Brand Voice Interview)

Premium Leads never calls the Brand Voice Interview. Each submission sends one signed `lead.created` to The Authority Desk (`X-Timestamp`, `X-Signature` = hex HMAC-SHA256 over `timestamp.body`), keyed `externalRef: "pl:<submissionId>"` with the email lowercased; AD upserts the contact, relays to BVI and answers `{ contactId, intervieweeId, bookingUrl }`. A booked strategy call arrives from SmartScheduler and is relayed as `lead.updated`. AD reports back (its own and BVI's events) to `POST /api/integrations/authority-desk/events`. Details: `HANDOFF-intake.md`, `server/authorityDesk.ts`, `server/partnerEvents.ts`.
