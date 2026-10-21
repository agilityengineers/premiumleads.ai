/**
 * AI generation. Copied from The Authority Desk's server/ai.ts and adapted in
 * wording and schema only: the same provider routing (Anthropic by default,
 * OpenAI optional), the same JSON-only contract, zod validation and one retry.
 *
 * Three jobs:
 *   1. `generateVariantContent` — re-skin the landing-page copy for a new
 *      audience, validated against `fullContentSchema`.
 *   2. `generateResourceBlurb` — name/category/tagline/description/3 highlights
 *      for a pasted URL (HANDOFF-resources.md §2).
 *   3. `generateVariantImage` — an Open Graph card via OpenAI's image model.
 *
 * Keys come from `getSecret()` (admin-saved, encrypted) with the env vars
 * ANTHROPIC_API_KEY / OPENAI_API_KEY as the fallback.
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { fullContentSchema, type Content } from "../shared/variantSchema";
import { resourceBlurbSchema, type ResourceBlurb } from "../shared/resourceSchema";
import { BUILTIN_BY_SLUG, CUSTOM_BASE_SLUG } from "../src/content/variants";
import { CAPS } from "../src/content/caps";
import { getSecret } from "./secrets";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

export type Provider = "anthropic" | "openai";

export class AiError extends Error {}

async function anthropicKey(): Promise<string> {
  return getSecret("ai.anthropicKey");
}
async function openaiKey(): Promise<string> {
  return getSecret("ai.openaiKey");
}

const CAP_KEYS = CAPS.map((c) => c.key);

const SYSTEM_PROMPT = `You are a senior brand copywriter for "Premium Leads" (premiumleads.ai), a multi-channel lead-generation platform: it finds verified decision-makers and engages them across LinkedIn, email, phone, voicemail and video with human-paced automation, an AI Employee that prospects and follows up, data enrichment, a Chrome extension, a mobile app and two-way CRM sync. The single conversion goal of the landing page is getting the reader to take the next step — a short pre-qualification, or a call with an advisor; pricing is NEVER shown on the landing page.

The page follows the StoryBrand (SB7) structure: the customer is the hero and Premium Leads is the guide. Problem (external, internal, philosophical, with a named villain) → Guide (empathy statement + authority proof) → Plan (three steps, the first is always booking a call) → Stakes (what failure looks like) → Success (before → after).

You will be given the page copy as a JSON object and a target audience. Rewrite the copy so the entire page speaks directly to that audience — their world, their objections, the way they buy — while keeping the brand's confident, concrete, non-hypey voice.

Rules:
- Return ONLY a single valid JSON object with EXACTLY the same keys and structure as the example. No markdown, no commentary, no code fences.
- Keep every array the same length as the example (same number of stats, trust phrases, problems, points, steps, stakes, success rows, use-case columns, integrations, quotes, FAQs).
- "capOrder" may only contain these keys, each at most once: ${CAP_KEYS.join(", ")}. "capCopy" keys must come from the same list.
- "short" is a one- or two-word audience name for a pill; "kicker" is a two- or three-word card label; "desc" is one sentence for the use-case card.
- Keep the existing proof numbers (+$15M ACV, +$75k, 3 senior executives) factual — never invent new statistics, pricing or guarantees.
- Write concrete, finished copy. No "{...}" placeholders.`;

function buildUserPrompt(name: string, notes: string): string {
  const example = JSON.stringify(BUILTIN_BY_SLUG[CUSTOM_BASE_SLUG].content, null, 2);
  return `Target audience / industry: ${name}
${notes ? `Extra direction from the operator: ${notes}\n` : ""}
Here is the example page copy to re-skin (match this JSON structure exactly):

${example}

Return the rewritten JSON object now.`;
}

export function extractJson(raw: string): unknown {
  let text = raw.trim();
  // Strip ```json ... ``` fences if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // Fall back to the outermost { ... } block.
  if (!text.startsWith("{")) {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) text = text.slice(first, last + 1);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new AiError(`Model did not return valid JSON: ${(err as Error).message}`);
  }
}

async function callAnthropic(system: string, user: string, maxTokens = 8000): Promise<string> {
  const apiKey = await anthropicKey();
  if (!apiKey) {
    throw new AiError("The Anthropic API key is not configured. Add it under Integrations → AI providers (or ANTHROPIC_API_KEY in Secrets).");
  }
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new AiError("Claude returned no text content.");
  return block.text;
}

async function callOpenAI(system: string, user: string): Promise<string> {
  const apiKey = await openaiKey();
  if (!apiKey) {
    throw new AiError("The OpenAI API key is not configured. Add it under Integrations → AI providers (or OPENAI_API_KEY in Secrets).");
  }
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new AiError("OpenAI returned no content.");
  return text;
}

/** Route a (system, user) prompt to the selected text provider. */
function callModel(provider: Provider, system: string, user: string): Promise<string> {
  return provider === "openai" ? callOpenAI(system, user) : callAnthropic(system, user);
}

