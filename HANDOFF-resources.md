# Resources feature — implementation notes for Claude Code

The design files (`Premium Leads Resources.dc.html`, the Resources section in `Premium Leads.dc.html`, and the Resources tab in `Premium Leads Admin.dc.html`) are visual/behavioral specs. The prototype fakes two things the real app must do server-side when an admin pastes a URL:

## 1. Snapshot the page
- Endpoint: `POST /api/admin/resources/fetch { url }`.
- Normalize the URL (add https:// if missing, follow redirects, reject non-http and private/loopback hosts).
- Render a screenshot with headless Chromium (Playwright/Puppeteer): viewport 1440×900, wait for network idle, capture the top of the page, resize to ~900×620, store as PNG/WebP (object storage or a `resource_snapshot` blob column like the repo's `og_image`), serve at `/api/resources/<id>/snapshot`.
- Expose "Re-snapshot" (the admin button) as the same route with `force: true`.
- Fallback when the snapshot fails: the branded gradient with the resource's initials (already in the design).

## 2. Read the page and write the blurb with AI
- Fetch the HTML server-side; extract: `<title>`, meta description, og:title / og:description / og:image, h1, first ~1,500 words of visible body text (strip nav/footer/scripts).
- Call the configured provider (reuse `server/ai.ts` from The-Authority-Desk: Anthropic default, OpenAI optional, JSON-only, validated with zod, retry once).
- System prompt (adapt wording, keep the contract):

  > You write short, concrete product blurbs for a "Resources" page on premiumleads.ai. Premium Leads is a multi-channel lead-generation platform. You will receive extracted text from a partner application's website. Describe what that application does and how it complements Premium Leads for a client. Confident, professional, no hype, no invented features or pricing. Return ONLY JSON with keys: name (string), category (2–3 words), tagline (≤ 90 chars), description (2–3 sentences, ≤ 320 chars), highlights (array of exactly 3 short strings, ≤ 60 chars each).

- User prompt: the URL, the extracted fields, and any operator notes.
- Validate with a zod schema matching the resource record below; on validation failure retry once, then return the extracted title/description as a plain draft so the admin can still save.

## Resource record (matches the prototype's `cfg.resources`)
```ts
{
  id: string;            // slug
  name: string;
  url: string;
  category: string;
  tagline: string;
  description: string;
  highlights: string[];  // 3 items
  snapshot: string | null; // served URL
  featured: boolean;     // show in the landing-page Resources section (first 3 featured)
  order: number;
}
```

## Rendering rules (from the design)
- /resources: one full-width card per resource, snapshot alternating left/right (odd rows image left, even rows image right). Cards stack to one column under ~800px.
- Landing pages: section between Use cases and FAQ shows up to three `featured` resources + "All resources →"; hidden when the admin turns the `resources` section off.
- No URL → gradient placeholder, no host badge, no Visit button.
- Admin: paste URL → fetch (snapshot + AI blurb) → editable fields → Save & publish. Reorder, remove, re-snapshot, toggle featured.
