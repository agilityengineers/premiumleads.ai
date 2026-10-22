/**
 * Where a page's primary call-to-action points — the zod-free half of
 * ctaMode.ts, so the landing page can resolve its buttons without shipping
 * the validation library. ctaMode.ts re-exports all of this.
 *
 *   "prequalify"  every "Get started" button opens /get-started?variant=<slug>,
 *                 the pre-qualification intake, which routes to the calendar
 *                 or to nurture. The default.
 *   "book-call"   straight out to the booking URL, and the landing page shows
 *                 the simple contact form instead of the intake card.
 */
export const CTA_MODES = ["prequalify", "book-call"] as const;
export type CtaMode = (typeof CTA_MODES)[number];

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
