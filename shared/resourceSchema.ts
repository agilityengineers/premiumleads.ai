/**
 * Complementary resources shown on /resources and teased on every landing
 * page (HANDOFF-resources.md). The admin pastes a URL; the server snapshots
 * the page and writes a blurb with AI; the admin edits and publishes.
 */
import { z } from "zod";

export const resourceIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Use lowercase letters, numbers and hyphens." })
  .max(80);

/** The editable fields of a resource (what the admin saves). */
export const resourceInputSchema = z.object({
  id: resourceIdSchema,
  name: z.string().trim().min(1, "A resource needs a name.").max(120),
  url: z.string().trim().max(500).default(""),
  category: z.string().trim().max(60).default(""),
  tagline: z.string().trim().max(200).default(""),
  description: z.string().trim().max(1200).default(""),
  highlights: z.array(z.string().trim().max(120)).max(6).default([]),
  featured: z.boolean().default(true),
});

export type ResourceInput = z.infer<typeof resourceInputSchema>;

/** The full ordered list, as saved from the admin Resources panel. */
export const resourcesSaveSchema = z.array(resourceInputSchema).max(50);

/** A resource as served to the public pages and the admin. */
export type ResourceRecord = ResourceInput & {
  /** Served URL of the stored screenshot, or null when none is stored. */
  snapshot: string | null;
  snapshotAt: string | null;
  order: number;
  updatedAt: string;
};

/**
 * What the AI must return for a pasted URL (HANDOFF-resources.md §2). The
 * limits are the contract: name, a 2–3 word category, a tagline ≤ 90 chars, a
 * 2–3 sentence description ≤ 320 chars, exactly three highlights ≤ 60 chars.
 */
export const resourceBlurbSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60),
  tagline: z.string().trim().min(1).max(90),
  description: z.string().trim().min(1).max(320),
  highlights: z.array(z.string().trim().min(1).max(60)).length(3),
});

export type ResourceBlurb = z.infer<typeof resourceBlurbSchema>;

/** Body for POST /api/admin/resources/fetch. */
export const resourceFetchSchema = z.object({
  url: z.string().trim().min(1, "Paste a URL first.").max(500),
  /** Re-snapshot an existing resource instead of drafting a new one. */
  id: resourceIdSchema.optional(),
  force: z.boolean().optional().default(false),
  notes: z.string().max(2000).optional().default(""),
});

/** What the fetch endpoint answers: a draft the admin can edit and save. */
export type ResourceDraft = {
  id: string;
  name: string;
  url: string;
  category: string;
  tagline: string;
  description: string;
  highlights: string[];
  snapshot: string | null;
  /** "ai" when the blurb came from the model, "extracted" when it fell back to the page's own title/description. */
  blurbSource: "ai" | "extracted";
  warnings: string[];
};

/** Initials for the gradient placeholder ("The Authority Desk" → "TAD"). */
export function resourceInitials(name: string): string {
  return (name || "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

/** Host badge text ("www.example.com" → "example.com"). */
export function resourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
