/**
 * The leads CRM. A contact is a person, keyed by lowercased email, whichever
 * front door they came through. Adapted from The Authority Desk's
 * server/contacts.ts: this module is the only place that writes `contacts` and
 * `contact_events`, every write is idempotent, and none may fail its caller.
 */
import { query } from "./db";
import type { PrequalRecord } from "../shared/prequalificationSchema";
import {
  deriveContactStatus, type ContactEventRecord, type ContactRecord, type ContactSource, type SyncBadge,
} from "../shared/contactsSchema";

/** How a routing outcome reads on the timeline. */
const ROUTING_PHRASES: Record<string, string> = {
  packages: "sent to pricing",
  book: "asked for a call",
  nurture: "not ready yet",
};

/** The key a person is matched on everywhere: the email, trimmed and lowercased. */
export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

type ContactRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  ad_contact_id: string | null;
  bvi_interviewee_id: string | null;
  program: string | null;
  bvi_stage: string | null;
  advisor_email: string | null;
  routing_destination: string | null;
  variant_slug: string | null;
  call_booked_at: Date | null;
  paid_at: Date | null;
  refunded_at: Date | null;
  next_meeting_at: Date | null;
  next_meeting_type: string | null;
  interview_completed_at: Date | null;
  blueprint_delivered_at: Date | null;
  archived_at: Date | null;
  deleted_at: Date | null;
  last_event_at: Date;
  created_at: Date;
  submission_count: string | number;
  // newest submission's relay state + pinned answers
  s_id: string | null;
  s_ad_synced_at: Date | null;
  s_ad_sync_error: string | null;
  s_ad_parked: boolean | null;
  s_bvi_interviewee_id: string | null;
  s_routing_destination: string | null;
  s_client_type: string | null;
  s_marketing_budget: string | null;
  s_readiness: string | null;
  s_service_preference: string | null;
};

const CONTACT_COLUMNS = `
  c.id, c.email, c.full_name, c.phone, c.company, c.source, c.ad_contact_id, c.bvi_interviewee_id,
  c.program, c.bvi_stage, c.advisor_email, c.routing_destination, c.variant_slug, c.call_booked_at,
  c.paid_at, c.refunded_at, c.next_meeting_at, c.next_meeting_type,
  c.interview_completed_at, c.blueprint_delivered_at, c.archived_at, c.deleted_at,
  c.last_event_at, c.created_at,
  (SELECT count(*) FROM prequalification_submissions s WHERE s.contact_id = c.id) AS submission_count,
  s.id AS s_id, s.ad_synced_at AS s_ad_synced_at, s.ad_sync_error AS s_ad_sync_error, s.ad_parked AS s_ad_parked,
  s.bvi_interviewee_id AS s_bvi_interviewee_id, s.routing_destination AS s_routing_destination,
  s.client_type AS s_client_type, s.answers->>'marketingBudget' AS s_marketing_budget,
  s.answers->>'readiness' AS s_readiness, s.answers->>'servicePreference' AS s_service_preference`;

const CONTACT_FROM = `
  FROM contacts c
  LEFT JOIN LATERAL (
    SELECT id, ad_synced_at, ad_sync_error, ad_parked, bvi_interviewee_id, routing_destination, client_type, answers
      FROM prequalification_submissions ps
     WHERE ps.contact_id = c.id
     ORDER BY ps.created_at DESC, ps.id DESC
     LIMIT 1
  ) s ON TRUE`;

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

function syncBadges(row: ContactRow, relayConfigured: boolean): { authorityDesk: SyncBadge; brandVoice: SyncBadge } {
  const hasSubmission = Number(row.submission_count ?? 0) > 0;
  const ad: SyncBadge = row.ad_contact_id || row.s_ad_synced_at
    ? "synced"
    : !hasSubmission
      ? row.source === "authority_desk" || row.source.startsWith("bvi") || row.source === "brand_voice" ? "synced" : "none"
      : !relayConfigured
        ? "not_configured"
        : row.s_ad_parked
          ? "parked"
          : row.s_ad_sync_error
            ? "failed"
            : "pending";
  const bvi: SyncBadge = row.bvi_interviewee_id || row.s_bvi_interviewee_id ? "synced" : ad === "synced" ? "pending" : ad;
  return { authorityDesk: ad, brandVoice: bvi };
}

