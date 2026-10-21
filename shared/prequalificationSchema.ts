/**
 * Pre-qualification ("Get started") form: the option lists, the rules an
 * admin-edited definition must satisfy, and the bundled default form.
 *
 * Copied from The Authority Desk's shared/prequalificationSchema.ts and
 * adapted in WORDING ONLY. Three things are identical to The Authority Desk
 * and must stay so, because the Brand Voice Interview's skip logic and both
 * apps' storage key on them:
 *
 *   1. The seven SYSTEM question ids (fullName, email, phone, company,
 *      clientType, servicePreference, marketingBudget) — they must exist,
 *      keep their type and stay required.
 *   2. `SERVICE_PREFERENCE_VALUES` and `MARKETING_BUDGET_VALUES` — the Brand
 *      Voice Interview's exact option VALUES, in order, byte-identical. Only
 *      the labels are Premium Leads wording.
 *   3. Ids are answer keys, so they may not collide or use reserved names.
 *
 * Premium Leads never talks to the Brand Voice Interview directly (see
 * HANDOFF-intake.md): the submission goes to The Authority Desk once, and AD
 * relays it. The values below are what make that relay land on the right card
 * without re-asking the person anything.
 */
import type { RouteDestination } from "./routingSchema";
import {
  checkDefinition,
  formDefinitionSchema,
  type FormAnswers,
  type FormDefinition,
  type QuestionType,
} from "./formSchema";

/* ------------------------------------------------------------- options ---- */

/** Who does the outreach. Premium Leads wording; an admin can add more. */
export const CLIENT_TYPE_OPTIONS = [
  "Sales leader",
  "SDR / BDR",
  "Account executive",
  "Founder / CEO",
  "Recruiter / talent leader",
  "Agency owner",
  "Marketing leader",
  "Consultant / advisor",
  "Other professional",
] as const;

/** What the prospect wants Premium Leads to accomplish (pick any). */
export const GOAL_OPTIONS = [
  "Book more qualified meetings",
  "Fill the pipeline consistently, every month",
  "Reach decision-makers who ignore email",
  "Hire faster from passive talent",
  "Launch outbound as a service for clients",
  "Replace manual prospecting and follow-up",
  "Consolidate LinkedIn, email, phone and video into one tool",
  "See which touchpoints actually create revenue",
] as const;

/**
 * Where they are in their own process. Drives routing: someone a year out is
 * routed to nurture rather than to a call. Values identical to The Authority
 * Desk so the two apps' routing rules read the same answers.
 */
export const READINESS_OPTIONS = [
  "I'm ready to start now",
  "Within the next 3 weeks",
  "Within a month",
  "Within 6 months",
  "A year or two out — I'm exploring",
] as const;

/**
 * A selectable choice whose stored `value` differs from its displayed `label`.
 * Used for the two Brand Voice Interview-compatible qualifiers, where the
 * value must match BVI exactly and the label speaks in the Premium Leads voice.
 */
export type PrequalChoice<V extends string = string> = {
  /** Stored + validated value — matches the Brand Voice Interview form exactly. */
  value: V;
  /** What the form displays (Premium Leads wording). */
  label: string;
};

/**
 * Working-style values, exactly as the Brand Voice Interview form stores them
 * (its `servicePreference` question). DO NOT reword these — see interop note.
 */
export const SERVICE_PREFERENCE_VALUES = [
  "Do-it-yourself (DIY)",
  "Done-with-you (DWY)",
  "Done-for-you (DFY)",
] as const;

/** Working-style choices shown on the form (BVI value under PL wording). */
export const SERVICE_PREFERENCE_CHOICES: readonly PrequalChoice<
  (typeof SERVICE_PREFERENCE_VALUES)[number]
>[] = [
  {
    value: "Do-it-yourself (DIY)",
    label: "Give me the platform — my team runs the campaigns (DIY)",
  },
  {
    value: "Done-with-you (DWY)",
    label: "Set it up with me — your team builds, mine operates (done with you)",
  },
  {
    value: "Done-for-you (DFY)",
    label:
      "Run it for me — an AI employee and your team handle outreach end to end (done for you)",
  },
];

