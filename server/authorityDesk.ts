/**
 * The relay to The Authority Desk — the ONE path a Premium Leads lead takes
 * into the other apps (HANDOFF-intake.md §2). PL never calls the Brand Voice
 * Interview: it POSTs one signed `lead.created` to AD, AD upserts the contact
 * by email and relays to BVI, and answers `{ contactId, intervieweeId,
 * bookingUrl }`. Later changes (a call booked) go as `lead.updated`.
 *
 * Delivery is at-least-once and never blocking: the event is written to
 * `integration_outbox` in the same request as the submission, and a worker
 * POSTs it with retry and backoff (2, 4, 8 … minutes, capped at 6 hours). A
 * 400/404/409/422 means AD refused this particular row, so it is parked until
 * an admin presses Retry; everything else is retried. Rows are claimed with
 * `FOR UPDATE SKIP LOCKED`, so autoscaled instances never send one twice.
 *
 * Signature: `X-Timestamp` + `X-Signature` = hex HMAC-SHA256 over
 * `${timestamp}.${body}` with the shared secret — the same scheme AD's Brand
 * Voice feed uses, so AD can verify it with the code it already has.
 */
import crypto from "node:crypto";
import { query } from "./db";
import { readSetting } from "./settings";
import { getSecret } from "./secrets";
import { signPayload, signedHeaders } from "./signing";
import { recordRelayFailure, recordRelaySuccess, type SubmissionRow } from "./prequalification";
import { linkContactToPartner, recordContactEvent } from "./contacts";
import type { PrequalRecord } from "../shared/prequalificationSchema";

const SYNC_TIMEOUT_MS = 8_000;
const WORKER_INTERVAL_MS = 60_000;
const SWEEP_BATCH = 25;
const LEASE = "2 minutes";
const MAX_BACKOFF_MINUTES = 6 * 60;
const MAX_AGE_DAYS = 14;

export type RelayConfig = { eventsUrl: string; secret: string; contactsUrl: string };

export async function relayConfig(): Promise<RelayConfig> {
  const intg = await readSetting("integrations");
  const ad = (intg.authorityDesk ?? {}) as Record<string, string | boolean>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    eventsUrl: str(ad.eventsUrl) || (process.env.AD_EVENTS_URL || "").trim(),
    secret: await getSecret("authorityDesk.secret"),
    contactsUrl: str(ad.contactsUrl) || (process.env.AD_CONTACTS_URL || "").trim(),
  };
}

/** Whether the relay is configured. Unset = feature off, not an error. */
export async function isRelayConfigured(): Promise<boolean> {
  const c = await relayConfig();
  return c.eventsUrl !== "" && c.secret !== "";
}

/** Our stable key for a submission everywhere ("pl:<id>"). */
export function externalRef(submissionId: number): string {
  return `pl:${submissionId}`;
}

/** The `lead.created` payload. Keep in step with AD's /api/integrations/premium-leads/events. */
export function buildLeadCreated(record: PrequalRecord, knownIntervieweeId: string | null): Record<string, unknown> {
  return {
    eventId: crypto.randomUUID(),
    eventType: "lead.created",
    occurredAt: record.createdAt,
    source: "premium_leads",
    externalRef: externalRef(record.id),
    submissionId: record.id,
    variantSlug: record.variantSlug,
    routingDestination: record.routingDestination,
    status: record.routingDestination === "nurture" ? "nurture" : "qualified",
    // Pass the Brand Voice id when the person is already known, so AD updates
    // the same card instead of making a second one.
    intervieweeId: knownIntervieweeId,
    contact: {
      name: record.fullName,
      // Email is the one identifier every app shares, so it travels lowercased.
      email: record.email.trim().toLowerCase(),
      phone: record.phone,
      company: record.company,
    },
    // Sent whole. AD stores it as-is, so adding a question here needs no change there.
    answers: record.answers,
  };
}

/** A `lead.updated` payload (e.g. a strategy call booked). */
export function buildLeadUpdated(input: {
  submissionId: number | null;
  contactId: number | null;
  email: string;
  intervieweeId: string | null;
  adContactId: string | null;
  changes: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    eventId: crypto.randomUUID(),
    eventType: "lead.updated",
    occurredAt: new Date().toISOString(),
    source: "premium_leads",
    externalRef: input.submissionId ? externalRef(input.submissionId) : input.contactId ? `pl:contact:${input.contactId}` : null,
    submissionId: input.submissionId,
    intervieweeId: input.intervieweeId,
    adContactId: input.adContactId,
    contact: { email: input.email.trim().toLowerCase() },
    ...input.changes,
  };
}