export function rowToContact(row: ContactRow, relayConfigured: boolean): ContactRecord {
  const submissionCount = Number(row.submission_count ?? 0);
  return {
    id: Number(row.id),
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    company: row.company,
    source: row.source as ContactSource,
    status: deriveContactStatus({
      deletedAt: iso(row.deleted_at),
      archivedAt: iso(row.archived_at),
      paidAt: iso(row.paid_at),
      refundedAt: iso(row.refunded_at),
      blueprintDeliveredAt: iso(row.blueprint_delivered_at),
      interviewCompletedAt: iso(row.interview_completed_at),
      nextMeetingAt: iso(row.next_meeting_at),
      callBookedAt: iso(row.call_booked_at),
      routingDestination: row.routing_destination,
      hasSubmission: submissionCount > 0,
    }),
    adContactId: row.ad_contact_id,
    bviIntervieweeId: row.bvi_interviewee_id ?? row.s_bvi_interviewee_id,
    program: row.program,
    bviStage: row.bvi_stage,
    advisorEmail: row.advisor_email,
    routingDestination: row.routing_destination,
    variantSlug: row.variant_slug,
    callBookedAt: iso(row.call_booked_at),
    paidAt: iso(row.paid_at),
    refundedAt: iso(row.refunded_at),
    nextMeetingAt: iso(row.next_meeting_at),
    nextMeetingType: row.next_meeting_type,
    blueprintDeliveredAt: iso(row.blueprint_delivered_at),
    archivedAt: iso(row.archived_at),
    submissionCount,
    lastEventAt: row.last_event_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    sync: syncBadges(row, relayConfigured),
    latest: row.s_id
      ? {
          submissionId: Number(row.s_id),
          clientType: row.s_client_type ?? "",
          marketingBudget: row.s_marketing_budget ?? "",
          readiness: row.s_readiness ?? "",
          servicePreference: row.s_service_preference ?? "",
          routingDestination: row.s_routing_destination,
        }
      : null,
  };
}

/* ------------------------------------------------------------------ events */

/**
 * Add one line to a contact's timeline. Returns false when the event was
 * already recorded (same source and event id), which is how a redelivered
 * partner event is recognised and ignored.
 */
export async function recordContactEvent(event: {
  contactId: number;
  source: "pl" | "ad" | "bvi" | "ss";
  eventType: string;
  eventId: string;
  occurredAt: string | Date;
  summary: string;
  payload?: unknown;
}): Promise<boolean> {
  const r = await query<{ id: string }>(
    `INSERT INTO contact_events (contact_id, source, event_type, event_id, occurred_at, summary, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (source, event_id) DO NOTHING
     RETURNING id`,
    [event.contactId, event.source, event.eventType, event.eventId, new Date(event.occurredAt), event.summary.slice(0, 500), JSON.stringify(event.payload ?? {})],
  );
  if (r.rows.length === 0) return false;
  await query(
    `UPDATE contacts SET last_event_at = GREATEST(last_event_at, $2), updated_at = now() WHERE id = $1`,
    [event.contactId, new Date(event.occurredAt)],
  );
  return true;
}

/* --------------------------------------------------- this site's own flow */

/**
 * Record a pre-qualification against its person: create the contact (or fill
 * in what an existing one lacks), link the submission, and start or extend
 * the timeline. Runs under a per-email advisory lock so two submissions for a
 * new person arriving together cannot create two contacts.
 */
export async function upsertContactForSubmission(record: PrequalRecord): Promise<number | null> {
  const key = emailKey(record.email);
  if (!key) return null;
  const r = await query<{ id: string }>(
    `WITH lock AS (SELECT pg_advisory_xact_lock(hashtext($1)))
     INSERT INTO contacts (email_key, email, full_name, phone, company, source, routing_destination, variant_slug)
     VALUES ($1, $2, $3, $4, $5, 'pl_form', $6, $7)
     ON CONFLICT (email_key) DO UPDATE
        SET full_name = COALESCE(NULLIF(contacts.full_name, ''), EXCLUDED.full_name),
            phone     = COALESCE(NULLIF(contacts.phone, ''), EXCLUDED.phone),
            company   = COALESCE(NULLIF(contacts.company, ''), EXCLUDED.company),
            routing_destination = COALESCE(EXCLUDED.routing_destination, contacts.routing_destination),
            variant_slug = COALESCE(EXCLUDED.variant_slug, contacts.variant_slug),
            updated_at = now()
     RETURNING id`,
    [key, record.email.trim(), record.fullName, record.phone, record.company, record.routingDestination, record.variantSlug],
  );
  const contactId = Number(r.rows[0].id);
  await query(`UPDATE prequalification_submissions SET contact_id = $2 WHERE id = $1`, [record.id, contactId]);
  const routing = record.routingDestination ? `, ${ROUTING_PHRASES[record.routingDestination] ?? record.routingDestination}` : "";
  await recordContactEvent({
    contactId,
    source: "pl",
    eventType: "form_submitted",
    eventId: `pl:sub:${record.id}`,
    occurredAt: record.createdAt,
    summary: `Pre-qualified on Premium Leads${routing}${record.variantSlug ? ` (via /${record.variantSlug})` : ""}`,
    payload: { submissionId: record.id, routingDestination: record.routingDestination, variantSlug: record.variantSlug },
  });
  return contactId;
}

