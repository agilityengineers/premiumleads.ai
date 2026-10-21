/**
 * Zod schemas shared by the server (request validation, AI-output validation)
 * and the client (admin editor). Adapted from The Authority Desk's
 * shared/variantSchema.ts to Premium Leads' content model: one landing-page
 * template, one record per audience, with the field list from the design
 * package's content.js (`VARIANTS` + the StoryBrand `STORY` layer +
 * `CONTENT_MODEL`).
 *
 * Storage rule (mirrors the prototype's `overrides` / `customVariants`): a
 * variant row stores a PARTIAL content object — only the fields the admin (or
 * the AI draft) set. The server resolves a page by laying that over its base
 * (the bundled copy for a built-in slug, the "sales" copy for a custom page),
 * so a blank field in the editor means "inherit the default copy".
 */
import { z } from "zod";
import { ctaModeSchema, type CtaMode } from "./ctaMode";

const line = z.string().max(400);
const paragraph = z.string().max(2000);
const csv = z.array(z.string().max(120)).max(40);
const lines = z.array(z.string().max(400)).max(20);

export const statSchema = z.object({ v: line, l: line });
export const stepSchema = z.object({ title: line, body: paragraph });
export const pointSchema = z.object({ t: line, b: paragraph });
export const quoteSchema = z.object({ text: paragraph, initials: z.string().max(6), name: line, role: line });
export const faqSchema = z.object({ q: line, a: paragraph });
export const problemSchema = z.object({ kind: line, title: line, body: paragraph });
export const successSchema = z.object({ before: line, after: line });
export const useCaseColSchema = z.object({ title: line, items: z.array(line).max(20) });

/** Every content field a landing page can carry. All optional: see the storage rule above. */
export const contentSchema = z
  .object({
    /* Identity (use-case cards, variant pill, Get started "Coming from") */
    short: line,
    kicker: line,
    desc: paragraph,
    /* Hero */
    eyebrow: line,
    h1a: line,
    h1b: line,
    sub: paragraph,
    chip: line,
    channels: csv,
    stats: z.array(statSchema).max(6),
    /* Trust strip */
    trust: lines,
    /* Problem (the villain) */
    problemEyebrow: line,
    problemHeading: paragraph,
    villain: line,
    problems: z.array(problemSchema).max(6),
    /* Capabilities */
    capHeading: paragraph,
    capBlurb: paragraph,
    capOrder: csv,
    capCopy: z.record(z.string().max(40), paragraph),
    /* Guide (empathy + authority) */
    engineEyebrow: line,
    engineHeading: paragraph,
    engineBody: paragraph,
    enginePoints: z.array(pointSchema).max(6),
    /* The plan */
    howH1: line,
    howH2: line,
    howSub: paragraph,
    steps: z.array(stepSchema).max(6),
    /* Stakes & success */
    stakesHeading: paragraph,
    stakes: lines,
    successHeading: paragraph,
    success: z.array(successSchema).max(8),
    /* Use cases */
    ucHeading: paragraph,
    ucSub: paragraph,
    useCaseCols: z.array(useCaseColSchema).max(6),
    /* Integrations */
    integrations: csv,
    /* Proof */
    proofHeading: paragraph,
    quotes: z.array(quoteSchema).max(6),
    /* FAQ */
    faqs: z.array(faqSchema).max(12),
    /* Final CTA */
    ctaHeading: paragraph,
    ctaSub: paragraph,
    ctaMicro: line,
    ctaTransitional: line,
    /* SEO & social */
    metaTitle: line,
    metaDesc: paragraph,
  })
  .partial();

export type ContentInput = z.infer<typeof contentSchema>;
/** A fully-resolved page: every field present. */
export type Content = Required<ContentInput>;

/** The keys of `contentSchema`, for the editor and the AI prompt. */
export const CONTENT_KEYS = Object.keys(contentSchema.shape) as (keyof Content)[];

/**
 * What the AI must return for a new page: every field, so a generated draft
 * never half-inherits the sales copy. Built from the same shape with the
 * optionality removed.
 */
export const fullContentSchema = contentSchema.required();

/** A URL slug: lowercase letters, digits and hyphens. */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Use lowercase letters, numbers and hyphens only.",
  })
  .max(80);

/** App routes a landing page can never take. */
export const RESERVED_SLUGS: readonly string[] = [
  "admin",
  "api",
  "get-started",
  "resources",
  "assets",
  "robots.txt",
  "sitemap.xml",
];

/** The five audiences shipped with the site. Their content lives in src/content/variants.ts. */
export const BUILTIN_SLUGS = ["sales", "recruiting", "agency", "founders", "enterprise"] as const;
export type BuiltinSlug = (typeof BUILTIN_SLUGS)[number];

/** Editable variant fields accepted from the admin (PUT/POST body). */
export const variantInputSchema = z.object({
  label: z.string().trim().min(1).max(120),
  audience: z.string().trim().min(1).max(200),
  /** Per-page booking URL override (null = site default). */
  bookingUrl: z.string().trim().max(500).nullable().optional(),
  /** Where this variant's CTAs point (null = inherit the site default). */
  ctaMode: ctaModeSchema.nullable().optional(),
  content: contentSchema,
  published: z.boolean().optional(),
});

export type VariantInput = z.infer<typeof variantInputSchema>;

/** Body for creating a blank page. */
export const createVariantSchema = z.object({
  slug: slugSchema,
  label: z.string().trim().min(1).max(120),
  audience: z.string().trim().min(1).max(200),
});

/** A variant row as the admin sees it (raw override + resolved copy). */
export type VariantRecord = {
  slug: string;
  label: string;
  audience: string;
  builtin: boolean;
  bookingUrl: string | null;
  ctaMode: CtaMode | null;
  /** The stored partial override. */
  content: ContentInput;
  /** The base the override lays over (bundled copy for built-ins, sales for customs). */
  base: Content;
  published: boolean;
  generatedBy: string | null;
  hasOgImage: boolean;
  createdAt: string;
  updatedAt: string;
};

/** What the public page fetches: everything already resolved. */
export type PublicVariant = {
  slug: string;
  label: string;
  audience: string;
  content: Content;
  bookingUrl: string;
  ctaMode: CtaMode;
  isHome: boolean;
};

/** Request body for AI generation. */
export const generateRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  notes: z.string().max(4000).optional().default(""),
  provider: z.enum(["anthropic", "openai"]).optional().default("anthropic"),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

/**
 * A client-reported traffic event. "cta" is a primary-CTA click on a landing
 * page. Pre-qualification completions are recorded server-side on submission.
 */
export const trackEventSchema = z.object({
  slug: z.string().max(80).default(""),
  kind: z.enum(["cta"]),
});

export type TrackEvent = z.infer<typeof trackEventSchema>;

/** One row of the admin Traffic panel. */
export type TrafficRow = {
  slug: string;
  label: string;
  published: boolean;
  views: number;
  ctaClicks: number;
  prequals: number;
};

export type TrafficReport = {
  rows: TrafficRow[];
  totals: { views: number; ctaClicks: number; prequals: number };
  generatedAt: string;
};
