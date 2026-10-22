import { describe, expect, it } from "vitest";
import { siteSettingsSchema, DEFAULT_SITE_SETTINGS, DEFAULT_SECTIONS, SECTION_DEFS, sectionOn, capabilityOn } from "../shared/siteSettingsSchema";
import { DEFAULT_SITE_SETTINGS as PLAIN_DEFAULTS } from "../shared/siteDefaults";
import { ctaModeSchema, CTA_MODES, ctaHref } from "../shared/ctaMode";
import { ctaHref as plainCtaHref } from "../shared/cta";
import { resourceInitials } from "../shared/resourceSchema";
import { resourceInitials as plainInitials, resourceHost } from "../shared/resourceText";

/** The public bundle reads plain defaults (no zod); the schema must agree with them exactly. */
describe("zod-free defaults stay in sync with the schemas", () => {
  it("site settings parse({}) equals the plain defaults", () => {
    expect(siteSettingsSchema.parse({})).toEqual(PLAIN_DEFAULTS);
    expect(DEFAULT_SITE_SETTINGS).toBe(PLAIN_DEFAULTS);
  });
  it("section defaults follow SECTION_DEFS", () => {
    for (const s of SECTION_DEFS) expect(sectionOn({}, s.key)).toBe(s.defaultOn);
    expect(Object.keys(DEFAULT_SECTIONS)).toEqual(SECTION_DEFS.map((s) => s.key));
    expect(sectionOn({ pricing: true }, "pricing")).toBe(true);
    expect(capabilityOn({}, "dialer")).toBe(true);
    expect(capabilityOn({ dialer: false }, "dialer")).toBe(false);
  });
  it("cta modes and helpers are the same objects", () => {
    expect(ctaModeSchema.options).toEqual([...CTA_MODES]);
    expect(ctaHref).toBe(plainCtaHref);
    expect(resourceInitials).toBe(plainInitials);
    expect(resourceHost("https://www.example.com/x")).toBe("example.com");
  });
});