/**
 * Monthly marketing budget ranges, exactly as the Brand Voice Interview form
 * stores them (its `marketingBudget` question). DO NOT reword — see interop
 * note.
 */
export const MARKETING_BUDGET_VALUES = [
  "No Budget",
  "$500 - $1,500/month",
  "$1,500 - $5,000/month",
  "$5,000 - $20,000/month",
] as const;

/** Budget choices shown on the form (BVI value under PL wording). */
export const MARKETING_BUDGET_CHOICES: readonly PrequalChoice<
  (typeof MARKETING_BUDGET_VALUES)[number]
>[] = [
  { value: "No Budget", label: "No set budget yet" },
  { value: "$500 - $1,500/month", label: "$500 – $1,500 a month" },
  { value: "$1,500 - $5,000/month", label: "$1,500 – $5,000 a month" },
  { value: "$5,000 - $20,000/month", label: "$5,000 – $20,000 a month" },
];

/* ------------------------------------------------------ system questions -- */

/**
 * Questions the rest of the system depends on. Each is stored in its own
 * column, drives the handoff, or both — so an admin may reword and reorder
 * them, but never delete them, change their type, or make them optional.
 * `lockedValues` additionally pins the option values (the BVI contract).
 */
export const SYSTEM_QUESTIONS: Record<
  string,
  { type: QuestionType; lockedValues?: readonly string[] }
> = {
  fullName: { type: "text" },
  email: { type: "email" },
  phone: { type: "tel" },
  company: { type: "text" },
  clientType: { type: "radio" },
  servicePreference: {
    type: "radio",
    lockedValues: SERVICE_PREFERENCE_VALUES,
  },
  marketingBudget: { type: "radio", lockedValues: MARKETING_BUDGET_VALUES },
};

export const SYSTEM_QUESTION_IDS = Object.keys(SYSTEM_QUESTIONS);

/** Whether a question id is structural (undeletable, fixed type). */
export function isSystemQuestion(id: string): boolean {
  return id in SYSTEM_QUESTIONS;
}

/** Whether a question's option values are contractually pinned. */
export function hasLockedValues(id: string): boolean {
  return Boolean(SYSTEM_QUESTIONS[id]?.lockedValues);
}

/**
 * Re-stamps `system` / `lockedValues` from this module's constants and drops
 * any client-supplied flags. The form builder sends these back as it received
 * them, but they decide what the admin UI lets you do — so they're derived
 * here rather than trusted, and a hand-crafted request can't unlock anything.
 */
function normalizeSystemFlags(def: FormDefinition): FormDefinition {
  return {
    ...def,
    sections: def.sections.map((section) => ({
      ...section,
      questions: section.questions.map((question) => {
        const system = SYSTEM_QUESTIONS[question.id];
        const { system: _s, lockedValues: _l, ...rest } = question;
        if (!system) return rest;
        return {
          ...rest,
          required: true,
          system: true,
          ...(system.lockedValues ? { lockedValues: true } : {}),
        };
      }),
    })),
  };
}

/**
 * A pre-qualification form definition: structurally valid (formSchema rules),
 * carrying every system question at its fixed type, with the Brand Voice
 * Interview option values intact. Used to validate what the admin saves and
 * what the server reads back out of the database.
 */
