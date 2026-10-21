/**
 * The leads CRM: one person, whichever front door they came through, with a
 * timeline of everything that happened to them here, in The Authority Desk
 * and in the Brand Voice Interview. Shared by the server (which stores it) and
 * the admin Leads panel (which shows it).
 *
 * Copied from The Authority Desk's shared/contactsSchema.ts and adapted:
 * sources gain Premium Leads' own doors, and the incoming event schema is the
 * one The Authority Desk relays (its own events plus the Brand Voice ones it
 * fans out). The status vocabulary and `deriveContactStatus` are unchanged, so
 * the same person shows the same status in all three admins.
 */
import { z } from "zod";

/** Where a person first came from. */
export const CONTACT_SOURCES = [
  "pl_form",
  "pl_contact_form",
  "smart_scheduler",
  "authority_desk",
  "ad_form",
  "bvi_form",
  "bvi_staff",
  "bvi_import",
  "voice_agent",
  "thrivecart",
  "brand_voice",
] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  pl_form: "Premium Leads form",
  pl_contact_form: "Premium Leads contact form",
  smart_scheduler: "Booked a call",
  authority_desk: "The Authority Desk",
  ad_form: "Authority Desk form",
  bvi_form: "Brand Voice form",
  bvi_staff: "Added in Brand Voice",
  bvi_import: "Imported from Brand Voice",
  voice_agent: "Voice agent",
  thrivecart: "ThriveCart purchase",
  brand_voice: "Brand Voice",
};

/** Maps the `via` / `source` a relayed lead.created event carries to a source. */
export function sourceFromEventVia(via: unknown, origin: unknown): ContactSource {
  switch (via) {
    case "intake_form":
      return "bvi_form";
    case "staff":
      return "bvi_staff";
    case "import":
      return "bvi_import";
    case "voice_agent":
      return "voice_agent";
    case "thrivecart":
      return "thrivecart";
    case "ad_form":
      return "ad_form";
    default:
      return origin === "brand_voice" || origin === "bvi" ? "brand_voice" : "authority_desk";
  }
}

/** Where a person stands, furthest milestone first. */
export const CONTACT_STATUSES = [
  "deleted",
  "archived",
  "refunded",
  "blueprint_delivered",
  "interview_complete",
  "interview_scheduled",
  "paid",
  "call_booked",
  "nurture",
  "qualified",
  "lead",
] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  deleted: "Deleted in Brand Voice",
  archived: "Archived",
  refunded: "Refunded",
  blueprint_delivered: "Blueprint delivered",
  interview_complete: "Interview done",
  interview_scheduled: "Interview booked",
  paid: "Paid",
  call_booked: "Call booked",
  nurture: "Not ready yet",
  qualified: "Pre-qualified",
  lead: "Lead",
};

/** The milestone fields a status is derived from. */
export type ContactMilestones = {
  deletedAt: string | null;
  archivedAt: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  blueprintDeliveredAt: string | null;
  interviewCompletedAt: string | null;
  nextMeetingAt: string | null;
  callBookedAt: string | null;
  routingDestination: string | null;
  hasSubmission: boolean;
};

/**
 * The person's status, derived rather than stored, so events arriving out of
 * order can never leave it on a stale value. A refund only counts while it is
 * newer than the payment (someone can pay again). Identical to The Authority
 * Desk's — keep it so.
 */
export function deriveContactStatus(m: ContactMilestones): ContactStatus {
  if (m.deletedAt) return "deleted";
  if (m.archivedAt) return "archived";
  if (m.refundedAt && (!m.paidAt || m.refundedAt >= m.paidAt)) return "refunded";
  if (m.blueprintDeliveredAt) return "blueprint_delivered";
  if (m.interviewCompletedAt) return "interview_complete";
  if (m.nextMeetingAt && m.paidAt) return "interview_scheduled";
  if (m.paidAt) return "paid";
  if (m.callBookedAt || m.nextMeetingAt) return "call_booked";
  if (m.routingDestination === "nurture") return "nurture";
  if (m.hasSubmission) return "qualified";
  return "lead";
}

/** Sync state the Leads panel shows as the AD / BVI badges. */
export type SyncBadge = "synced" | "pending" | "failed" | "parked" | "not_configured" | "none";

/** A contact as the admin sees it. */
export type ContactRecord = {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  company: string | null;
  source: ContactSource;
  status: ContactStatus;
  /** The Authority Desk's contact id for this person. */
  adContactId: string | null;
  /** The Brand Voice Interview card id (relayed through AD). */
  bviIntervieweeId: string | null;
  program: string | null;
  bviStage: string | null;
  advisorEmail: string | null;
  routingDestination: string | null;
  /** The door (landing page) they most recently came through. */
  variantSlug: string | null;
  callBookedAt: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  nextMeetingAt: string | null;
  nextMeetingType: string | null;
  blueprintDeliveredAt: string | null;
  archivedAt: string | null;
  submissionCount: number;
  lastEventAt: string;
  createdAt: string;
  /** Derived for the Leads panel badges. */
  sync: { authorityDesk: SyncBadge; brandVoice: SyncBadge };
};

/** One line on a contact's timeline. */
export type ContactEventRecord = {
  id: number;
  source: "pl" | "ad" | "bvi" | "ss";
  eventType: string;
  occurredAt: string;
  summary: string;
};

/* ------------------------------------------- incoming Authority Desk event */

/**
 * The body The Authority Desk POSTs to /api/integrations/authority-desk/events:
 * its own events and the Brand Voice Interview events it fans out (same shape
 * as AD's `brandVoiceEventSchema`, plus the AD contact id). Loose on purpose
 * beyond what this site needs: a new field or event type there must never turn
 * into a refused delivery here.
 */
export const partnerEventSchema = z.object({
  eventId: z.string().min(1).max(200),
  eventType: z.string().min(1).max(80),
  occurredAt: z.string().min(1).max(60),
  /** "authority_desk" | "brand_voice" — who the event is originally about. */
  source: z.string().optional(),
  person: z
    .object({
      intervieweeId: z.string().min(1).max(200).nullish(),
      adContactId: z.union([z.string(), z.number()]).nullish(),
      /** Our own key echoed back: "pl:<submissionId>". */
      externalRef: z.string().max(80).nullish(),
      email: z.string().max(320).nullish(),
      name: z.string().max(300).nullish(),
      phone: z.string().max(80).nullish(),
      company: z.string().max(300).nullish(),
      program: z.string().max(80).nullish(),
      stage: z.object({ id: z.union([z.number(), z.string()]), name: z.string() }).nullish(),
      advisorEmail: z.string().max(320).nullish(),
      interviewerEmail: z.string().max(320).nullish(),
      leadSource: z.string().max(200).nullish(),
      paid: z.boolean().nullish(),
      paidAt: z.string().nullish(),
      adRouting: z.string().nullish(),
      archived: z.boolean().nullish(),
    })
    .passthrough(),
  data: z.record(z.string(), z.unknown()).default({}),
});

export type PartnerEvent = z.infer<typeof partnerEventSchema>;
