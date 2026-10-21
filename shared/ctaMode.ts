/**
 * Where a page's primary call-to-action points.
 *
 *   "prequalify"  every "Get started" button opens /get-started?variant=<slug>,
 *                 the pre-qualification intake, which routes to the calendar
 *                 or to nurture. The default.
 *   "book-call"   straight out to the booking URL, and the landing page shows
 *                 the simple contact form instead of the intake card.
 *
 * Resolves per page: the variant's own `ctaMode`, then the site-wide setting,
 * then the bundled default — the same three layers as The Authority Desk's
 * `funnelSchema`. A leaf module on purpose (see AD's note on import cycles).
 */
import { z } from "zod";

export const ctaModeSchema = z.enum(["prequalify", "book-call"]);
export type CtaMode = z.infer<typeof ctaModeSchema>;

export const DEFAULT_CTA_MODE: CtaMode = "prequalify";

/** The CTA mode a page uses: its own override, else the site default. */
export function resolveCtaMode(
  variantMode: CtaMode | null | undefined,
  siteMode: CtaMode | null | undefined,
): CtaMode {
  return variantMode ?? siteMode ?? DEFAULT_CTA_MODE;
}

/** Where the primary CTA sends people for a given mode. */
export function ctaHref(mode: CtaMode, slug: string, bookingUrl: string): string {
  return mode === "book-call"
    ? bookingUrl
    : `/get-started?variant=${encodeURIComponent(slug)}`;
}
