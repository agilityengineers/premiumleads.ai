/**
 * Events reported by The Authority Desk at
 * POST /api/integrations/authority-desk/events: AD's own updates (the contact
 * and Brand Voice ids it assigned, a payment, a booking) and every Brand Voice
 * Interview event it fans out (stage moves, interview, blueprint, archive,
 * delete). Each one updates the person's contact and adds a timeline line.
 *
 * Adapted from The Authority Desk's server/brandVoiceEvents.ts. Signature:
 * hex HMAC-SHA256 over `${X-Timestamp}.${raw body}` in `X-Signature`, with
 * the shared secret (the same one the relay signs with, or
 * AD_EVENTS_INBOUND_SECRET when a separate one is wanted). `eventId` is the
 * idempotency key. Status codes tell AD whether to retry:
 *   200 stored or duplicate · 400 not an event · 401 bad signature ·
 *   422 cannot be keyed · 503 no secret configured here
 */
import { query } from "./db";
import { getSecret } from "./secrets";
import { findOrCreateContact, recordContactEvent } from "./contacts";
import { partnerEventSchema, sourceFromEventVia, type PartnerEvent } from "../shared/contactsSchema";

export async function inboundSecret(): Promise<string> {
  const separate = (process.env.AD_EVENTS_INBOUND_SECRET || "").trim();
  return separate || (await getSecret("authorityDesk.secret"));
}

export function parsePartnerEvent(body: unknown): { ok: true; event: PartnerEvent } | { ok: false; error: string } {
  const parsed = partnerEventSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  if (Number.isNaN(new Date(parsed.data.occurredAt).getTime())) return { ok: false, error: "occurredAt: not a date" };
  return { ok: true, event: parsed.data };
}

/* ------------------------------------------------------------ summaries */

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

function when(iso: unknown): string {
  const d = typeof iso === "string" ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC"
    : "";
}

const VIA_PHRASES: Record<string, string> = {
  intake_form: "filled in the Brand Voice form",
  staff: "added by the Brand Voice team",
  voice_agent: "came in through the voice agent",
  thrivecart: "bought through ThriveCart",
  import: "imported from the Brand Voice pipeline",
  ad_form: "pre-qualified on The Authority Desk",
  premium_leads: "relayed from Premium Leads",
};

/** One readable line for the timeline. */
export function summarize(event: PartnerEvent): string {
  const d = event.data;
  const bvi = event.source === "brand_voice" || event.source === "bvi";
  const who = bvi ? "Brand Voice" : "The Authority Desk";
  const meeting = str(d.appointmentTypeName) ?? str(d.appointmentType) ?? "Meeting";
  switch (event.eventType) {
    case "lead.created":
      return `New lead in ${who}: ${VIA_PHRASES[String(d.via)] ?? "added to the pipeline"}`;
    case "lead.linked":
      return `Linked by The Authority Desk${event.person.intervieweeId ? " — Brand Voice card created" : ""}`;
    case "lead.updated":
      return `${who} updated the lead (${Array.isArray(d.changed) ? d.changed.join(", ") : "details"})`;
    case "lead.archived":
      return `Archived in ${who}`;
    case "lead.restored":
      return `Restored in ${who}`;
    case "lead.deleted":
      return `Deleted in ${who}`;
    case "stage.changed": {
      const to = (d.to as { name?: string } | null)?.name;
      const from = (d.from as { name?: string } | null)?.name;
      return `Brand Voice stage: ${from ? `${from} → ` : ""}${to ?? "changed"}`;
    }
    case "call.booked":
      return `Strategy call booked for ${when(d.scheduledAt)}${str(d.hostEmail) ? ` with ${d.hostEmail}` : ""}`;
    case "payment.received":
      return `Paid${str(d.product) ? ` for ${d.product}` : ""}${str(d.orderId) ? ` (order ${d.orderId})` : ""}`;
    case "payment.reversed":
      return `Payment reversed${str(d.orderId) ? ` (order ${d.orderId})` : ""}`;
    case "interview.scheduled":
      return `${meeting} booked for ${when(d.scheduledAt)}${str(d.hostEmail) ? ` with ${d.hostEmail}` : ""}`;
    case "interview.updated":
      return `${meeting} changed: now ${when(d.scheduledAt)}`;
    case "interview.cancelled":
      return `${meeting} cancelled`;
    case "interview.completed":
      return `${meeting} completed`;
    case "blueprint.delivered": {
      const how: Record<string, string> = {
        document: "blueprint document uploaded",
        stage: "card moved to the blueprint stage",
        call_completed: "blueprint call completed",
      };
      return `Blueprint delivered (${how[String(d.trigger)] ?? "Brand Voice"})`;
    }
    default:
      return `${who}: ${event.eventType}`;
  }
}

