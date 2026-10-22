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
import { CTA_MODES } from "./cta";

export { CTA_MODES, DEFAULT_CTA_MODE, resolveCtaMode, ctaHref } from "./cta";
export type { CtaMode } from "./cta";

export const ctaModeSchema = z.enum(CTA_MODES);
