/**
 * Where a prospect goes after pre-qualifying.
 *
 * Copied from The Authority Desk's shared/routingSchema.ts. The vocabulary is
 * the same three destinations (packages / book / nurture) so the two apps read
 * a routing outcome identically; Premium Leads shows no pricing, so `packages`
 * is kept in the vocabulary but unused by the bundled rules.
 *
 * Rules are evaluated in order and the first match wins. The bundled default
 * reproduces `routeSubmission()` from the design package's content.js.
 */
import { z } from "zod";

/** Where a rule can send someone. */
export const ROUTE_DESTINATIONS = ["packages", "book", "nurture"] as const;
export type RouteDestination = (typeof ROUTE_DESTINATIONS)[number];

export const DESTINATION_LABELS: Record<RouteDestination, string> = {
  packages: "Sent to pricing",
  book: "Asked for a call",
  nurture: "Not ready yet",
};

/** Longer admin wording for the routing editor. */
export const DESTINATION_DESCRIPTIONS: Record<RouteDestination, string> = {
  packages: "The pricing page (unused — pricing lives in app.premiumleads.ai)",
  book: "Book a call with an advisor (prefilled SmartScheduler link)",
  nurture: "A “not ready yet” page that keeps in touch",
};

/** How a condition compares an answer to its values. */
export const CONDITION_OPERATORS = ["is", "is-not"] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

/**
 * One test against a single answer. `values` is a list, so "ready now OR
 * within three weeks" is one condition rather than two rules.
 */
export const routeConditionSchema = z.object({
  /** The question id to read, e.g. "readiness" or "marketingBudget". */
  questionId: z.string().trim().min(1).max(60),
  operator: z.enum(CONDITION_OPERATORS).default("is"),
  values: z.array(z.string().trim().max(200)).min(1, "Pick at least one answer."),
});

export type RouteCondition = z.infer<typeof routeConditionSchema>;

export const routeRuleSchema = z.object({
  id: z.string().trim().min(1).max(40),
  /** What this rule is for, in the admin's words. Shown nowhere public. */
  label: z.string().trim().min(1, "A rule needs a name.").max(160),
  /** All conditions must match (AND). An empty list matches everyone. */
  conditions: z.array(routeConditionSchema).max(10).default([]),
  destination: z.enum(ROUTE_DESTINATIONS).default("book"),
});

export type RouteRule = z.infer<typeof routeRuleSchema>;

/** Copy for the "not ready yet" outcome card on /get-started. */
export const nurtureCopySchema = z.object({
  eyebrow: z.string().trim().max(300).default(""),
  heading: z.string().trim().max(300).default(""),
  body: z.string().trim().max(1200).default(""),
  primaryLabel: z.string().trim().max(200).default(""),
  secondaryLabel: z.string().trim().max(200).default(""),
});

export const routingSettingsSchema = z.object({
  rules: z.array(routeRuleSchema).max(20).default([]),
  nurture: nurtureCopySchema,
});

export type RoutingSettings = z.infer<typeof routingSettingsSchema>;

const EXPLORING = "A year or two out — I'm exploring";
const READY_NOW = "I'm ready to start now";

/**
 * The bundled rules, equivalent to content.js:
 *
 *   exploring || (noBudget && readiness !== "ready now")  → nurture
 *   everyone else                                          → book
 */
export const DEFAULT_ROUTING: RoutingSettings = {
  rules: [
    {
      id: "exploring",
      label: "Still exploring (a year or two out) → not ready yet",
      conditions: [{ questionId: "readiness", operator: "is", values: [EXPLORING] }],
      destination: "nurture",
    },
    {
      id: "no-budget",
      label: "No budget and not ready to start now → not ready yet",
      conditions: [
        { questionId: "marketingBudget", operator: "is", values: ["No Budget"] },
        { questionId: "readiness", operator: "is-not", values: [READY_NOW] },
      ],
      destination: "nurture",
    },
    {
      id: "everyone",
      label: "Everyone else → book a call",
      conditions: [],
      destination: "book",
    },
  ],
  nurture: {
    eyebrow: "Thanks, {firstName}",
    heading: "Good timing matters. We'll stay in touch.",
    body:
      "It sounds like you're still exploring, so we won't push a sales call on you. We'll send a short note on how {doorNameLower} teams run outbound with Premium Leads — and when you're ready, your answers will be waiting.",
    primaryLabel: "Explore resources",
    secondaryLabel: "Book a call anyway →",
  },
};

/** Whether one condition holds for a set of answers. */
export function conditionMatches(
  condition: RouteCondition,
  answers: Record<string, unknown>,
): boolean {
  const raw = answers[condition.questionId];
  // A checkbox answer matches if ANY of its selections is named — "they picked
  // this goal", not "this is their only goal".
  const given = Array.isArray(raw)
    ? raw.map(String)
    : typeof raw === "string"
      ? [raw]
      : [];
  const hit = given.some((value) => condition.values.includes(value));
  return condition.operator === "is" ? hit : !hit;
}

/** The first rule whose conditions all hold. */
export function matchRule(
  settings: RoutingSettings,
  answers: Record<string, unknown>,
): RouteRule | undefined {
  return settings.rules.find((rule) =>
    rule.conditions.every((c) => conditionMatches(c, answers)),
  );
}

/**
 * Where to send someone after they submit. Falls back to booking a call when
 * no rule matches (Premium Leads has no pricing page to fall through to), so a
 * half-finished rule set can never strand anyone.
 */
export function resolveDestination(
  settings: RoutingSettings,
  answers: Record<string, unknown>,
): RouteDestination {
  const destination = matchRule(settings, answers)?.destination ?? "book";
  return destination === "packages" ? "book" : destination;
}
