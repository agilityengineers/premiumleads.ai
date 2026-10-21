/**
 * Generic, admin-editable form definitions.
 *
 * A *definition* describes a form — its sections, its questions, and each
 * question's type/options — as plain JSON an admin can edit. A definition is
 * then turned into a runtime validator by `buildAnswersSchema`, which both the
 * server (request validation) and the client (inline field errors) call, so the
 * two can never drift: there is exactly one rule set, derived from the same
 * stored definition.
 *
 * Nothing here is specific to any one form. The pre-qualification form's rules
 * (which questions are mandatory, which option values are contractually locked)
 * live in `prequalificationSchema.ts`, layered on top of these primitives.
 */
import { z } from "zod";

/* ------------------------------------------------------------- questions -- */

/** The input controls an admin can choose from. */
export const QUESTION_TYPES = [
  "text",
  "textarea",
  "email",
  "tel",
  "url",
  "radio",
  "checkbox",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Types that present a fixed list of options (and therefore need one). */
export const OPTION_TYPES: readonly QuestionType[] = ["radio", "checkbox"];

export function isOptionType(type: QuestionType): boolean {
  return OPTION_TYPES.includes(type);
}

/**
 * Answer keys the form may never claim, because the submission payload already
 * uses them: `hp` is the bot honeypot, and the other two are attribution fields
 * filled from the query string rather than asked.
 */
export const RESERVED_ANSWER_KEYS: readonly string[] = [
  "hp",
  "orderRef",
  "variantSlug",
];

/**
 * One selectable choice. `value` is what gets stored (and, for the Brand Voice
 * Interview qualifiers, what the contract pins); `label` is what the visitor
 * reads. They are usually identical — the split exists so wording can change
 * without breaking anything downstream that keys on the value.
 */
export const formOptionSchema = z.object({
  value: z.string().trim().min(1, "An option needs a value.").max(200),
  label: z.string().trim().min(1, "An option needs a label.").max(300),
});

export type FormOption = z.infer<typeof formOptionSchema>;

export const formQuestionSchema = z.object({
  /**
   * The answer key. Also the DOM id and the column header in the admin table,
   * so it must be a plain identifier and stable once submissions exist.
   */
  id: z
    .string()
    .trim()
    .min(1, "A question needs an id.")
    .max(60)
    .regex(/^[a-z][A-Za-z0-9_]*$/, {
      error:
        'Question ids start with a lowercase letter and use only letters, digits and "_".',
    }),
  type: z.enum(QUESTION_TYPES),
  label: z.string().trim().min(1, "A question needs a label.").max(300),
  hint: z.string().trim().max(500).default(""),
  placeholder: z.string().trim().max(300).default(""),
  required: z.boolean().default(false),
  /** Layout: a half-width question shares its row on wide screens. */
  width: z.enum(["half", "full"]).default("full"),
  /** Option types only: render the choices in one or two columns. */
  columns: z.union([z.literal(1), z.literal(2)]).default(1),
  options: z.array(formOptionSchema).max(60).default([]),
  /** Structural question — cannot be deleted or retyped (set server-side). */
  system: z.boolean().optional(),
  /** Option values are contractually fixed; only labels may be edited. */
  lockedValues: z.boolean().optional(),
  /** Show this answer as its own column in the admin submissions table. */
  pinInTable: z.boolean().optional(),
});

export type FormQuestion = z.infer<typeof formQuestionSchema>;

/* -------------------------------------------------------------- sections -- */

export const formSectionSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z][A-Za-z0-9_-]*$/, {
      error: "Section ids use lowercase letters, digits, “-” and “_”.",
    }),
  /** Small label above the heading, e.g. "01 · Contact". */
  kicker: z.string().trim().max(120).default(""),
  heading: z.string().trim().min(1, "A section needs a heading.").max(200),
  note: z.string().trim().max(500).default(""),
  questions: z.array(formQuestionSchema).max(60),
});

export type FormSection = z.infer<typeof formSectionSchema>;

export const formDefinitionSchema = z.object({
  /** Bumped only if the shape changes in a way old rows can't satisfy. */
  version: z.literal(1),
  sections: z.array(formSectionSchema).min(1, "A form needs a section."),
});

export type FormDefinition = z.infer<typeof formDefinitionSchema>;

/** A submitted answer set: one entry per question id, plus attribution. */
export type FormAnswers = Record<string, string | string[]>;

/* --------------------------------------------------------------- helpers -- */

/** Every question, flattened in display order (also the error-scroll order). */
export function allQuestions(def: FormDefinition): FormQuestion[] {
  return def.sections.flatMap((section) => section.questions);
}

/** Finds a question by id anywhere in the definition. */
export function findQuestion(
  def: FormDefinition,
  id: string,
): FormQuestion | undefined {
  return allQuestions(def).find((q) => q.id === id);
}

