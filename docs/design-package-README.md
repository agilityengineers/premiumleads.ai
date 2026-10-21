# Premium Leads — website redesign (design package)

Open `Premium Leads.dc.html` in a browser. Everything is static HTML + `content.js`; admin state lives in the browser (localStorage) for the prototype.

## Pages
- **Premium Leads.dc.html** — landing page template. Five audience variants (sales, recruiting, agency, founders, enterprise) via `?variant=` or the bottom pill bar. StoryBrand structure: hero → problem → guide → plan → capabilities → stakes & success → proof → use cases → integrations → resources → FAQ → CTA.
- **Premium Leads Get Started.dc.html** — pre-qualification intake (`?variant=` = the door). Same system questions / locked values as The Authority Desk. Routes to booking or nurture.
- **Premium Leads Resources.dc.html** — complementary tools (Authority Desk, Brand Voice Interview, Insta Newsletter) with live snapshots.
- **Premium Leads Admin.dc.html** — admin. Sign in: emailme@clarencewilliams.com / Success2026 (prototype only — hash + move server-side).

## Data
- **content.js** — per-audience content model (VARIANTS), capability catalogue (CAPS), CONTENT_MODEL field list, PREQUAL_FORM + DOOR_SECTIONS, DEFAULT_RESOURCES, routing.
- Admin writes `pl-site-config`, `pl-submissions`, `pl-users`, `pl-activity`, `pl-cta-clicks` to localStorage; public pages read `pl-site-config`.

## Handoff notes for Claude Code
- **HANDOFF-intake.md** — share AD's form/prequalification/contacts schemas; one relay PL → AD → BVI keyed on lowercased email + BVI UUID; CTA mode; returning-client shortcut.
- **HANDOFF-resources.md** — URL → screenshot + AI blurb pipeline.
- **github.md** — which repo files each screen was built from.

## Admin defaults worth knowing
- Testimonial attributions are **off** (Sections → Testimonial attributions) until real quotes are approved.
- Pricing section is **off**; pricing lives in app.premiumleads.ai.
- CTA mode is **Pre-qualify, then book**.