/** A simple contact-form message (book-call mode): a lead without the form. */
export async function upsertContactForMessage(input: { name: string; email: string; phone: string; company: string; variantSlug: string | null; messageId: number; message: string }): Promise<number | null> {
  const key = emailKey(input.email);
  if (!key) return null;
  const r = await query<{ id: string }>(
    `WITH lock AS (SELECT pg_advisory_xact_lock(hashtext($1)))
     INSERT INTO contacts (email_key, email, full_name, phone, company, source, variant_slug)
     VALUES ($1, $2, $3, $4, $5, 'pl_contact_form', $6)
     ON CONFLICT (email_key) DO UPDATE
        SET full_name = COALESCE(NULLIF(contacts.full_name, ''), EXCLUDED.full_name),
            phone     = COALESCE(NULLIF(contacts.phone, ''), EXCLUDED.phone),
            company   = COALESCE(NULLIF(contacts.company, ''), EXCLUDED.company),
            updated_at = now()
     RETURNING id`,
    [key, input.email.trim(), input.name, input.phone || null, input.company || null, input.variantSlug],
  );
  const contactId = Number(r.rows[0].id);
  await query(`UPDATE contact_messages SET contact_id = $2 WHERE id = $1`, [input.messageId, contactId]);
  await recordContactEvent({
    contactId,
    source: "pl",
    eventType: "message_sent",
    eventId: `pl:msg:${input.messageId}`,
    occurredAt: new Date(),
    summary: `Sent a message via the contact form: “${input.message.slice(0, 120)}${input.message.length > 120 ? "…" : ""}”`,
    payload: { messageId: input.messageId },
  });
  return contactId;
}

/**
 * Remember The Authority Desk's ids for the person behind a submission, so
 * later events find the same contact. Never moves a BVI id another contact
 * already holds.
 */
export async function linkContactToPartner(submissionId: number, ids: { adContactId: string | null; intervieweeId: string | null }): Promise<void> {
  try {
    await query(
      `UPDATE contacts c
          SET ad_contact_id = COALESCE(c.ad_contact_id, $2),
              bvi_interviewee_id = CASE
                WHEN $3::text IS NULL THEN c.bvi_interviewee_id
                WHEN c.bvi_interviewee_id IS NOT NULL THEN c.bvi_interviewee_id
                WHEN EXISTS (SELECT 1 FROM contacts o WHERE o.bvi_interviewee_id = $3) THEN c.bvi_interviewee_id
                ELSE $3 END,
              updated_at = now()
         FROM prequalification_submissions s
        WHERE s.id = $1 AND c.id = s.contact_id`,
      [submissionId, ids.adContactId, ids.intervieweeId],
    );
  } catch (err) {
    console.error(`[contacts] could not link submission ${submissionId}`, err);
  }
}

/** A SmartScheduler booking landed on this person. */
export async function markCallBooked(contactId: number, appt: { appointmentId: string | null; scheduledAt: Date | null; type: string | null }): Promise<void> {
  await query(
    `UPDATE contacts
        SET call_booked_at = COALESCE(call_booked_at, now()),
            next_meeting_at = COALESCE($2, next_meeting_at),
            next_meeting_type = COALESCE($3, next_meeting_type),
            next_meeting_id = COALESCE($4, next_meeting_id),
            updated_at = now()
      WHERE id = $1`,
    [contactId, appt.scheduledAt, appt.type, appt.appointmentId],
  );
}

/* ----------------------------------------------- people reported by partners */

/**
 * The contact a partner event is about: by our own ref first, then by the
 * Brand Voice id, then AD's contact id, then by email; otherwise a new
 * contact. Returns null when the event carries no email and no known id.
 */