/**
 * Structural checks every definition must pass, whoever saved it: unique,
 * non-reserved ids, and option lists that match their question type. Written as
 * a `superRefine` body so form-specific rules can be chained after it.
 */
export function checkDefinition(
  def: FormDefinition,
  ctx: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  def.sections.forEach((section, si) => {
    section.questions.forEach((question, qi) => {
      const path = ["sections", si, "questions", qi] as const;
      if (seen.has(question.id)) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "id"],
          message: `Two questions both use the id “${question.id}”.`,
        });
      }
      seen.add(question.id);

      if (RESERVED_ANSWER_KEYS.includes(question.id)) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "id"],
          message: `“${question.id}” is reserved — please pick another id.`,
        });
      }

      if (isOptionType(question.type)) {
        if (question.options.length === 0) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "options"],
            message: `“${question.label}” needs at least one option.`,
          });
        }
        const values = new Set<string>();
        question.options.forEach((option, oi) => {
          if (values.has(option.value)) {
            ctx.addIssue({
              code: "custom",
              path: [...path, "options", oi, "value"],
              message: `“${option.value}” is used twice in “${question.label}”.`,
            });
          }
          values.add(option.value);
        });
      } else if (question.options.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "options"],
          message: `A ${question.type} question can't have options.`,
        });
      }
    });
  });

  const sectionIds = new Set<string>();
  def.sections.forEach((section, si) => {
    if (sectionIds.has(section.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["sections", si, "id"],
        message: `Two sections both use the id “${section.id}”.`,
      });
    }
    sectionIds.add(section.id);
  });
}

/* ------------------------------------------------------------ validation -- */

const MAX_SHORT = 300;
const MAX_LONG = 4000;
const MAX_EMAIL = 320;

/** The validator for one question, derived from its type + required flag. */
function questionSchema(question: FormQuestion): z.ZodType {
  const { required, label } = question;
  const missing = `Please answer “${label}”.`;

  if (isOptionType(question.type)) {
    const values = question.options.map((o) => o.value);
    // Definition validation guarantees at least one option; the cast satisfies
    // zod's non-empty tuple requirement for enums.
    const allowed = z.enum(values as [string, ...string[]], {
      error: "Please choose one of the options.",
    });
    if (question.type === "checkbox") {
      const list = z.array(allowed);
      return required ? list.min(1, missing) : list.default([]);
    }
    return required ? allowed : allowed.or(z.literal("")).default("");
  }

  if (question.type === "email") {
    const email = z.string().trim().max(MAX_EMAIL).pipe(
      z.email("Please enter a valid email address."),
    );
    return required ? email : z.literal("").or(email).default("");
  }

  const max = question.type === "textarea" ? MAX_LONG : MAX_SHORT;
  const text = z.string().trim().max(max);
  return required ? text.min(1, missing) : text.default("");
}

/**
 * The runtime validator for a definition's answers. Server and client both call
 * this, so a value the form accepts is exactly a value the API accepts.
 *
 * Unknown keys are stripped (zod objects strip by default), which is what keeps
 * the honeypot field and any stale answers out of storage. The two attribution
 * fields are always appended — they're filled from the query string, never
 * asked, so no definition declares them.
 */
export function buildAnswersSchema(def: FormDefinition) {
  const shape: Record<string, z.ZodType> = {};
  for (const question of allQuestions(def)) {
    shape[question.id] = questionSchema(question);
  }
  shape.orderRef = z.string().trim().max(MAX_SHORT).default("");
  shape.variantSlug = z.string().trim().max(80).default("");
  return z.object(shape);
}

export type ValidationResult =
  | { ok: true; data: FormAnswers }
  | { ok: false; errors: Record<string, string> };

/**
 * Validates answers against a definition, returning one message per offending
 * question (keyed by question id) so the form can show errors inline. Same
 * schema the server enforces, so the messages match its rejection reasons.
 */
export function validateAnswers(
  def: FormDefinition,
  values: Record<string, unknown>,
): ValidationResult {
  const parsed = buildAnswersSchema(def).safeParse(values);
  if (parsed.success) return { ok: true, data: parsed.data as FormAnswers };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string" || key in errors) continue;
    errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** A blank answer set for a definition ("" for text, [] for checkboxes). */
export function emptyAnswers(def: FormDefinition): FormAnswers {
  const values: FormAnswers = {};
  for (const question of allQuestions(def)) {
    values[question.id] = question.type === "checkbox" ? [] : "";
  }
  return values;
}

/** Reads an answer as display text (checkbox arrays join with a separator). */
export function answerText(value: unknown): string {
  if (Array.isArray(value)) return value.join(" · ");
  if (typeof value === "string") return value;
  return "";
}
