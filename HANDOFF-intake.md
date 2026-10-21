# Intake & cross-app integration — notes for Claude Code

Premium Leads (PL) gets the same pre-qualification intake as The Authority Desk (AD), and every lead must show up in **both** the PL admin and the AD dashboard, with a Brand Voice Interview (BVI) card created once — never twice.

Design files: `Premium Leads Get Started.dc.html` (the form), `content.js` (PREQUAL_FORM, DOOR_SECTIONS, routeSubmission), Admin → "Pre-qualification form" and "Leads" tabs.

## 1. Reuse, don't re-invent
Copy these from `agilityengineers/The-Authority-Desk` verbatim and share them (publish as a small package or git submodule so the three apps can't drift):
- `shared/formSchema.ts` — generic admin-editable form definitions + `buildAnswersSchema` / `validateAnswers`.
- `shared/prequalificationSchema.ts` — the SYSTEM question ids and the BVI-locked option values. PL changes **labels only**; `SERVICE_PREFERENCE_VALUES` and `MARKETING_BUDGET_VALUES` stay byte-identical.
- `shared/contactsSchema.ts` — status vocabulary (`lead → qualified → call_booked → paid → …`, side states `nurture`, `refunded`).
- `server/prequalification.ts`, `server/brandVoice.ts`, `server/contacts.ts`, `server/brandVoiceEvents.ts` — the submit handler, signed handover, contacts upsert and inbound event endpoint.
- Admin: `FormBuilder.tsx`, `PrequalFormPanel`, `ContactsPanel.tsx`, `RoutingPanel.tsx`.

PL's default form definition is `PREQUAL_FORM` in `content.js` (same shape as AD's `DEFAULT_PREQUAL_FORM`; PL wording; PL `clientType` options). The door section (`DOOR_SECTIONS[variantSlug]`) is spliced in as section 2b at render time — store door answers as ordinary answer keys.

## 2. The one rule that prevents duplicates
**Email, lowercased and trimmed, is the human key everywhere. The BVI interviewee UUID is the machine key once it exists.** Every system stores the other's key.

Who creates what:
- PL stores the submission (`prequalification_submissions`, source `pl_form`, `variantSlug` = the door, `external_ref` = `pl:<id>`).
- PL POSTs **one** signed `lead.created` to AD's inbound endpoint (`POST /api/integrations/premium-leads/events` — add it next to `/api/integrations/brand-voice/events`, same HMAC-SHA256 over `timestamp.body`, same outbox/retry). AD upserts the contact by email (source `pl_form`) and **AD relays to BVI** through its existing `/api/integrations/authority-desk/onboarding` handover, passing `intervieweeId` if the contact already has one.
- PL never talks to BVI directly. One relay path = one card. BVI's `externalRefFor` idempotency and AD's per-email advisory lock already guard replays.
- AD's response carries `{ contactId, intervieweeId, bookingUrl }`; PL stores both ids on the submission (shown in the Leads tab).
- BVI → AD events (`stage.changed`, `payment.received`, `interview.*`, `blueprint.delivered`) already exist; AD fans them out to PL on the same outbox so PL's Leads tab shows the same status. Keep statuses **derived** (`deriveContactStatus`), never stored.

## 3. Routing → next step
`routeSubmission(answers)` returns `book` or `nurture` (PL shows no pricing, so `packages` is unused but kept in the vocabulary). Make the rules admin-editable with AD's `RoutingPanel`.
- `book` → SmartScheduler link prefilled: `?name=&email=&external_id=pl:<submissionId>`. Subscribe PL (not BVI) to that link's `appointment.created` webhook → status `call_booked`, relayed to AD as `lead.updated`. Same ownership rule as AD: a pre-sale call never moves a BVI card.
- `nurture` → stay-in-touch page; card tagged `adRouting = nurture`.

## 4. Returning-client shortcut (no double-asking)
On the contact step, PL asks AD `GET /api/integrations/contacts?email=` (signed). If the person exists (from AD's form or a BVI card), PL prefills `servicePreference`, `marketingBudget`, `clientType`, `company`, `phone` and shows "confirm or update" instead of asking fresh; `?bvi=<uuid>` on the form URL does the same by id. The prototype fakes this with a local lookup.

## 5. CTA mode
Admin setting `ctaMode`: `prequalify` (default — all primary CTAs → `/get-started?variant=<slug>`) or `book-call` (→ booking URL, simple contact form shown). Mirrors AD's `funnelSchema` ctaMode; resolve per variant with site default, like `resolveVariant`.

## 6. Field reference (what PL collects)
System (fixed): fullName, email, phone, company, clientType, servicePreference*, marketingBudget*  (*locked values)
Default extras: roleTitle, website, expertise, goals[], readiness, anythingElse
Door sections: sales → teamSize, channelsToday[], crm · recruiting → rolesPerQuarter, hiringModel[], ats · agency → clientCount, offerType[], whiteLabel · founders → businessStage, dealSize · enterprise → repCount, crm, requirements[]
Attribution (never asked): variantSlug, source=`pl_form`, orderRef
