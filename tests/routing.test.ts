import { describe, it, expect } from "vitest";
import { DEFAULT_ROUTING, resolveDestination, routingSettingsSchema, conditionMatches } from "../shared/routingSchema";
import { ctaHref, resolveCtaMode } from "../shared/ctaMode";

const EXPLORING = "A year or two out — I'm exploring";
const READY = "I'm ready to start now";

/** content.js routeSubmission, kept here as the oracle the rules must match. */
function routeSubmission(a: Record<string, unknown>): "book" | "nurture" {
  const exploring = a.readiness === EXPLORING;
  const noBudget = a.marketingBudget === "No Budget";
  if (exploring || (noBudget && a.readiness !== READY)) return "nurture";
  return "book";
}

const readiness = [READY, "Within the next 3 weeks", "Within a month", "Within 6 months", EXPLORING];
const budgets = ["No Budget", "$500 - $1,500/month", "$1,500 - $5,000/month", "$5,000 - $20,000/month"];

describe("default routing rules", () => {
  it("validate against the schema", () => {
    expect(routingSettingsSchema.safeParse(DEFAULT_ROUTING).success).toBe(true);
  });

  it("match content.js routeSubmission for every readiness × budget pair", () => {
    for (const r of readiness) {
      for (const b of budgets) {
        const answers = { readiness: r, marketingBudget: b };
        expect(resolveDestination(DEFAULT_ROUTING, answers), `${r} / ${b}`).toBe(routeSubmission(answers));
      }
    }
  });

  it("sends 'no budget but ready now' to a call and 'no budget, within a month' to nurture", () => {
    expect(resolveDestination(DEFAULT_ROUTING, { readiness: READY, marketingBudget: "No Budget" })).toBe("book");
    expect(resolveDestination(DEFAULT_ROUTING, { readiness: "Within a month", marketingBudget: "No Budget" })).toBe("nurture");
  });

  it("never strands anyone: no match and the unused packages destination both fall back to a call", () => {
    expect(resolveDestination({ rules: [], nurture: DEFAULT_ROUTING.nurture }, {})).toBe("book");
    expect(resolveDestination({ rules: [{ id: "x", label: "x", conditions: [], destination: "packages" }], nurture: DEFAULT_ROUTING.nurture }, {})).toBe("book");
  });

  it("treats a checkbox answer as matching when any selection is named", () => {
    expect(conditionMatches({ questionId: "goals", operator: "is", values: ["Hire faster from passive talent"] }, { goals: ["Book more qualified meetings", "Hire faster from passive talent"] })).toBe(true);
    expect(conditionMatches({ questionId: "goals", operator: "is-not", values: ["Hire faster from passive talent"] }, { goals: ["Book more qualified meetings"] })).toBe(true);
  });
});

describe("CTA mode resolution", () => {
  it("prefers the page's own mode, then the site default, then prequalify", () => {
    expect(resolveCtaMode(null, null)).toBe("prequalify");
    expect(resolveCtaMode(null, "book-call")).toBe("book-call");
    expect(resolveCtaMode("prequalify", "book-call")).toBe("prequalify");
  });
  it("points at the intake with the door, or the booking URL", () => {
    expect(ctaHref("prequalify", "recruiting", "https://smart-scheduler.ai/x")).toBe("/get-started?variant=recruiting");
    expect(ctaHref("book-call", "recruiting", "https://smart-scheduler.ai/x")).toBe("https://smart-scheduler.ai/x");
  });
});
