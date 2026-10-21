/**
 * Get started (pre-qualification) submission storage. Adapted from The
 * Authority Desk's server/prequalification.ts: identity columns extracted for
 * querying and display, plus the full validated answer set as JSONB, because
 * the form is admin-defined and an old row must stay readable regardless.
 *
 * Delivery to The Authority Desk is the outbox's job (server/authorityDesk.ts);
 * the relay's answer is stamped back onto the row here so the Leads panel can
 * show the AD / BVI badges without joining the outbox.
 */
import { query } from "./db";
import type { PrequalAnswers, PrequalRecord } from "../shared/prequalificationSchema";
import type { RouteDestination } from "../shared/routingSchema";
import { upsertContactForSubmission } from "./contacts";

export type SubmissionRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  client_type: string;
  variant_slug: string | null;
  answers: PrequalAnswers;
  routing_destination: string | null;
  contact_id: string | null;
  ad_contact_id: string | null;
  bvi_interviewee_id: string | null;
  bvi_booking_url: string | null;
  ad_synced_at: Date | null;
  ad_sync_error: string | null;
  ad_sync_attempts: number | null;
  ad_parked: boolean | null;
  created_at: Date;
};

export const PREQUAL_COLUMNS =
  "id, full_name, email, phone, company, client_type, variant_slug, answers, routing_destination, contact_id, " +
  "ad_contact_id, bvi_interviewee_id, bvi_booking_url, ad_synced_at, ad_sync_error, ad_sync_attempts, ad_parked, created_at";

const DESTINATIONS = new Set(["packages", "book", "nurture"]);

export function rowToRecord(row: SubmissionRow): PrequalRecord {
  return {
    id: Number(row.id),
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    clientType: row.client_type,
    variantSlug: row.variant_slug,
    routingDestination:
      row.routing_destination && DESTINATIONS.has(row.routing_destination) ? (row.routing_destination as RouteDestination) : null,
    contactId: row.contact_id ? Number(row.contact_id) : null,
    answers: row.answers,
    createdAt: row.created_at.toISOString(),
    authorityDesk: {
      contactId: row.ad_contact_id ?? null,
      intervieweeId: row.bvi_interviewee_id ?? null,
      bookingUrl: row.bvi_booking_url ?? null,
      syncedAt: row.ad_synced_at ? row.ad_synced_at.toISOString() : null,
      error: row.ad_sync_error ?? null,
      attempts: Number(row.ad_sync_attempts ?? 0),
      parked: row.ad_parked === true,
    },
  };
}

/** Reads an answer as a string, whatever the question type produced. */
function text(answers: PrequalAnswers, key: string): string {
  const value = answers[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(" · ");
  return "";
}

/**
 * Stores a validated submission, records the person in the CRM and returns
 * the record. The CRM write never fails the submission: the row is already
 * stored.
 */
export async function recordPrequalSubmission(answers: PrequalAnswers, destination: RouteDestination | null): Promise<PrequalRecord> {
  const email = text(answers, "email").trim().toLowerCase();
  const stored = { ...answers, email };
  const r = await query<SubmissionRow>(
    `INSERT INTO prequalification_submissions
       (full_name, email, phone, company, client_type, variant_slug, answers, routing_destination)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
     RETURNING ${PREQUAL_COLUMNS}`,
    [text(answers, "fullName"), email, text(answers, "phone"), text(answers, "company"), text(answers, "clientType"), text(answers, "variantSlug") || null, JSON.stringify(stored), destination],
  );
  let record = rowToRecord(r.rows[0]);
  try {
    const contactId = await upsertContactForSubmission(record);
    record = { ...record, contactId };
  } catch (err) {
    console.error(`[contacts] could not record submission ${record.id}`, err);
  }
  return record;
}

/** Most recent submissions, newest first (for the admin panel). */
export async function listPrequalSubmissions(limit: number): Promise<PrequalRecord[]> {
  const r = await query<SubmissionRow>(
    `SELECT ${PREQUAL_COLUMNS} FROM prequalification_submissions ORDER BY created_at DESC, id DESC LIMIT $1`,
    [limit],
  );
  return r.rows.map(rowToRecord);
}

/** Every submission one contact has made, newest first (the contact view). */
export async function listSubmissionsForContact(contactId: number): Promise<PrequalRecord[]> {
  const r = await query<SubmissionRow>(
    `SELECT ${PREQUAL_COLUMNS} FROM prequalification_submissions WHERE contact_id = $1 ORDER BY created_at DESC, id DESC LIMIT 50`,
    [contactId],
  );
  return r.rows.map(rowToRecord);
}

export async function loadSubmission(id: number): Promise<PrequalRecord | null> {
  const r = await query<SubmissionRow>(`SELECT ${PREQUAL_COLUMNS} FROM prequalification_submissions WHERE id = $1`, [id]);
  return r.rows[0] ? rowToRecord(r.rows[0]) : null;
}

/** What The Authority Desk answered to our lead.created, stamped on the row. */
export async function recordRelaySuccess(submissionId: number, result: { contactId: string | null; intervieweeId: string | null; bookingUrl: string | null }): Promise<void> {
  await query(
    `UPDATE prequalification_submissions
        SET ad_contact_id = COALESCE($2, ad_contact_id),
            bvi_interviewee_id = COALESCE($3, bvi_interviewee_id),
            bvi_booking_url = COALESCE($4, bvi_booking_url),
            ad_synced_at = now(), ad_sync_error = NULL, ad_parked = FALSE
      WHERE id = $1`,
    [submissionId, result.contactId, result.intervieweeId, result.bookingUrl],
  );
}

export async function recordRelayFailure(submissionId: number, message: string, parked: boolean): Promise<void> {
  await query(
    `UPDATE prequalification_submissions
        SET ad_sync_error = $2, ad_sync_attempts = ad_sync_attempts + 1, ad_parked = $3
      WHERE id = $1`,
    [submissionId, message.slice(0, 500), parked],
  );
}

/**
 * Returning-client shortcut: the shared answers we already hold for an email,
 * from the newest local submission. Only the fields the person is asked to
 * confirm are returned — never the phone number (see STATUS.md).
 */
export async function localPrefillForEmail(email: string): Promise<{ servicePreference: string; marketingBudget: string; clientType: string; company: string; intervieweeId: string | null } | null> {
  const key = email.trim().toLowerCase();
  if (!key) return null;
  const r = await query<{ answers: PrequalAnswers; bvi_interviewee_id: string | null }>(
    `SELECT answers, bvi_interviewee_id FROM prequalification_submissions WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
    [key],
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    servicePreference: text(row.answers, "servicePreference"),
    marketingBudget: text(row.answers, "marketingBudget"),
    clientType: text(row.answers, "clientType"),
    company: text(row.answers, "company"),
    intervieweeId: row.bvi_interviewee_id,
  };
}

/** Lead counts for the overview tiles. */
export async function submissionCounts(): Promise<{ total: number; last7: number }> {
  const r = await query<{ total: string; last7: string }>(
    `SELECT count(*) AS total, count(*) FILTER (WHERE created_at > now() - interval '7 days') AS last7 FROM prequalification_submissions`,
  );
  return { total: Number(r.rows[0].total), last7: Number(r.rows[0].last7) };
}