/** Which providers have an API key configured (store or env). */
export async function availableProviders(): Promise<Provider[]> {
  const out: Provider[] = [];
  if (await anthropicKey()) out.push("anthropic");
  if (await openaiKey()) out.push("openai");
  return out;
}

/** Drops unknown capability keys the model may have invented. */
function sanitizeCaps(content: Content): Content {
  const seen = new Set<string>();
  const capOrder = (content.capOrder ?? []).filter((k) => CAP_KEYS.includes(k) && !seen.has(k) && (seen.add(k), true));
  const capCopy = Object.fromEntries(Object.entries(content.capCopy ?? {}).filter(([k]) => CAP_KEYS.includes(k)));
  return { ...content, capOrder: capOrder.length ? capOrder : BUILTIN_BY_SLUG[CUSTOM_BASE_SLUG].content.capOrder, capCopy };
}

/**
 * Generate validated page content for a target audience. Retries once on a
 * validation/parse failure before giving up.
 */
export async function generateVariantContent(name: string, notes: string, provider: Provider): Promise<Content> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callModel(provider, SYSTEM_PROMPT, buildUserPrompt(name, notes));
      const json = extractJson(raw);
      const parsed = fullContentSchema.safeParse(json);
      if (parsed.success) return sanitizeCaps(parsed.data as Content);
      lastErr = new AiError(
        `Generated content failed validation: ${parsed.error.issues
          .slice(0, 4)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
      );
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr instanceof AiError) throw lastErr;
  throw new AiError(`AI generation failed: ${(lastErr as Error)?.message ?? "unknown error"}`);
}

/* -------------------------------------------------------- resource blurbs */

const RESOURCE_SYSTEM_PROMPT = `You write short, concrete product blurbs for a "Resources" page on premiumleads.ai. Premium Leads is a multi-channel lead-generation platform. You will receive extracted text from a partner application's website. Describe what that application does and how it complements Premium Leads for a client. Confident, professional, no hype, no invented features or pricing. Return ONLY JSON with keys: name (string), category (2–3 words), tagline (≤ 90 chars), description (2–3 sentences, ≤ 320 chars), highlights (array of exactly 3 short strings, ≤ 60 chars each).`;

export type ExtractedPage = {
  url: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  h1: string;
  bodyText: string;
};

function buildResourcePrompt(page: ExtractedPage, notes: string): string {
  return `URL: ${page.url}
Title: ${page.title}
Meta description: ${page.description}
og:title: ${page.ogTitle}
og:description: ${page.ogDescription}
H1: ${page.h1}
${notes ? `Operator notes: ${notes}\n` : ""}
Visible body text (first ~1,500 words):
${page.bodyText}

Return the JSON object now.`;
}

/**
 * The blurb for a pasted URL, validated. Retries once; after that the caller
 * falls back to the extracted title/description as a plain draft.
 */
export async function generateResourceBlurb(page: ExtractedPage, notes: string, provider: Provider): Promise<ResourceBlurb> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callModel(provider, RESOURCE_SYSTEM_PROMPT, buildResourcePrompt(page, notes));
      const parsed = resourceBlurbSchema.safeParse(extractJson(raw));
      if (parsed.success) return parsed.data;
      lastErr = new AiError(
        `Blurb failed validation: ${parsed.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      );
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr instanceof AiError) throw lastErr;
  throw new AiError(`Blurb generation failed: ${(lastErr as Error)?.message ?? "unknown error"}`);
}

/* ------------------------------------------------------ social-share image */

function buildImagePrompt(name: string, notes: string): string {
  return `A clean, modern social-share preview image (Open Graph card, 1.91:1 landscape) for a B2B software brand called "Premium Leads".

Audience / industry: ${name}.
${notes ? `Direction: ${notes}.\n` : ""}
Style: confident, modern SaaS. Deep navy (#0C2E63) and bright blue (#1E88E5) with a cyan (#00B2EF) accent on a very light blue-white background. Generous negative space, geometric sans-serif typographic feel. Subtle abstract motifs of connected channels (message bubbles, a phone, an envelope, a play button) orbiting one node — NO real logos, NO real photos of people, NO pricing, NO gibberish text. Tasteful and uncluttered, suitable as a link-preview thumbnail.`;
}

/**
 * Generate a social-share image for the audience using OpenAI's image model
 * (Anthropic has no image API). Returns raw PNG bytes for storage.
 */
export async function generateVariantImage(name: string, notes: string): Promise<{ bytes: Buffer; contentType: string }> {
  const apiKey = await openaiKey();
  if (!apiKey) throw new AiError("An OpenAI API key is required to generate a social-share image.");
  const client = new OpenAI({ apiKey });
  const res = await client.images.generate({
    model: OPENAI_IMAGE_MODEL,
    prompt: buildImagePrompt(name, notes),
    size: "1536x1024",
    n: 1,
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new AiError("Image model returned no image data.");
  return { bytes: Buffer.from(b64, "base64"), contentType: "image/png" };
}
