/**
 * SmartScheduler → Premium Leads: `appointment.created` on the Strategy Call
 * link prefilled with `external_id=pl:<submissionId>` (HANDOFF-intake.md §3).
 * Marks the contact `call_booked` and relays a `lead.updated` to The
 * Authority Desk. PL is the only subscriber of that link — a pre-sale call
 * must never move a Brand Voice card.
 *
 * Signature: SmartScheduler's callback secret as HMAC-SHA256 hex over the raw
 * body in `X-Signature` (or `X-Smart-Scheduler-Signature`); the timestamped
 * form is accepted too. With no secret configured the webhook is accepted and
 * a warning is logged (see STATUS.md).
 */
import { z } from "zod";
import { query } from "./db";
import { getSecret } from "./secrets";
import { verifyBodySignature, verifySignature } from "./signing";
import { findOrCreateContact, markCallBooked, recordContactEvent } from "./contacts";
import { buildLeadUpdated, deliverNow, enqueue } from "./authorityDesk";

export const appointmentWebhookSchema = z.object({
  event: z.string().min(1).max(80),
  timestamp: z.string().optional(),
  data: z
    .object({
      appointmentId: z.union([z.string(), z.number()]).optional(),
      type: z.string().optional(),
      scheduledAt: z.string().optional(),
      duration: z.union([z.string(), z.number()]).optional(),
      status: z.string().optional(),
      client: z
        .object({
          externalId: z.string().nullish(),
          email: z.string().nullish(),
          name: z.string().nullish(),
          phone: z.string().nullish(),
        })
        .passthrough()
        .optional(),
      host: z.object({ email: z.string().nullish(), name: z.string().nullish() }).passthrough().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
});
export type AppointmentWebhook = z.infer<typeof appointmentWebhookSchema>;

export async function schedulerSecret(): Promise<string> {
  return getSecret("scheduler.webhookSecret");
}

export type SchedulerVerdict = "ok" | "unsigned-accepted" | "missing" | "mismatch";

export function verifySchedulerSignature(rawBody: Buffer | undefined, headers: { signature?: string; timestamp?: string }, secret: string): SchedulerVerdict {
  if (!secret) return "unsigned-accepted";
  if (!headers.signature || !rawBody) return "missing";
  if (headers.timestamp && verifySignature(rawBody, headers.timestamp, headers.signature, secret) === "ok") return "ok";
  return verifyBodySignature(rawBody, headers.signature, secret) ? "ok" : "mismatch";
}

/** Apply a booking. Returns what happened for the HTTP answer and the log. */
export async function applyAppointment(hook: AppointmentWebhook): Promise<{ outcome: "booked" | "ignored" | "duplicate" | "unkeyable"; contactId?: number }> {
  if (!/^appointment\.(created|rescheduled|updated)$/.test(hook.event)) return { outcome: "ignored" };
  const d = hook.data;
  const appointmentId = d.appointmentId == null ? null : String(d.appointmentId);
  const externalId = d.client?.externalId?.trim() || null;
  const email = d.client?.email?.trim() || null;
  const eventId = `ss:${appointmentId ?? `${email}:${d.scheduledAt ?? ""}`}:${hook.event}`;

  const dup = await query<{ id: string }>(`SELECT id FROM contact_events WHERE source = 'ss' AND event_id = $1`, [eventId]);
  if (dup.rows[0]) return { outcome: "duplicate" };

  const ref = externalId?.match(/^pl:(\d+)$/);
  let submissionId: number | null = ref ? Number(ref[1]) : null;
  let contactId: number | null = null;
  let intervieweeId: string | null = null;
  let adContactId: string | null = null;
  if (submissionId) {
    const s = await query<{ contact_id: string | null; email: string; bvi_interviewee_id: string | null; ad_contact_id: string | null }>(
      `SELECT contact_id, email, bvi_interviewee_id, ad_contact_id FROM prequalification_submissions WHERE id = $1`,
      [submissionId],
    );
    if (s.rows[0]) {
      contactId = s.rows[0].contact_id ? Number(s.rows[0].contact_id) : null;
      intervieweeId = s.rows[0].bvi_interviewee_id;
      adContactId = s.rows[0].ad_contact_id;
    } else {
      submissionId = null;
    }
  }
  if (!contactId) {
    // Call-first visitor (no form): they become a contact from the invitee.
    const found = await findOrCreateContact({ email, name: d.client?.name ?? null, phone: d.client?.phone ?? null }, "smart_scheduler");
    if (!found) return { outcome: "unkeyable" };
    contactId = found.id;
    const c = await query<{ bvi_interviewee_id: string | null; ad_contact_id: string | null; email: string }>(`SELECT bvi_interviewee_id, ad_contact_id, email FROM contacts WHERE id = $1`, [contactId]);
    intervieweeId = c.rows[0]?.bvi_interviewee_id ?? null;
    adContactId = c.rows[0]?.ad_contact_id ?? null;
  }
  const scheduledAt = d.scheduledAt && !Number.isNaN(new Date(d.scheduledAt).getTime()) ? new Date(d.scheduledAt) : null;
  await markCallBooked(contactId, { appointmentId, scheduledAt, type: d.type ?? "strategy_session" });
  const c = await query<{ email: string }>(`SELECT email FROM contacts WHERE id = $1`, [contactId]);
  const contactEmail = c.rows[0]?.email ?? email ?? "";

  await recordContactEvent({
    contactId,
    source: "ss",
    eventType: hook.event,
    eventId,
    occurredAt: hook.timestamp && !Number.isNaN(new Date(hook.timestamp).getTime()) ? hook.timestamp : new Date(),
    summary: `Strategy call booked${scheduledAt ? ` for ${scheduledAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC` : ""}${d.host?.email ? ` with ${d.host.email}` : ""}`,
    payload: hook,
  });

  // Relay to AD as lead.updated (never to BVI directly).
  try {
    const body = buildLeadUpdated({
      submissionId,
      contactId,
      email: contactEmail,
      intervieweeId,
      adContactId,
      changes: {
        status: "call_booked",
        callBookedAt: new Date().toISOString(),
        appointment: { id: appointmentId, type: d.type ?? null, scheduledAt: scheduledAt?.toISOString() ?? null, host: d.host ?? null },
        contact: { email: contactEmail.trim().toLowerCase(), name: d.client?.name ?? null },
      },
    });
    const id = await enqueue(body, { submissionId, contactId });
    deliverNow(id);
  } catch (err) {
    console.error("[smart-scheduler] could not enqueue lead.updated", err);
  }
  return { outcome: "booked", contactId };
}
