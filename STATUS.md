# STATUS — premiumleads.ai build

_Updated as work lands. Every open item lives here, grouped by what blocks it._

## Done

- **Stack** mirrors The Authority Desk: Vite + React 18 + TypeScript client, Express 5 server, Postgres via Drizzle (schema in `server/schema.ts`, migrations in `drizzle/` applied at boot), zod 4, Tailwind, Vitest. One server on port 5000 (Vite middleware in dev, `dist/` in prod).
- **Copied from AD and adapted in wording only**: `shared/formSchema.ts` (verbatim), `shared/prequalificationSchema.ts` (PL labels; system question ids and the Brand Voice locked values untouched — tested), `shared/contactsSchema.ts`, `shared/variantSchema.ts` (PL content model), `shared/routingSchema.ts`, `server/ai.ts`.
- **content.js ported** to typed TS under `src/content/` (five variants with the StoryBrand layer, capability catalogue, content model + text serializers, default resources, form, door sections, routing rules).
- **Landing template** at `/` and `/<slug>` (`src/pages/Landing.tsx`): StoryBrand order as designed, Vimeo hero (`756896760`, admin-editable), section + capability toggles, CTA resolution by `ctaMode` (prequalify → `/get-started?variant=<slug>`; book-call → booking URL + simple contact form), testimonial attributions off and pricing off by default, variant pill bar shown only to a signed-in admin or with `?preview=1`, CTA click beacon, per-page `<title>`/description/canonical/og tags injected server-side, robots.txt + sitemap.xml.
- **/get-started** (`src/pages/GetStarted.tsx`): `PREQUAL_FORM` + `DOOR_SECTIONS[variant]` spliced as 02b, client validation with the same `validateAnswers` the server enforces, server routing (`routing` setting; defaults reproduce `routeSubmission`), prefilled SmartScheduler link `?name=&email=&external_id=pl:<id>`, nurture card with admin-editable copy, returning-email prefill (local submissions first, then a signed GET to The Authority Desk when configured).
- **Lead pipeline**: `prequalification_submissions` + `contacts` + `contact_events` (status derived, never stored); one signed `lead.created` to The Authority Desk via `integration_outbox` (HMAC-SHA256 over `timestamp.body`, retry 2/4/8… min capped at 6 h, parked on 400/404/409/422, `SKIP LOCKED` claims); AD's `{ contactId, intervieweeId, bookingUrl }` stamped on the submission; inbound `POST /api/integrations/authority-desk/events` (AD's own + fanned-out Brand Voice events, idempotent on `eventId`); `POST /api/integrations/smart-scheduler/webhook` → `call_booked` + `lead.updated` relay. **PL never calls the Brand Voice Interview.**
- **/resources** page + pipeline: `POST /api/admin/resources/fetch { url, id?, force? }` → URL normalization, SSRF guard (every redirect hop checked), HTML extraction, Playwright screenshot (1440×900 viewport, network idle, scaled to 900×620 PNG stored in Postgres, served at `/api/resources/<id>/snapshot`), AI blurb validated with zod (one retry, extracted-title fallback), draft row until "Save & publish".
- **Admin**: bcrypt users, HMAC cookie sessions invalidated by password change, forced password change on first login, roles enforced server-side per panel (super / admin / advisor-leads-only), seeded super admin `emailme@clarencewilliams.com` / `Success2026` (must change on first login), encrypted write-only integration secrets (AES-256-GCM, `SECRETS_KEY`), login throttling, same-origin guard on mutations, activity feed.
- **Seeds**: five variants (published), three resources, super admin. The default form, door sections and routing rules serve from the bundled defaults until an admin saves them (AD's floor-and-overlay rule), so content.js changes keep flowing until then.
- **Tests** (`npm test`, 27 passing): form validation + locked contract, routing parity with `routeSubmission`, signed webhook sender/verifier, SmartScheduler link/signature.

## TODO — needs you (answers slot into env vars or the Integrations panel)

- [ ] **Authority Desk events endpoint** `POST /api/integrations/premium-leads/events` does not exist in AD yet. PL sends the payload in `server/authorityDesk.ts` (`buildLeadCreated` / `buildLeadUpdated`) signed with `X-Timestamp` + `X-Signature` (hex HMAC-SHA256 over `timestamp.body`) and expects `{ contactId, intervieweeId, bookingUrl }` back. Also needed on AD: `GET /api/integrations/contacts?email=` (signed the same way over `timestamp.email=<email>`) for the returning-client prefill, and AD fanning its Brand Voice events out to `POST https://premiumleads.ai/api/integrations/authority-desk/events` with the same secret. Set the URL + shared secret under Admin → Integrations → The Authority Desk (or `AD_EVENTS_URL` / `AD_WEBHOOK_SECRET` / `AD_CONTACTS_URL`).
- [ ] **Replit secrets**: `DATABASE_URL` (Replit Postgres module), `SESSION_SECRET` (long random), `SECRETS_KEY` (32 bytes hex — `openssl rand -hex 32`), optional `PUBLIC_BASE_URL`. Without `SECRETS_KEY` in production the Integrations panel refuses to store secrets.
- [ ] **Playwright on Replit**: `.replit` adds the nix `chromium` package; set `PLAYWRIGHT_CHROMIUM_PATH` to its binary if the bundled download is unavailable (`server/snapshot.ts` tries the bundled build, `PLAYWRIGHT_CHROMIUM_PATH`, then common system paths).
- [ ] **API keys**: SendGrid, Anthropic, OpenAI — paste in Admin → Integrations (encrypted) or set `SENDGRID_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`. Until then AI generation reports "not configured" and emails are logged, not sent.
- [ ] **SmartScheduler**: confirm the Strategy Call link (`smart-scheduler.ai/fabp/booking/premiumleads-discovery`), add a webhook row pointing at `https://premiumleads.ai/api/integrations/smart-scheduler/webhook`, and paste its callback secret under Integrations → SmartScheduler. PL accepts `X-Signature` as HMAC-SHA256 over the raw body (or the timestamped form). **Until a secret is saved, unsigned webhooks are accepted with a logged warning** — set the secret before go-live.
- [ ] **Domain / analytics**: canonical defaults to `https://premiumleads.ai` (`PUBLIC_BASE_URL` overrides); GA4 / Meta / LinkedIn IDs go in Integrations → Analytics.
- [ ] **Returning-email prefill privacy**: the handoff asks to prefill phone too. PL prefills working style, budget, client type and company only — anyone who types an email could otherwise read that person's phone. Say the word and `localPrefillForEmail` + the lookup route can include it.
- [ ] **`?bvi=<uuid>` prefill by id** (HANDOFF §4): the uuid is forwarded to AD as `intervieweeId` on submit; prefilling the answers by id needs an AD lookup-by-id endpoint.
- [ ] **Terms of service / privacy policy URLs** are blank (footer links to `#`) until set in Call to action & settings.
- [ ] **Testimonial attributions** stay off until real quotes are approved (Sections → Testimonial attributions).

## TODO — build follow-ups

- [ ] Nurture email sequence: a single confirmation email is sent; the multi-step sequence toggle under SendGrid is stored but only the first message exists.
- [ ] Share-image generation runs best-effort after "Generate with AI" (needs OpenAI); the AD-style server-rendered text card fallback was not ported — pages without a generated image fall back to the site share image / logo.
- [ ] `/variants` index page (AD has one) — not in the PL design; skipped.
- [ ] Traffic panel shows all-time counts; windows (today / 7d / 30d) and referrers are recorded but not surfaced.
- [ ] Rate limiting is in-memory (fine on one autoscale instance at a time; consider Postgres-backed if instances multiply).

## Decisions worth knowing

- Variant rows store a **partial** content override; blank admin fields inherit the bundled copy (the prototype's `overrides` rule). Custom pages inherit from the sales copy.
- Routing's `packages` destination is kept in the vocabulary for parity with AD but resolves to `book` (PL shows no pricing).
- Statuses are derived (`deriveContactStatus`, identical to AD) so out-of-order partner events never leave a stale status.