/* ---------------------------------------------------------------- applying */

const INTERVIEW_TYPES = new Set(["brand-voice-interview", "brand_voice_interview"]);
const CALL_TYPES = new Set(["pre-qualification", "strategy-call", "strategy_session", "premiumleads-discovery"]);

/**
 * Apply one event. Order of work: a duplicate check, then the contact
 * updates (written to be repeatable), then the timeline row — so a retry
 * after a half-failure re-applies cleanly.
 */
export async function applyPartnerEvent(event: PartnerEvent): Promise<{ outcome: "stored" | "duplicate"; contactId: number } | { outcome: "unkeyable" }> {
  const source = event.source === "brand_voice" || event.source === "bvi" ? "bvi" : "ad";
  const dup = await query<{ contact_id: string }>(`SELECT contact_id FROM contact_events WHERE source = $1 AND event_id = $2`, [source, event.eventId]);
  if (dup.rows[0]) return { outcome: "duplicate", contactId: Number(dup.rows[0].contact_id) };

  const person = event.person;
  const adContactId = person.adContactId == null ? null : String(person.adContactId);
  const contactSource = sourceFromEventVia(event.eventType === "lead.created" ? event.data.via : undefined, event.source);
  const found = await findOrCreateContact({ ...person, adContactId }, contactSource);
  if (!found) return { outcome: "unkeyable" };
  const contactId = found.id;
  const at = new Date(event.occurredAt);

  // Ids the partner assigned: adopt whatever we lack. Never move a BVI id
  // another contact already holds.
  await query(
    `UPDATE contacts
        SET ad_contact_id = COALESCE(ad_contact_id, $2),
            bvi_interviewee_id = CASE
              WHEN $3::text IS NULL OR bvi_interviewee_id IS NOT NULL THEN bvi_interviewee_id
              WHEN EXISTS (SELECT 1 FROM contacts o WHERE o.bvi_interviewee_id = $3 AND o.id <> $1) THEN bvi_interviewee_id
              ELSE $3 END,
            updated_at = now()
      WHERE id = $1`,
    [contactId, adContactId, person.intervieweeId ?? null],
  );
  // And on the submission the event names, so the Leads row shows it.
  const ref = person.externalRef?.match(/^pl:(\d+)$/);
  if (ref) {
    await query(
      `UPDATE prequalification_submissions
          SET ad_contact_id = COALESCE(ad_contact_id, $2), bvi_interviewee_id = COALESCE(bvi_interviewee_id, $3),
              ad_synced_at = COALESCE(ad_synced_at, now())
        WHERE id = $1`,
      [Number(ref[1]), adContactId, person.intervieweeId ?? null],
    );
  }

  const linked = await query<{ bvi_interviewee_id: string | null }>(`SELECT bvi_interviewee_id FROM contacts WHERE id = $1`, [contactId]);
  const linkedId = linked.rows[0]?.bvi_interviewee_id ?? null;
  const otherCard = Boolean(person.intervieweeId) && linkedId !== null && linkedId !== person.intervieweeId;

  // The snapshot (stage, advisor, archived, program) describes the person at
  // the moment of the event: only a newer event may overwrite it, and only one
  // about the card this contact is linked to.
  await query(
    `UPDATE contacts
        SET program         = COALESCE($2, program),
            bvi_stage       = COALESCE($3, bvi_stage),
            advisor_email   = COALESCE($4, advisor_email),
            archived_at     = CASE WHEN $5 THEN COALESCE(archived_at, $6) WHEN $10 THEN NULL ELSE archived_at END,
            routing_destination = COALESCE(routing_destination, $7),
            paid_at         = CASE WHEN paid_at IS NULL AND $8::timestamptz IS NOT NULL THEN $8 ELSE paid_at END,
            snapshot_at     = $6,
            updated_at      = now()
      WHERE id = $1 AND (snapshot_at IS NULL OR snapshot_at <= $6)
        AND (bvi_interviewee_id IS NULL OR $9::text IS NULL OR bvi_interviewee_id = $9)`,
    [
      contactId,
      person.program ?? null,
      person.stage?.name ?? null,
      person.advisorEmail ?? null,
      person.archived === true,
      at,
      person.adRouting ?? null,
      person.paid && person.paidAt ? new Date(person.paidAt) : null,
      person.intervieweeId ?? null,
      person.archived === false,
    ],
  );

  const d = event.data;
  const appointmentType = str(d.appointmentType);
  switch (event.eventType) {
    case "payment.received":
      await query(
        `UPDATE contacts SET paid_at = CASE WHEN paid_at IS NULL OR (refunded_at IS NOT NULL AND refunded_at >= paid_at) THEN $2 ELSE paid_at END WHERE id = $1`,
        [contactId, at],
      );
      break;
    case "payment.reversed":
      await query(`UPDATE contacts SET refunded_at = GREATEST(COALESCE(refunded_at, $2), $2) WHERE id = $1`, [contactId, at]);
      break;
    case "call.booked":
      await query(
        `UPDATE contacts SET call_booked_at = COALESCE(call_booked_at, $2), next_meeting_at = COALESCE($3, next_meeting_at),
                next_meeting_type = COALESCE($4, next_meeting_type), next_meeting_id = COALESCE($5, next_meeting_id) WHERE id = $1`,
        [contactId, at, str(d.scheduledAt) ? new Date(String(d.scheduledAt)) : null, str(d.appointmentTypeName) ?? appointmentType, str(d.appointmentId)],
      );
      break;
    case "interview.scheduled":
    case "interview.updated":
      if (str(d.scheduledAt)) {
        await query(
          `UPDATE contacts
              SET next_meeting_at = $2, next_meeting_type = $3, next_meeting_id = $4,
                  call_booked_at = CASE WHEN $5 THEN COALESCE(call_booked_at, $6) ELSE call_booked_at END
            WHERE id = $1`,
          [contactId, new Date(String(d.scheduledAt)), str(d.appointmentTypeName) ?? appointmentType, str(d.appointmentId), appointmentType !== null && CALL_TYPES.has(appointmentType), at],
        );
      }
      break;
    case "interview.cancelled":
      await query(
        `UPDATE contacts SET next_meeting_at = NULL, next_meeting_type = NULL, next_meeting_id = NULL WHERE id = $1 AND next_meeting_id IS NOT DISTINCT FROM $2`,
        [contactId, str(d.appointmentId)],
      );
      break;
    case "interview.completed":
      await query(
        `UPDATE contacts
            SET interview_completed_at = CASE WHEN $3 THEN COALESCE(interview_completed_at, $2) ELSE interview_completed_at END,
                next_meeting_at   = CASE WHEN next_meeting_id IS NOT DISTINCT FROM $4 THEN NULL ELSE next_meeting_at END,
                next_meeting_type = CASE WHEN next_meeting_id IS NOT DISTINCT FROM $4 THEN NULL ELSE next_meeting_type END,
                next_meeting_id   = CASE WHEN next_meeting_id IS NOT DISTINCT FROM $4 THEN NULL ELSE next_meeting_id END
          WHERE id = $1`,
        [contactId, at, appointmentType === null || INTERVIEW_TYPES.has(appointmentType), str(d.appointmentId)],
      );
      break;
    case "blueprint.delivered":
      await query(`UPDATE contacts SET blueprint_delivered_at = COALESCE(blueprint_delivered_at, $2) WHERE id = $1`, [contactId, at]);
      break;
    case "lead.deleted":
      await query(`UPDATE contacts SET deleted_at = COALESCE(deleted_at, $2) WHERE id = $1 AND bvi_interviewee_id IS NOT DISTINCT FROM $3`, [contactId, at, person.intervieweeId ?? null]);
      break;
    default:
      break;
  }

  const stored = await recordContactEvent({
    contactId,
    source,
    eventType: event.eventType,
    eventId: event.eventId,
    occurredAt: at,
    summary: otherCard ? `${summarize(event)} (another Brand Voice card for this email)` : summarize(event),
    payload: { person, data: event.data },
  });
  return { outcome: stored ? "stored" : "duplicate", contactId };
}