/** Writes an event to the outbox. The worker delivers it; `deliverNow` tries immediately. */
export async function enqueue(body: Record<string, unknown>, refs: { submissionId?: number | null; contactId?: number | null }): Promise<number> {
  const r = await query<{ id: string }>(
    `INSERT INTO integration_outbox (target, event_id, event_type, submission_id, contact_id, body)
     VALUES ('authority_desk', $1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING id`,
    [String(body.eventId), String(body.eventType), refs.submissionId ?? null, refs.contactId ?? null, JSON.stringify(body)],
  );
  return Number(r.rows[0]?.id ?? 0);
}

type OutboxRow = {
  id: string;
  event_id: string;
  event_type: string;
  submission_id: string | null;
  contact_id: string | null;
  body: Record<string, unknown>;
  attempts: number;
};

function isRetryable(status: number): boolean {
  return ![400, 404, 409, 422].includes(status);
}

export type RelayResponse = { contactId: string | null; intervieweeId: string | null; bookingUrl: string | null };

function parseResponse(data: unknown): RelayResponse {
  const d = (data ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (v == null || v === "" ? null : String(v));
  return { contactId: str(d.contactId), intervieweeId: str(d.intervieweeId), bookingUrl: str(d.bookingUrl) };
}

/** Deliver one outbox row. Returns true when AD acknowledged it. */
async function deliver(row: OutboxRow, config: RelayConfig): Promise<boolean> {
  const body = JSON.stringify(row.body);
  const submissionId = row.submission_id ? Number(row.submission_id) : null;
  try {
    const res = await fetch(config.eventsUrl, {
      method: "POST",
      headers: signedHeaders(config.secret, body),
      body,
      signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      await recordFailure(row, `HTTP ${res.status}: ${detail}`, res.status, isRetryable(res.status));
      return false;
    }
    const data = await res.json().catch(() => ({}));
    const parsed = parseResponse(data);
    await query(`UPDATE integration_outbox SET delivered_at = now(), last_error = NULL, last_status = $2, response = $3::jsonb, parked = FALSE WHERE id = $1`, [row.id, res.status, JSON.stringify(data ?? {})]);
    if (submissionId) {
      await recordRelaySuccess(submissionId, parsed);
      await linkContactToPartner(submissionId, { adContactId: parsed.contactId, intervieweeId: parsed.intervieweeId });
      const contactId = row.contact_id ? Number(row.contact_id) : null;
      if (contactId) {
        await recordContactEvent({
          contactId,
          source: "pl",
          eventType: `relay.${row.event_type}`,
          eventId: `pl:relay:${row.event_id}`,
          occurredAt: new Date(),
          summary:
            row.event_type === "lead.created"
              ? `Sent to The Authority Desk${parsed.intervieweeId ? " — Brand Voice card created" : parsed.contactId ? " — contact created" : ""}`
              : `Update sent to The Authority Desk (${row.event_type})`,
          payload: parsed,
        }).catch(() => undefined);
      }
    }
    console.log(`[authority-desk] delivered ${row.event_type} ${row.event_id}${submissionId ? ` for submission ${submissionId}` : ""}`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordFailure(row, message, null, true);
    return false;
  }
}

async function recordFailure(row: OutboxRow, message: string, status: number | null, retryable: boolean): Promise<void> {
  console.error(`[authority-desk] ${row.event_type} ${row.event_id} failed${retryable ? "" : " (parked)"}: ${message}`);
  try {
    await query(
      `UPDATE integration_outbox
          SET last_error = $2, last_status = $3, attempts = attempts + 1, parked = $4,
              next_attempt_at = CASE WHEN $4 THEN 'infinity'::timestamptz
                ELSE now() + make_interval(mins => LEAST(power(2, GREATEST(attempts + 1, 1))::int, $5)) END
        WHERE id = $1`,
      [row.id, message.slice(0, 500), status, !retryable, MAX_BACKOFF_MINUTES],
    );
    if (row.submission_id) await recordRelayFailure(Number(row.submission_id), message, !retryable);
  } catch (err) {
    console.error(`[authority-desk] could not record failure for ${row.id}`, err);
  }
}

/**
 * Re-deliver everything AD has not acknowledged. Rows are claimed with a short
 * lease before sending so two instances never send the same row at once.
 */
export async function deliverPending(): Promise<void> {
  const config = await relayConfig();
  if (!config.eventsUrl || !config.secret) return;
  try {
    const r = await query<OutboxRow>(
      `UPDATE integration_outbox
          SET next_attempt_at = now() + interval '${LEASE}'
        WHERE id IN (
          SELECT id FROM integration_outbox
           WHERE delivered_at IS NULL AND parked = FALSE
             AND next_attempt_at <= now()
             AND created_at > now() - ($1 || ' days')::interval
           ORDER BY created_at ASC
           LIMIT ${SWEEP_BATCH}
           FOR UPDATE SKIP LOCKED
        )
        RETURNING id, event_id, event_type, submission_id, contact_id, body, attempts`,
      [String(MAX_AGE_DAYS)],
    );
    for (const row of r.rows) await deliver(row, config);
  } catch (err) {
    console.error("[authority-desk] outbox sweep failed", err);
  }
}

/** Try one freshly enqueued event straight away (fire-and-forget from the request). */
export function deliverNow(outboxId: number): void {
  if (!outboxId) return;
  void (async () => {
    const config = await relayConfig();
    if (!config.eventsUrl || !config.secret) return;
    const r = await query<OutboxRow>(
      `UPDATE integration_outbox SET next_attempt_at = now() + interval '${LEASE}'
        WHERE id = $1 AND delivered_at IS NULL AND parked = FALSE
        RETURNING id, event_id, event_type, submission_id, contact_id, body, attempts`,
      [outboxId],
    );
    if (r.rows[0]) await deliver(r.rows[0], config);
  })().catch((err) => console.error("[authority-desk] immediate delivery failed", err));
}

/** Admin "Retry now": un-park and send every pending event for a submission. */
export async function retrySubmission(submissionId: number): Promise<{ attempted: number; delivered: number }> {
  const config = await relayConfig();
  if (!config.eventsUrl || !config.secret) throw new Error("The Authority Desk relay is not configured.");
  const r = await query<OutboxRow>(
    `UPDATE integration_outbox SET parked = FALSE, next_attempt_at = now() + interval '${LEASE}'
      WHERE submission_id = $1 AND delivered_at IS NULL
      RETURNING id, event_id, event_type, submission_id, contact_id, body, attempts`,
    [submissionId],
  );
  let delivered = 0;
  for (const row of r.rows) if (await deliver(row, config)) delivered += 1;
  return { attempted: r.rows.length, delivered };
}

/** Start the outbox worker. Fire-and-forget and unref'd. */
export function startRelayWorker(): void {
  void deliverPending();
  const timer = setInterval(() => void deliverPending(), WORKER_INTERVAL_MS);
  timer.unref?.();
}

/** Outbox health for the overview: pending, failed (parked) and delivered counts. */
export async function outboxStats(): Promise<{ pending: number; parked: number; delivered: number }> {
  const r = await query<{ pending: string; parked: string; delivered: string }>(
    `SELECT count(*) FILTER (WHERE delivered_at IS NULL AND parked = FALSE) AS pending,
            count(*) FILTER (WHERE parked) AS parked,
            count(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered
       FROM integration_outbox`,
  );
  return { pending: Number(r.rows[0].pending), parked: Number(r.rows[0].parked), delivered: Number(r.rows[0].delivered) };
}

/* ------------------------------------------------ returning-client lookup */

export type PartnerPrefill = {
  servicePreference?: string;
  marketingBudget?: string;
  clientType?: string;
  company?: string;
  intervieweeId?: string | null;
};

/**
 * Ask The Authority Desk whether it knows this email (from its own form or a
 * Brand Voice card). Signed GET: `X-Timestamp` + `X-Signature` over
 * `${timestamp}.email=<lowercased email>`. Any failure is "unknown", never an
 * error for the visitor.
 */
export async function lookupContactAtAuthorityDesk(email: string): Promise<PartnerPrefill | null> {
  const config = await relayConfig();
  if (!config.contactsUrl || !config.secret) return null;
  const key = email.trim().toLowerCase();
  const qs = `email=${encodeURIComponent(key)}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    const res = await fetch(`${config.contactsUrl}${config.contactsUrl.includes("?") ? "&" : "?"}${qs}`, {
      headers: { "X-Timestamp": timestamp, "X-Signature": signPayload(config.secret, timestamp, qs), Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const answers = (data.answers ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    const found = Boolean(data.contactId || data.intervieweeId || data.found);
    if (!found) return null;
    return {
      servicePreference: str(data.servicePreference) ?? str(answers.servicePreference),
      marketingBudget: str(data.marketingBudget) ?? str(answers.marketingBudget),
      clientType: str(data.clientType) ?? str(answers.clientType),
      company: str(data.company),
      intervieweeId: str(data.intervieweeId) ?? null,
    };
  } catch (err) {
    console.error("[authority-desk] contact lookup failed", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Test connection for the admin: a signed `ping`. */
export async function pingAuthorityDesk(): Promise<{ ok: boolean; detail: string }> {
  const config = await relayConfig();
  if (!config.eventsUrl || !config.secret) return { ok: false, detail: "Events endpoint or shared secret missing." };
  const body = JSON.stringify({ eventId: crypto.randomUUID(), eventType: "ping", occurredAt: new Date().toISOString(), source: "premium_leads" });
  try {
    const res = await fetch(config.eventsUrl, { method: "POST", headers: signedHeaders(config.secret, body), body, signal: AbortSignal.timeout(SYNC_TIMEOUT_MS) });
    return res.ok || res.status === 400 || res.status === 422
      ? { ok: true, detail: `Reached The Authority Desk (HTTP ${res.status}).` }
      : { ok: false, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

export type { SubmissionRow };
