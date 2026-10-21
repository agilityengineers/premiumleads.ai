repo: agilityengineers/The-Authority-Desk
branch: main
related: agilityengineers/BrandVoiceInterview (main) — intake contract, locked option values

## Last sync
date: 2026-10-21T21:43:54Z

### Updated in this project
- Get Started intake form built on AD's prequalificationSchema (same system question ids, BVI-locked values) + door-specific sections
- Admin gains Pre-qualification form view, Leads panel (routing + AD/BVI sync badges) and CTA mode switch
- HANDOFF-intake.md documents the PL → AD → BVI relay so a lead is created once

## Sync history
- 2026-10-21T18:51:32Z — admin Landing pages panel mirrored from LandingPagesPanel/nav
- 2026-10-21T18:32:23Z — initial admin mock from variantSchema/settingsSchema

## Screen map
| Screen | Repo files |
|---|---|
| Premium Leads Get Started.dc.html | AD shared/prequalificationSchema.ts, shared/formSchema.ts; BVI shared/authority-desk.ts |
| Premium Leads Admin.dc.html | AD src/components/admin/LandingPagesPanel.tsx, nav.tsx, Admin.tsx, ContactsPanel/PreQualificationsPanel (Leads), server/ai.ts, shared/variantSchema.ts, shared/contactsSchema.ts |
| Premium Leads.dc.html | AD src/variants.ts, README.md |
| HANDOFF-intake.md | AD docs/integration-flows.md |
