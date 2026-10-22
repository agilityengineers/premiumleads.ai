/**
 * Admin-editable site settings other than the form and routing: the funnel
 * defaults (CTA mode, booking URL, hero video), SEO/legal fields, section and
 * capability toggles, the pricing tiers and the non-secret integration fields.
 * Mirrors the prototype's `pl-site-config` document, split into one JSONB row
 * per key so a save touches only what changed.
 */
import { z } from "zod";
import { ctaModeSchema } from "./ctaMode";
import { DEFAULT_SITE_SETTINGS as SITE } from "./siteDefaults";

// The defaults and toggle helpers live in siteDefaults.ts (zod-free, so the
// public bundle can use them) and are re-exported here for everyone else.
export {
  DEFAULT_SITE_SETTINGS, SECTION_DEFS, SECTION_KEYS, DEFAULT_SECTIONS, sectionOn,
  CAPABILITY_KEYS, DEFAULT_CAPABILITIES, capabilityOn,
} from "./siteDefaults";
export type { SiteSettings, SectionsSettings, CapabilitiesSettings, SectionKey, CapabilityKey } from "./siteDefaults";
import type { SiteSettings, SectionsSettings, CapabilitiesSettings } from "./siteDefaults";

const url = z.string().trim().max(500);
const text = z.string().trim().max(300);

/* ------------------------------------------------------------------ site -- */

export const siteSettingsSchema = z.object({
  /** The slug served at "/" ("Make home" in the admin). */
  defaultVariant: z.string().trim().max(80).default(SITE.defaultVariant),
  ctaMode: ctaModeSchema.default(SITE.ctaMode),
  bookingUrl: url.default(SITE.bookingUrl),
  vimeoId: z.string().trim().max(40).default(SITE.vimeoId),
  loginUrl: url.default(SITE.loginUrl),
  contactEmail: z.string().trim().max(320).default(SITE.contactEmail),
  siteTitle: text.default(SITE.siteTitle),
  ogImage: url.default(SITE.ogImage),
  termsUrl: url.default(SITE.termsUrl),
  privacyUrl: url.default(SITE.privacyUrl),
  footerNote: text.default(SITE.footerNote),
  footerNoteLinkUrl: url.default(SITE.footerNoteLinkUrl),
  footerNoteLinkText: text.default(SITE.footerNoteLinkText),
});
/** Compile-time proof that the schema's output and the plain SiteSettings type are interchangeable. */
type SiteSettingsParsed = z.infer<typeof siteSettingsSchema>;
export const SITE_SETTINGS_TYPES_AGREE: [SiteSettingsParsed extends SiteSettings ? true : never, SiteSettings extends SiteSettingsParsed ? true : never] = [true, true];

/* -------------------------------------------------------------- sections -- */

export const sectionsSettingsSchema: z.ZodType<SectionsSettings> = z.record(z.string().max(40), z.boolean());

/* ---------------------------------------------------------- capabilities -- */

/** key → shown? Missing keys are on. */
export const capabilitiesSettingsSchema: z.ZodType<CapabilitiesSettings> = z.record(z.string().max(40), z.boolean());

/* ---------------------------------------------------------------- pricing -- */

export const tierSchema = z.object({
  name: text.default(""),
  price: text.default(""),
  /** One feature per line. */
  features: z.string().max(2000).default(""),
});

export const pricingSettingsSchema = z.object({
  tiers: z.array(tierSchema).max(6),
});
export type PricingSettings = z.infer<typeof pricingSettingsSchema>;

export const DEFAULT_PRICING: PricingSettings = {
  tiers: [
    { name: "Starter", price: "Contact for pricing", features: "LinkedIn + email sequences\nData enrichment\n1 user" },
    { name: "Growth", price: "Contact for pricing", features: "All channels incl. dialer & video\nCRM integrations\nUp to 10 users" },
    { name: "Scale", price: "Custom", features: "AI Employee\nWhite-label & multi-workspace\nUnlimited users" },
  ],
};

/* ----------------------------------------------------------- integrations -- */

/**
 * The integrations panel. Secrets are never part of this document: they are
 * written to the encrypted `integration_secrets` store and only ever read back
 * as "set / not set". Everything else (URLs, from-addresses, toggles, IDs)
 * lives here in plain JSON.
 */
export type IntegrationFieldDef = {
  key: string;
  label: string;
  type: "text" | "email" | "url" | "password";
  placeholder: string;
  /** The server env var that acts as the fallback when nothing is saved. */
  env?: string;
  /** Shown but never editable (derived from the deployment). */
  readOnly?: boolean;
};

export type IntegrationDef = {
  key: string;
  name: string;
  desc: string;
  fields: IntegrationFieldDef[];
  toggles?: { key: string; label: string }[];
};

