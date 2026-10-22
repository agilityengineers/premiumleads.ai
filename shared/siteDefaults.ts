/**
 * The site-settings defaults and toggle helpers the public pages need at
 * runtime, kept free of zod so the landing page's bundle doesn't carry the
 * validation library (the schema in siteSettingsSchema.ts builds on these and
 * re-exports them; tests pin the two in sync).
 */
import type { CtaMode } from "./cta";

/* ------------------------------------------------------------------ site -- */

/** The admin's site settings document; siteSettingsSchema.ts asserts its parsed shape matches this exactly. */
export type SiteSettings = {
  /** The slug served at "/" ("Make home" in the admin). */
  defaultVariant: string;
  ctaMode: CtaMode;
  bookingUrl: string;
  vimeoId: string;
  loginUrl: string;
  contactEmail: string;
  siteTitle: string;
  ogImage: string;
  termsUrl: string;
  privacyUrl: string;
  footerNote: string;
  footerNoteLinkUrl: string;
  footerNoteLinkText: string;
};

/** Section key → shown? Keys never saved fall back to SECTION_DEFS. */
export type SectionsSettings = Record<string, boolean>;
/** Capability key → shown? Missing keys are on. */
export type CapabilitiesSettings = Record<string, boolean>;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  /** The slug served at "/" ("Make home" in the admin). */
  defaultVariant: "sales",
  ctaMode: "prequalify",
  bookingUrl: "https://smart-scheduler.ai/fabp/booking/premiumleads-discovery",
  vimeoId: "756896760",
  loginUrl: "https://app.premiumleads.ai/auth/sign-in",
  contactEmail: "hello@premiumleads.ai",
  siteTitle: "Premium Leads",
  ogImage: "",
  termsUrl: "",
  privacyUrl: "",
  footerNote: "Premium Leads is a Find a Business Pro! application.",
  footerNoteLinkUrl: "https://findabusinesspro.com",
  footerNoteLinkText: "Find a Business Pro!",
};

/* -------------------------------------------------------------- sections -- */

/** Every toggleable section of the landing-page template, in the admin's order. */
export const SECTION_DEFS = [
  { key: "trustStrip", title: "Trust strip", note: "Four proof phrases under the hero", defaultOn: true },
  { key: "problem", title: "Problem (villain)", note: "External, internal and philosophical problems", defaultOn: true },
  { key: "engine", title: "Guide", note: "Empathy statement + authority proof", defaultOn: true },
  { key: "how", title: "The plan", note: "Dark 3-step band", defaultOn: true },
  { key: "transformation", title: "Stakes & success", note: "Failure to avoid vs. transformation", defaultOn: true },
  { key: "usecases", title: "Use cases", note: "Audience cards and role/industry chips", defaultOn: true },
  { key: "integrations", title: "Integrations row", note: "Salesforce, HubSpot, Pipedrive…", defaultOn: true },
  { key: "testimonials", title: "Testimonials", note: "Two client quotes", defaultOn: true },
  { key: "testimonialAttribution", title: "Testimonial attributions", note: "Show names, roles and initials under quotes (off until real attributions are approved)", defaultOn: false },
  { key: "resources", title: "Resources", note: "Three featured complementary tools + link to /resources", defaultOn: true },
  { key: "faq", title: "FAQ", note: "Six questions", defaultOn: true },
  { key: "contactForm", title: "Contact form", note: "Name, email, company, phone, message", defaultOn: true },
  { key: "pricing", title: "Pricing", note: "Off by default — plans and billing live inside app.premiumleads.ai", defaultOn: false },
] as const;

export type SectionKey = (typeof SECTION_DEFS)[number]["key"];
export const SECTION_KEYS = SECTION_DEFS.map((s) => s.key) as SectionKey[];

export const DEFAULT_SECTIONS: SectionsSettings = Object.fromEntries(
  SECTION_DEFS.map((s) => [s.key, s.defaultOn]),
);

/** Whether a section shows, with the per-key default for keys never saved. */
export function sectionOn(settings: SectionsSettings, key: SectionKey): boolean {
  const v = settings[key];
  return typeof v === "boolean" ? v : DEFAULT_SECTIONS[key];
}

/* ---------------------------------------------------------- capabilities -- */

/** Capability keys from the catalogue (CAPS in src/content/variants.ts). */
export const CAPABILITY_KEYS = [
  "aiEmployee", "linkedin", "email", "dialer", "voicemail",
  "enrichment", "chrome", "video", "mobile", "crm",
] as const;
export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

export const DEFAULT_CAPABILITIES: CapabilitiesSettings = {};

/** key → shown? Missing keys are on. */
export function capabilityOn(settings: CapabilitiesSettings, key: string): boolean {
  return settings[key] !== false;
}