export const prequalFormSchema = formDefinitionSchema
  .superRefine(checkDefinition)
  .superRefine((def, ctx) => {
    const byId = new Map(
      def.sections.flatMap((s, si) =>
        s.questions.map((q, qi) => [q.id, { q, path: ["sections", si, "questions", qi] }] as const),
      ),
    );

    for (const [id, rules] of Object.entries(SYSTEM_QUESTIONS)) {
      const found = byId.get(id);
      if (!found) {
        ctx.addIssue({
          code: "custom",
          path: ["sections"],
          message: `The “${id}” question is required and can't be removed.`,
        });
        continue;
      }
      const { q, path } = found;
      if (q.type !== rules.type) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "type"],
          message: `“${id}” must stay a ${rules.type} question.`,
        });
      }
      if (!q.required) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "required"],
          message: `“${id}” must stay required.`,
        });
      }
      if (rules.lockedValues) {
        const values = q.options.map((o) => o.value);
        const matches =
          values.length === rules.lockedValues.length &&
          values.every((v, i) => v === rules.lockedValues![i]);
        if (!matches) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "options"],
            message: `“${id}” option values are fixed by the Brand Voice Interview handoff — you can reword the labels, but not the values.`,
          });
        }
      }
    }
  })
  .transform(normalizeSystemFlags);

/* ------------------------------------------------------------- contract --- */

/**
 * The last line of defence, applied to every submission regardless of which
 * definition produced it. Even if a stored definition were corrupted or
 * tampered with, a row can never reach the database with an off-contract
 * working-style or budget value, or without the identity fields.
 */
export function assertContract(answers: FormAnswers): string | null {
  for (const id of ["fullName", "email", "phone", "company"]) {
    const value = answers[id];
    if (typeof value !== "string" || value.trim() === "") {
      return `Missing required answer: ${id}.`;
    }
  }
  const service = answers.servicePreference;
  if (
    typeof service !== "string" ||
    !SERVICE_PREFERENCE_VALUES.includes(
      service as (typeof SERVICE_PREFERENCE_VALUES)[number],
    )
  ) {
    return "Working style must be one of the supported options.";
  }
  const budget = answers.marketingBudget;
  if (
    typeof budget !== "string" ||
    !MARKETING_BUDGET_VALUES.includes(
      budget as (typeof MARKETING_BUDGET_VALUES)[number],
    )
  ) {
    return "Marketing budget must be one of the supported ranges.";
  }
  return null;
}

/* ----------------------------------------------------------- default form -- */

const plainOptions = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }));

/** Shorthand for a fully-populated question (mirrors `Q()` in content.js). */
function q(
  id: string,
  type: QuestionType,
  label: string,
  extra: Partial<Omit<import("./formSchema").FormQuestion, "id" | "type" | "label">> = {},
): import("./formSchema").FormQuestion {
  return {
    id,
    type,
    label,
    hint: "",
    placeholder: "",
    required: false,
    width: "full",
    columns: 1,
    options: [],
    ...extra,
  };
}

/**
 * The bundled starting form — `PREQUAL_FORM` from the design package's
 * content.js. Used until an admin saves their own version, and as the
 * fallback if a stored definition ever fails validation. Same shape as The
 * Authority Desk's DEFAULT_PREQUAL_FORM; Premium Leads wording; PL `clientType`
 * options. The door-specific section (shared/doorSections.ts) is spliced in as
 * section 02b at render time and is not part of this definition.
 */
