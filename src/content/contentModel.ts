/* Field catalogue — what a new industry page needs. Used by the admin editor.
   `CONTENT_MODEL`, `LIST_FIELDS`, `toText`, `fromText` and `normalize` from
   the design package's content.js, typed. */
import type { Content } from "../../shared/variantSchema";

export type ContentKey = keyof Content;

/** Envelope fields the editor shows alongside the copy (not part of `Content`). */
export type EnvelopeKey = "label" | "audience" | "slug" | "bookingUrl";
export type EditorKey = ContentKey | EnvelopeKey;

export const CONTENT_MODEL: { group: string; fields: [EditorKey, string][] }[] = [
  { group: "Identity", fields: [["label", "Page label"], ["audience", "Audience (plural noun phrase)"], ["slug", "URL slug"], ["short", "Short name (variant pill)"], ["kicker", "Use-case card kicker"], ["desc", "Use-case card description"]] },
  { group: "Hero", fields: [["eyebrow", "Eyebrow"], ["h1a", "Headline line 1"], ["h1b", "Headline line 2 (gradient)"], ["sub", "Subhead"], ["chip", "Status chip"], ["channels", "Channel badges (comma-separated)"], ["stats", "Stats — one per line: Value | Label"]] },
  { group: "Trust strip", fields: [["trust", "Phrases — one per line"]] },
  { group: "Problem (the villain)", fields: [["problemEyebrow", "Eyebrow"], ["problemHeading", "Heading — what the hero is up against"], ["villain", "Named villain"], ["problems", "External / internal / philosophical — one per line: Kind | Title | Body"]] },
  { group: "Capabilities", fields: [["capHeading", "Heading"], ["capBlurb", "Blurb"], ["capOrder", "Order & inclusion (comma-separated keys)"], ["capCopy", "Per-capability copy — one per line: key | body"]] },
  { group: "Guide (empathy + authority)", fields: [["engineEyebrow", "Eyebrow"], ["engineHeading", "Empathy statement"], ["engineBody", "Authority intro"], ["enginePoints", "Authority proof — one per line: Title | Body"]] },
  { group: "The plan (3 steps)", fields: [["howH1", "Heading line 1"], ["howH2", "Heading line 2 (cyan)"], ["howSub", "Subhead"], ["steps", "Steps — one per line: Title | Body"]] },
  { group: "Stakes & success", fields: [["stakesHeading", "Stakes heading"], ["stakes", "What failure looks like — one per line"], ["successHeading", "Success heading"], ["success", "Transformation — one per line: Before | After"]] },
  { group: "Use cases", fields: [["ucHeading", "Heading"], ["ucSub", "Subhead"], ["useCaseCols", "Columns — one per line: Title | item, item, item"]] },
  { group: "Integrations", fields: [["integrations", "Names (comma-separated)"]] },
  { group: "Proof", fields: [["proofHeading", "Heading"], ["quotes", "Quotes — one per line: Quote | Initials | Name | Role"]] },
  { group: "FAQ", fields: [["faqs", "Items — one per line: Question | Answer"]] },
  { group: "Final CTA", fields: [["ctaHeading", "Heading"], ["ctaSub", "Subhead"], ["ctaMicro", "Microcopy"], ["ctaTransitional", "Transitional CTA label"], ["bookingUrl", "Booking URL override"]] },
  { group: "SEO & social", fields: [["metaTitle", "Page title"], ["metaDesc", "Meta description"]] },
];

type ListField =
  | { kind: "csv" }
  | { kind: "lines" }
  | { kind: "rows"; keys: string[] }
  | { kind: "cols" }
  | { kind: "map" };

/* Serialize structured fields to editable text and back (admin ⇄ page). */
export const LIST_FIELDS: Partial<Record<ContentKey, ListField>> = {
  channels: { kind: "csv" }, integrations: { kind: "csv" }, capOrder: { kind: "csv" }, trust: { kind: "lines" },
  stats: { kind: "rows", keys: ["v", "l"] }, steps: { kind: "rows", keys: ["title", "body"] }, enginePoints: { kind: "rows", keys: ["t", "b"] },
  quotes: { kind: "rows", keys: ["text", "initials", "name", "role"] }, faqs: { kind: "rows", keys: ["q", "a"] },
  problems: { kind: "rows", keys: ["kind", "title", "body"] }, stakes: { kind: "lines" }, success: { kind: "rows", keys: ["before", "after"] },
  useCaseCols: { kind: "cols" }, capCopy: { kind: "map" },
};

/** Fields that get a tall textarea in the editor. */
export const LONG_FIELDS: EditorKey[] = ["sub", "faqs", "quotes", "steps", "enginePoints", "useCaseCols", "capCopy", "trust", "stats", "engineBody", "ctaSub", "metaDesc", "problems", "stakes", "success"];

export function toText(key: EditorKey, val: unknown): string {
  const f = LIST_FIELDS[key as ContentKey];
  if (!f || val == null) return val == null ? "" : String(val);
  if (typeof val === "string") return val;
  const arr = val as unknown[];
  if (f.kind === "csv") return (arr as string[]).join(", ");
  if (f.kind === "lines") return (arr as string[]).join("\n");
  if (f.kind === "rows") return (arr as Record<string, string>[]).map((r) => f.keys.map((k) => r[k] ?? "").join(" | ")).join("\n");
  if (f.kind === "cols") return (arr as { title: string; items?: string[] }[]).map((c) => c.title + " | " + (c.items || []).join(", ")).join("\n");
  if (f.kind === "map") return Object.entries(val as Record<string, string>).map(([k, v]) => k + " | " + v).join("\n");
  return String(val);
}

export function fromText(key: EditorKey, text: string): unknown {
  const f = LIST_FIELDS[key as ContentKey];
  if (!f || typeof text !== "string") return text;
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  const split = (s: string) => s.split("|").map((x) => x.trim());
  if (f.kind === "csv") return text.split(",").map((s) => s.trim()).filter(Boolean);
  if (f.kind === "lines") return lines;
  if (f.kind === "rows") return lines.map((l) => { const parts = split(l); return Object.fromEntries(f.keys.map((k, i) => [k, parts[i] ?? ""])); });
  if (f.kind === "cols") return lines.map((l) => { const [title, items = ""] = split(l); return { title, items: items.split(",").map((s) => s.trim()).filter(Boolean) }; });
  if (f.kind === "map") return Object.fromEntries(lines.map((l) => { const [k, ...rest] = split(l); return [k, rest.join(" | ")]; }));
  return text;
}

/* Normalize any stored record (strings from the admin or arrays) to arrays. */
export function normalize<T extends Record<string, unknown>>(rec: T): T {
  const out: Record<string, unknown> = { ...rec };
  (Object.keys(LIST_FIELDS) as ContentKey[]).forEach((k) => {
    if (typeof out[k] === "string") out[k] = fromText(k, out[k] as string);
  });
  return out as T;
}

/** Turns a label into a URL slug ("Logistics sales teams" → "logistics-sales-teams"). */
export function slugify(s: string): string {
  return String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