export async function findOrCreateContact(
  person: {
    externalRef?: string | null;
    intervieweeId?: string | null;
    adContactId?: string | null;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    company?: string | null;
  },
  source: ContactSource,
): Promise<{ id: number; created: boolean } | null> {
  const ref = person.externalRef?.match(/^pl:(\d+)$/);
  if (ref) {
    const r = await query<{ contact_id: string | null }>(`SELECT contact_id FROM prequalification_submissions WHERE id = $1`, [Number(ref[1])]);
    if (r.rows[0]?.contact_id) return { id: Number(r.rows[0].contact_id), created: false };
  }
  if (person.intervieweeId) {
    const byId = await query<{ id: string }>(`SELECT id FROM contacts WHERE bvi_interviewee_id = $1`, [person.intervieweeId]);
    if (byId.rows[0]) return { id: Number(byId.rows[0].id), created: false };
  }
  if (person.adContactId) {
    const byAd = await query<{ id: string }>(`SELECT id FROM contacts WHERE ad_contact_id = $1`, [person.adContactId]);
    if (byAd.rows[0]) return { id: Number(byAd.rows[0].id), created: false };
  }
  const email = (person.email ?? "").trim();
  if (!email) return null;
  const key = emailKey(email);
  const r = await query<{ id: string; created: boolean }>(
    `WITH lock AS (SELECT pg_advisory_xact_lock(hashtext($1)))
     INSERT INTO contacts (email_key, email, full_name, phone, company, source, bvi_interviewee_id, ad_contact_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (email_key) DO UPDATE
        SET bvi_interviewee_id = CASE WHEN contacts.bvi_interviewee_id IS NULL OR contacts.deleted_at IS NOT NULL
                                      THEN EXCLUDED.bvi_interviewee_id ELSE contacts.bvi_interviewee_id END,
            ad_contact_id = COALESCE(contacts.ad_contact_id, EXCLUDED.ad_contact_id),
            deleted_at = NULL,
            full_name = COALESCE(NULLIF(contacts.full_name, ''), EXCLUDED.full_name),
            phone     = COALESCE(NULLIF(contacts.phone, ''), EXCLUDED.phone),
            company   = COALESCE(NULLIF(contacts.company, ''), EXCLUDED.company),
            updated_at = now()
     RETURNING id, (xmax = 0) AS created`,
    [key, email, person.name ?? null, person.phone ?? null, person.company ?? null, source, person.intervieweeId ?? null, person.adContactId ?? null],
  );
  return { id: Number(r.rows[0].id), created: r.rows[0].created };
}

/* -------------------------------------------------------------- reading */

export async function listContacts(options: { limit: number; offset: number; q?: string; source?: string }, relayConfigured: boolean): Promise<{ contacts: ContactRecord[]; total: number }> {
  const where: string[] = ["TRUE"];
  const params: unknown[] = [];
  if (options.q?.trim()) {
    params.push(`%${options.q.trim().toLowerCase()}%`);
    where.push(`(c.email_key LIKE $${params.length} OR lower(coalesce(c.full_name,'')) LIKE $${params.length} OR lower(coalesce(c.company,'')) LIKE $${params.length})`);
  }
  if (options.source?.trim()) {
    params.push(options.source.trim());
    where.push(`c.source = $${params.length}`);
  }
  const whereSql = where.join(" AND ");
  const total = await query<{ n: string }>(`SELECT count(*) AS n FROM contacts c WHERE ${whereSql}`, params);
  params.push(options.limit, options.offset);
  const rows = await query<ContactRow>(
    `SELECT ${CONTACT_COLUMNS} ${CONTACT_FROM} WHERE ${whereSql}
      ORDER BY c.last_event_at DESC, c.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { contacts: rows.rows.map((r) => rowToContact(r, relayConfigured)), total: Number(total.rows[0].n) };
}

export async function getContact(id: number, relayConfigured: boolean): Promise<ContactRecord | null> {
  const r = await query<ContactRow>(`SELECT ${CONTACT_COLUMNS} ${CONTACT_FROM} WHERE c.id = $1`, [id]);
  return r.rows[0] ? rowToContact(r.rows[0], relayConfigured) : null;
}

export async function listContactEvents(contactId: number): Promise<ContactEventRecord[]> {
  const r = await query<{ id: string; source: ContactEventRecord["source"]; event_type: string; occurred_at: Date; summary: string }>(
    `SELECT id, source, event_type, occurred_at, summary
       FROM contact_events
      WHERE contact_id = $1
      ORDER BY occurred_at DESC, id DESC
      LIMIT 200`,
    [contactId],
  );
  return r.rows.map((row) => ({ id: Number(row.id), source: row.source, eventType: row.event_type, occurredAt: row.occurred_at.toISOString(), summary: row.summary }));
}

/** Counts for the overview tiles. */
export async function contactCounts(): Promise<{ total: number; last7: number }> {
  const r = await query<{ total: string; last7: string }>(
    `SELECT count(*) AS total, count(*) FILTER (WHERE created_at > now() - interval '7 days') AS last7 FROM contacts`,
  );
  return { total: Number(r.rows[0].total), last7: Number(r.rows[0].last7) };
}
