/** Capability catalogue — `CAPS` from the design package's content.js. */
export type Capability = {
  key: string;
  group: "Engage" | "Identify" | "Integrate";
  glyph: string;
  /** CSS background for the 42px tile (a color or a gradient). */
  bg: string;
  title: string;
  body: string;
};

export const CAPS: Capability[] = [
  { key: "aiEmployee", group: "Engage", glyph: "AI", bg: "linear-gradient(135deg,#1E88E5,#0C2E63)", title: "AI Employee", body: "An autonomous teammate that prospects, writes and follows up around the clock — paced to look human." },
  { key: "linkedin", group: "Engage", glyph: "in", bg: "#0C2E63", title: "LinkedIn Outreach", body: "Connect, message and nurture unlimited prospects. Compatible with every version of LinkedIn." },
  { key: "email", group: "Engage", glyph: "@", bg: "#1E88E5", title: "Email Sequences", body: "Multi-step cadences with perfectly timed follow-ups, open and click tracking." },
  { key: "dialer", group: "Engage", glyph: "☎", bg: "#0D1B2E", title: "Dialer", body: "Click-to-call with notes and dispositions synced to your CRM. Close more deals by phone." },
  { key: "voicemail", group: "Engage", glyph: "VM", bg: "#00B2EF", title: "Voicemail Drops", body: "Pre-recorded, personalized voice messages delivered without a ring." },
  { key: "enrichment", group: "Identify", glyph: "DB", bg: "#0C2E63", title: "Data Enrichment", body: "Verified emails and direct dials from LinkedIn, ZoomInfo, Crunchbase and your favorite sources." },
  { key: "chrome", group: "Identify", glyph: "CX", bg: "#1E88E5", title: "Chrome Extension", body: "Enrich and enroll prospects from any profile page without leaving the browser." },
  { key: "video", group: "Engage", glyph: "▶", bg: "#00B2EF", title: "Video Messaging", body: "Record once, personalize at scale — dynamic video that earns replies." },
  { key: "mobile", group: "Engage", glyph: "📱", bg: "#0D1B2E", title: "Mobile App", body: "Run campaigns, take calls and reply on the move. Your outreach stays on track anywhere." },
  { key: "crm", group: "Integrate", glyph: "⇄", bg: "linear-gradient(135deg,#00B2EF,#1E88E5)", title: "CRM Integrations", body: "Two-way sync with Salesforce, HubSpot, Pipedrive, Calendly and HighLevel." },
];

export const CAP_BY_KEY: Record<string, Capability> = Object.fromEntries(CAPS.map((c) => [c.key, c]));