export const INTEGRATION_DEFS: IntegrationDef[] = [
  {
    key: "sendgrid",
    name: "SendGrid",
    desc: "Transactional email: lead confirmations, nurture follow-ups and advisor notifications.",
    fields: [
      { key: "apiKey", label: "API key", type: "password", placeholder: "SG.…", env: "SENDGRID_API_KEY" },
      { key: "fromEmail", label: "From email", type: "email", placeholder: "hello@premiumleads.ai" },
      { key: "fromName", label: "From name", type: "text", placeholder: "Premium Leads" },
      { key: "replyTo", label: "Reply-to", type: "email", placeholder: "advisors@premiumleads.ai" },
    ],
    toggles: [
      { key: "leadConfirm", label: "Email the prospect a confirmation after the form" },
      { key: "nurtureSeq", label: "Start the nurture sequence for “not ready yet” leads" },
      { key: "advisorNotify", label: "Notify the assigned advisor on every new lead" },
    ],
  },
  {
    key: "authorityDesk",
    name: "The Authority Desk",
    desc: "Signed webhook relay. Every submission is sent here once; Authority Desk creates the Brand Voice Interview card and reports status back.",
    fields: [
      { key: "eventsUrl", label: "Events endpoint", type: "url", placeholder: "https://theauthoritydesk.com/api/integrations/premium-leads/events", env: "AD_EVENTS_URL" },
      { key: "secret", label: "Shared secret (HMAC-SHA256)", type: "password", placeholder: "••••", env: "AD_WEBHOOK_SECRET" },
      { key: "contactsUrl", label: "Contacts lookup endpoint (returning-client prefill)", type: "url", placeholder: "https://theauthoritydesk.com/api/integrations/contacts", env: "AD_CONTACTS_URL" },
      { key: "callbackUrl", label: "Our callback URL (read-only)", type: "url", placeholder: "https://premiumleads.ai/api/integrations/authority-desk/events", readOnly: true },
    ],
  },
  {
    key: "brandVoice",
    name: "Brand Voice Interview",
    desc: "Reached through The Authority Desk relay — no direct connection, so a person is only ever one card. Shown for status.",
    fields: [
      { key: "bookingUrl", label: "Interview booking link (shown to paid clients only)", type: "url", placeholder: "https://smart-scheduler.ai/…/brand-voice-interview" },
    ],
  },
  {
    key: "scheduler",
    name: "SmartScheduler",
    desc: "Strategy-call booking link and the webhook that marks a lead “call booked”.",
    fields: [
      { key: "strategyLink", label: "Strategy call link", type: "url", placeholder: "https://smart-scheduler.ai/fabp/booking/premiumleads-discovery" },
      { key: "webhookSecret", label: "Webhook secret", type: "password", placeholder: "••••", env: "SMART_SCHEDULER_WEBHOOK_SECRET" },
      { key: "webhookUrl", label: "Our webhook URL (read-only)", type: "url", placeholder: "https://premiumleads.ai/api/integrations/smart-scheduler/webhook", readOnly: true },
    ],
  },
  {
    key: "ai",
    name: "AI providers",
    desc: "Used to generate landing-page variants, resource blurbs and SEO text.",
    fields: [
      { key: "anthropicKey", label: "Anthropic API key", type: "password", placeholder: "sk-ant-…", env: "ANTHROPIC_API_KEY" },
      { key: "openaiKey", label: "OpenAI API key (also used for share images)", type: "password", placeholder: "sk-…", env: "OPENAI_API_KEY" },
      { key: "model", label: "Default model", type: "text", placeholder: "claude-sonnet-4-5" },
    ],
  },
  {
    key: "app",
    name: "Premium Leads app",
    desc: "The product at app.premiumleads.ai — sign-in link, pricing and the Slack workspace already connected there.",
    fields: [
      { key: "loginUrl", label: "Sign-in URL", type: "url", placeholder: "https://app.premiumleads.ai/auth/sign-in" },
      { key: "slackWebhookUrl", label: "Slack incoming webhook URL (new leads)", type: "password", placeholder: "https://hooks.slack.com/services/…", env: "SLACK_WEBHOOK_URL" },
      { key: "slackChannel", label: "Slack channel for new leads", type: "text", placeholder: "#new-leads" },
    ],
  },
  {
    key: "analytics",
    name: "Analytics & tracking",
    desc: "Measurement IDs injected on every public page.",
    fields: [
      { key: "ga4", label: "GA4 measurement ID", type: "text", placeholder: "G-XXXXXXX" },
      { key: "metaPixel", label: "Meta pixel ID", type: "text", placeholder: "" },
      { key: "linkedinTag", label: "LinkedIn Insight tag", type: "text", placeholder: "" },
    ],
  },
];

/** Secret field keys as "<integration>.<field>", the id used by the encrypted store. */
export const SECRET_FIELD_IDS: readonly string[] = INTEGRATION_DEFS.flatMap((g) =>
  g.fields.filter((f) => f.type === "password").map((f) => `${g.key}.${f.key}`),
);

export function isSecretField(integration: string, field: string): boolean {
  return SECRET_FIELD_IDS.includes(`${integration}.${field}`);
}

/** Non-secret integration values: integration → field/toggle → value. */
export const integrationsSettingsSchema = z.record(
  z.string().max(40),
  z.record(z.string().max(40), z.union([z.string().max(1000), z.boolean()])),
);
export type IntegrationsSettings = z.infer<typeof integrationsSettingsSchema>;
export const DEFAULT_INTEGRATIONS: IntegrationsSettings = {};

/** What the admin sees for one integration: plain values plus which secrets are set. */
export type IntegrationStatus = {
  key: string;
  values: Record<string, string | boolean>;
  secretsSet: Record<string, boolean>;
  /** Whether the server has a usable value from the store or the env. */
  configured: boolean;
  status: string;
  tone: "ok" | "warn" | "off";
};

/* -------------------------------------------------------------- analytics -- */

/** The IDs the public shell needs to inject tags (served unauthenticated). */
export type PublicConfig = {
  site: SiteSettings;
  sections: SectionsSettings;
  capabilities: CapabilitiesSettings;
  pricing: PricingSettings;
  analytics: { ga4: string; metaPixel: string; linkedinTag: string };
  /** Slug → label for every published page (variant pills, use-case cards). */
  pages: { slug: string; label: string; short: string; kicker: string; desc: string }[];
};
