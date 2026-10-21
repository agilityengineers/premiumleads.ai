/**
 * Door-specific questions, inserted as section "02b" of the Get started form
 * for the landing page the prospect came through. Answers travel with the
 * submission as ordinary answer keys (see HANDOFF-intake.md §1), so the server
 * validates them with the same `buildAnswersSchema` as the rest of the form.
 *
 * From the design package's content.js `DOOR_SECTIONS`. Admin-editable as the
 * `doorSections` site setting; this is the bundled default.
 */
import { z } from "zod";
import {
  formSectionSchema,
  type FormQuestion,
  type FormSection,
  type QuestionType,
} from "./formSchema";

const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

function q(
  id: string,
  type: QuestionType,
  label: string,
  extra: Partial<Omit<FormQuestion, "id" | "type" | "label">> = {},
): FormQuestion {
  return { id, type, label, hint: "", placeholder: "", required: false, width: "full", columns: 1, options: [], ...extra };
}

/** The section id every door section uses, so the stepper can label it. */
export const DOOR_SECTION_ID = "door";

export const DEFAULT_DOOR_SECTIONS: Record<string, FormSection> = {
  sales: {
    id: DOOR_SECTION_ID, kicker: "02b · Your team", heading: "About your sales motion.", note: "",
    questions: [
      q("teamSize", "radio", "How many people do outbound today?", { required: true, columns: 2, options: opts(["Just me", "2–5", "6–20", "21–50", "50+"]) }),
      q("channelsToday", "checkbox", "Channels you use today", { columns: 2, options: opts(["LinkedIn", "Email", "Phone", "Video", "None yet"]) }),
      q("crm", "text", "CRM you use", { placeholder: "Salesforce, HubSpot, Pipedrive…", width: "half" }),
    ],
  },
  recruiting: {
    id: DOOR_SECTION_ID, kicker: "02b · Your hiring", heading: "About the roles you fill.", note: "",
    questions: [
      q("rolesPerQuarter", "radio", "Open roles in a typical quarter", { required: true, columns: 2, options: opts(["1–3", "4–10", "11–30", "30+"]) }),
      q("hiringModel", "checkbox", "Hiring model", { columns: 2, options: opts(["Remote", "Hybrid", "In-office", "Contract"]) }),
      q("ats", "text", "ATS / CRM you use", { placeholder: "Bullhorn, Greenhouse, Lever…", width: "half" }),
    ],
  },
  agency: {
    id: DOOR_SECTION_ID, kicker: "02b · Your agency", heading: "About the clients you serve.", note: "",
    questions: [
      q("clientCount", "radio", "Active clients", { required: true, columns: 2, options: opts(["1–5", "6–15", "16–40", "40+"]) }),
      q("offerType", "checkbox", "How you'd offer it", { columns: 2, options: opts(["AI SDR service", "Appointment setting", "Outbound retainer", "Add-on to existing retainers"]) }),
      q("whiteLabel", "radio", "Do you need white-label branding?", { options: opts(["Yes — our brand only", "Co-branded is fine", "Not important"]) }),
    ],
  },
  founders: {
    id: DOOR_SECTION_ID, kicker: "02b · Your business", heading: "About what you're building.", note: "",
    questions: [
      q("businessStage", "radio", "Stage", { required: true, columns: 2, options: opts(["Pre-revenue", "First customers", "Growing — I'm the sales team", "Growing — small team"]) }),
      q("dealSize", "radio", "Typical deal size", { columns: 2, options: opts(["Under $1k", "$1k – $10k", "$10k – $50k", "$50k+"]) }),
    ],
  },
  enterprise: {
    id: DOOR_SECTION_ID, kicker: "02b · Your organization", heading: "About your sales org.", note: "",
    questions: [
      q("repCount", "radio", "Reps who would use the platform", { required: true, columns: 2, options: opts(["10–25", "26–100", "101–500", "500+"]) }),
      q("crm", "radio", "CRM of record", { columns: 2, options: opts(["Salesforce", "HubSpot", "Pipedrive", "Other"]) }),
      q("requirements", "checkbox", "Requirements", { columns: 2, options: opts(["SSO", "Security review", "Data residency", "Pilot before rollout"]) }),
    ],
  },
};

/** The admin-editable map of door → section. Validated with the generic section rules. */
export const doorSectionsSchema = z.record(z.string().max(80), formSectionSchema);
export type DoorSections = z.infer<typeof doorSectionsSchema>;

/**
 * The full form a visitor through `door` sees: the base definition with the
 * door section spliced in after section 2 (index 2), exactly as the prototype
 * does. A door with no section gets the base form unchanged.
 */
export function formForDoor<T extends { sections: FormSection[] }>(
  base: T,
  doors: DoorSections,
  door: string | null | undefined,
): T {
  const section = door ? doors[door] : undefined;
  if (!section) return base;
  const sections = [...base.sections];
  sections.splice(Math.min(2, sections.length), 0, section);
  return { ...base, sections };
}
