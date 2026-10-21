import { describe, it, expect } from "vitest";
import { buildAnswersSchema, validateAnswers, allQuestions } from "../shared/formSchema";
import {
  DEFAULT_PREQUAL_FORM, assertContract, prequalFormSchema, SYSTEM_QUESTION_IDS,
  SERVICE_PREFERENCE_VALUES, MARKETING_BUDGET_VALUES, SERVICE_PREFERENCE_CHOICES, MARKETING_BUDGET_CHOICES,
} from "../shared/prequalificationSchema";
import { DEFAULT_DOOR_SECTIONS, formForDoor } from "../shared/doorSections";

const good = {
  fullName: "Jordan Avery",
  email: "Jordan@Example.com",
  phone: "(555) 123-4567",
  company: "Avery Logistics",
  roleTitle: "VP Sales",
  website: "https://example.com",
  clientType: "Sales leader",
  expertise: "We help logistics companies fill their pipeline.",
  goals: ["Book more qualified meetings"],
  readiness: "I'm ready to start now",
  servicePreference: "Done-for-you (DFY)",
  marketingBudget: "$1,500 - $5,000/month",
  anythingElse: "",
};

describe("locked Brand Voice Interview contract", () => {
  it("keeps the exact option values The Authority Desk uses", () => {
    expect(SERVICE_PREFERENCE_VALUES).toEqual(["Do-it-yourself (DIY)", "Done-with-you (DWY)", "Done-for-you (DFY)"]);
    expect(MARKETING_BUDGET_VALUES).toEqual(["No Budget", "$500 - $1,500/month", "$1,500 - $5,000/month", "$5,000 - $20,000/month"]);
    expect(SERVICE_PREFERENCE_CHOICES.map((c) => c.value)).toEqual([...SERVICE_PREFERENCE_VALUES]);
    expect(MARKETING_BUDGET_CHOICES.map((c) => c.value)).toEqual([...MARKETING_BUDGET_VALUES]);
  });

  it("keeps the seven system question ids in the default form", () => {
    const ids = allQuestions(DEFAULT_PREQUAL_FORM).map((q) => q.id);
    for (const id of SYSTEM_QUESTION_IDS) expect(ids).toContain(id);
    expect(SYSTEM_QUESTION_IDS).toEqual(["fullName", "email", "phone", "company", "clientType", "servicePreference", "marketingBudget"]);
  });

  it("validates the bundled form against the contract and re-stamps system flags", () => {
    const parsed = prequalFormSchema.safeParse(DEFAULT_PREQUAL_FORM);
    expect(parsed.success).toBe(true);
    const q = allQuestions(parsed.data!).find((x) => x.id === "marketingBudget")!;
    expect(q.system).toBe(true);
    expect(q.lockedValues).toBe(true);
    expect(q.required).toBe(true);
  });

  it("refuses an admin edit that rewords a locked value or drops a system question", () => {
    const reworded = structuredClone(DEFAULT_PREQUAL_FORM);
    const budget = allQuestions(reworded).find((q) => q.id === "marketingBudget")!;
    budget.options[0].value = "No budget yet";
    expect(prequalFormSchema.safeParse(reworded).success).toBe(false);

    const dropped = structuredClone(DEFAULT_PREQUAL_FORM);
    dropped.sections[0].questions = dropped.sections[0].questions.filter((q) => q.id !== "phone");
    const r = prequalFormSchema.safeParse(dropped);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain("phone");
  });

  it("allows relabelling a locked option", () => {
    const relabelled = structuredClone(DEFAULT_PREQUAL_FORM);
    const pref = allQuestions(relabelled).find((q) => q.id === "servicePreference")!;
    pref.options[0].label = "I'll drive (DIY)";
    expect(prequalFormSchema.safeParse(relabelled).success).toBe(true);
  });
});

describe("buildAnswersSchema on the Get started form", () => {
  it("accepts a complete submission and strips unknown keys", () => {
    const parsed = buildAnswersSchema(DEFAULT_PREQUAL_FORM).safeParse({ ...good, hp: "", junk: "x" });
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("junk");
    expect(parsed.data).not.toHaveProperty("hp");
    expect(parsed.data!.variantSlug).toBe("");
  });

  it("reports one message per missing required question", () => {
    const r = validateAnswers(DEFAULT_PREQUAL_FORM, { ...good, fullName: "", goals: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.fullName).toMatch(/Full name/);
      expect(r.errors.goals).toBeTruthy();
      expect(Object.keys(r.errors)).toHaveLength(2);
    }
  });

  it("rejects a bad email and an off-list option value", () => {
    const r = validateAnswers(DEFAULT_PREQUAL_FORM, { ...good, email: "not-an-email", servicePreference: "Done-for-me" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.email).toMatch(/valid email/);
      expect(r.errors.servicePreference).toBeTruthy();
    }
  });

  it("splices the door section in at position 2 and validates its answers", () => {
    const form = formForDoor(DEFAULT_PREQUAL_FORM, DEFAULT_DOOR_SECTIONS, "sales");
    expect(form.sections[2].id).toBe("door");
    expect(form.sections.map((s) => s.id)).toEqual(["contact", "profile", "door", "goals", "readiness", "fit"]);
    const missing = validateAnswers(form, good);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.teamSize).toBeTruthy();
    const ok = validateAnswers(form, { ...good, teamSize: "2–5", channelsToday: ["LinkedIn", "Email"], crm: "HubSpot" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.channelsToday).toEqual(["LinkedIn", "Email"]);
  });

  it("leaves the base form untouched for an unknown door", () => {
    const form = formForDoor(DEFAULT_PREQUAL_FORM, DEFAULT_DOOR_SECTIONS, "unknown-door");
    expect(form.sections).toHaveLength(5);
  });
});

describe("assertContract — the last line of defence", () => {
  it("passes a contract-conforming answer set", () => {
    expect(assertContract({ ...good, orderRef: "", variantSlug: "sales" })).toBeNull();
  });
  it("refuses off-contract working style or budget even if a definition let them through", () => {
    expect(assertContract({ ...good, servicePreference: "DIY" } as never)).toMatch(/Working style/);
    expect(assertContract({ ...good, marketingBudget: "$0" } as never)).toMatch(/budget/);
    expect(assertContract({ ...good, company: "   " } as never)).toMatch(/company/);
  });
});