export const DEFAULT_PREQUAL_FORM: FormDefinition = {
  version: 1,
  sections: [
    {
      id: "contact",
      kicker: "01 · Contact",
      heading: "Where we reach you.",
      note: "Used by your advisor to follow up — never shared or published.",
      questions: [
        q("fullName", "text", "Full name", { placeholder: "Jordan Avery", required: true, width: "half", system: true }),
        q("email", "email", "Work email", { placeholder: "jordan@yourcompany.com", required: true, width: "half", system: true }),
        q("phone", "tel", "Phone", { placeholder: "(555) 123-4567", required: true, width: "half", system: true }),
        q("company", "text", "Company", { placeholder: "Avery Logistics", required: true, width: "half", system: true }),
        q("roleTitle", "text", "Your role or title", { placeholder: "VP Sales", width: "half" }),
        q("website", "url", "Website", { placeholder: "https://yourcompany.com", width: "half" }),
      ],
    },
    {
      id: "profile",
      kicker: "02 · Who you are",
      heading: "Who's doing the outreach.",
      note: "Broad strokes are fine — we go deeper on the call.",
      questions: [
        q("clientType", "radio", "Which best describes you?", {
          required: true,
          columns: 2,
          system: true,
          pinInTable: true,
          options: plainOptions(CLIENT_TYPE_OPTIONS),
        }),
        q("expertise", "textarea", "In a sentence or two: what do you sell, and to whom?", {
          hint: "However you'd say it across the table — no polish needed.",
          placeholder: "We help…",
          required: true,
        }),
      ],
    },
    {
      id: "goals",
      kicker: "03 · Your goals",
      heading: "What a full pipeline would change.",
      note: "Pick everything that applies — it shapes what we recommend.",
      questions: [
        q("goals", "checkbox", "What should Premium Leads accomplish for you?", {
          required: true,
          columns: 2,
          options: plainOptions(GOAL_OPTIONS),
        }),
      ],
    },
    {
      id: "readiness",
      kicker: "04 · Timing",
      heading: "Where you are in the process.",
      note: "There's no wrong answer — it tells us how to be useful right now.",
      questions: [
        q("readiness", "radio", "When would you want campaigns live?", {
          required: true,
          pinInTable: true,
          options: plainOptions(READINESS_OPTIONS),
        }),
      ],
    },
    {
      id: "fit",
      kicker: "05 · Working together",
      heading: "How you'd want this to run.",
      note: "So we only ever propose something that actually fits.",
      questions: [
        q("servicePreference", "radio", "How would you want to work with Premium Leads?", {
          hint: "From hands-on to fully handled.",
          required: true,
          system: true,
          lockedValues: true,
          options: SERVICE_PREFERENCE_CHOICES.map((c) => ({ ...c })),
        }),
        q("marketingBudget", "radio", "What's your current monthly marketing / lead-gen budget?", {
          hint: "A range is fine — it keeps our recommendations realistic.",
          required: true,
          columns: 2,
          system: true,
          lockedValues: true,
          pinInTable: true,
          options: MARKETING_BUDGET_CHOICES.map((c) => ({ ...c })),
        }),
        q("anythingElse", "textarea", "Anything else we should know?", {
          placeholder: "Whatever would help us serve you well.",
        }),
      ],
    },
  ],
};

/* ----------------------------------------------------------------- types -- */

/** A stored submission's answers: the contract fields plus whatever else the
 * active definition (and the door section) asked. */
export type PrequalAnswers = FormAnswers & {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  clientType: string;
  servicePreference: string;
  marketingBudget: string;
  /** Kept in the vocabulary for parity with The Authority Desk; PL never sells. */
  orderRef: string;
  /** The landing page (door) this prospect came through. */
  variantSlug: string;
};

/** Sync state of one submission's relay to The Authority Desk (and, through it, Brand Voice). */
export type AuthorityDeskSync = {
  /** AD's contact id for this person, once the relay answered. */
  contactId: string | null;
  /** The Brand Voice Interview card id AD reported back (null until BVI has one). */
  intervieweeId: string | null;
  /** The interview booking link AD returned (shown to paid clients only). */
  bookingUrl: string | null;
  /** Null until the first delivery succeeds. */
  syncedAt: string | null;
  /** Last failure, kept so the admin can see why and retry. */
  error: string | null;
  /** Consecutive failed attempts since the last success. */
  attempts: number;
  /** True when AD refused the row outright and retries stopped. */
  parked: boolean;
};

/**
 * A stored submission as returned by GET /api/admin/pre-qualifications:
 * identity columns extracted for the table view plus the full answer set.
 */
export type PrequalRecord = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  clientType: string;
  /** The door (landing page variant) that sent them here. */
  variantSlug: string | null;
  /** Where the routing rules sent this person. */
  routingDestination: RouteDestination | null;
  /** The person's row in the contacts CRM. */
  contactId: number | null;
  answers: PrequalAnswers;
  /** ISO timestamp of when the submission was received. */
  createdAt: string;
  /** Relay state (PL → AD → BVI). */
  authorityDesk: AuthorityDeskSync;
};
