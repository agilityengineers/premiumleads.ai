/**
 * Drizzle schema — the one description of the database. Migrations are
 * generated from it with `npm run db:generate` (drizzle-kit) into ./drizzle and
 * applied at boot by server/db.ts, so a fresh Replit database works on first
 * run and later changes layer on. Column comments say what each table is for;
 * the modules in server/ say how it is used.
 */
import {
  pgTable, text, boolean, integer, bigint, bigserial, serial, timestamp, jsonb, customType, index, uniqueIndex,
} from "drizzle-orm/pg-core";

/** Postgres bytea (drizzle has no built-in). Stored images survive the ephemeral container. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/* ------------------------------------------------------------------ users -- */

/** Admin users. Passwords are bcrypt hashes; roles gate panels and routes. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("advisor"),
  status: text("status").notNull().default("active"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  /** Sessions issued before this instant are invalid (a password change signs everyone out). */
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------------------------------------------- variants -- */

/**
 * Landing pages: one row per audience. `content` is the PARTIAL override the
 * admin saved (blank = inherit); the server resolves it over the bundled base.
 */
export const variants = pgTable(
  "variants",
  {
    slug: text("slug").primaryKey(),
    label: text("label").notNull(),
    audience: text("audience").notNull(),
    builtin: boolean("builtin").notNull().default(false),
    bookingUrl: text("booking_url"),
    ctaMode: text("cta_mode"),
    content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
    published: boolean("published").notNull().default(false),
    generatedBy: text("generated_by"),
    ogImage: bytea("og_image"),
    ogImageType: text("og_image_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("variants_published_idx").on(t.published)],
);

/* --------------------------------------------------------------- settings -- */

/** Admin-editable settings, one JSONB document per key (shared/settingsSchema.ts). */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Integration secrets, AES-256-GCM encrypted with SECRETS_KEY. Write-only from the admin. */
export const integrationSecrets = pgTable("integration_secrets", {
  /** "<integration>.<field>", e.g. "sendgrid.apiKey". */
  id: text("id").primaryKey(),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  tag: text("tag").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------- resources -- */

/** Complementary tools on /resources. The screenshot lives in the row (bytea). */
export const resources = pgTable("resources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull().default(""),
  category: text("category").notNull().default(""),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
  featured: boolean("featured").notNull().default(true),
  /** True from "Fetch & add" until the admin presses Save & publish; drafts are hidden publicly. */
  draft: boolean("draft").notNull().default(false),
  position: integer("position").notNull().default(0),
  snapshot: bytea("snapshot"),
  snapshotType: text("snapshot_type"),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------------------------------------------- contacts -- */

/**
 * The leads CRM: one row per PERSON, keyed by lowercased trimmed email,
 * whichever door they came through. Status is derived, never stored
 * (shared/contactsSchema.ts).
 */
export const contacts = pgTable(
  "contacts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    emailKey: text("email_key").notNull().unique(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    phone: text("phone"),
    company: text("company"),
    source: text("source").notNull(),
    adContactId: text("ad_contact_id"),
    bviIntervieweeId: text("bvi_interviewee_id").unique(),
    program: text("program"),
    bviStage: text("bvi_stage"),
    advisorEmail: text("advisor_email"),
    routingDestination: text("routing_destination"),
    variantSlug: text("variant_slug"),
    callBookedAt: timestamp("call_booked_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    nextMeetingAt: timestamp("next_meeting_at", { withTimezone: true }),
    nextMeetingType: text("next_meeting_type"),
    nextMeetingId: text("next_meeting_id"),
    interviewCompletedAt: timestamp("interview_completed_at", { withTimezone: true }),
    blueprintDeliveredAt: timestamp("blueprint_delivered_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true }),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contacts_last_event_idx").on(t.lastEventAt)],
);

/** The per-person timeline; also the idempotency store for incoming events. */
export const contactEvents = pgTable(
  "contact_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    contactId: bigint("contact_id", { mode: "number" }).notNull().references(() => contacts.id, { onDelete: "cascade" }),
    /** pl | ad | bvi | ss */
    source: text("source").notNull(),
    eventType: text("event_type").notNull(),
    eventId: text("event_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    summary: text("summary").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull().default({}),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("contact_events_source_event_idx").on(t.source, t.eventId),
    index("contact_events_contact_idx").on(t.contactId, t.occurredAt),
  ],
);

/* ------------------------------------------------------------ submissions -- */

/** Get started form submissions: identity columns + the full validated answers. */
export const prequalificationSubmissions = pgTable(
  "prequalification_submissions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    company: text("company").notNull(),
    clientType: text("client_type").notNull(),
    variantSlug: text("variant_slug"),
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
    routingDestination: text("routing_destination"),
    contactId: bigint("contact_id", { mode: "number" }).references(() => contacts.id),
    /** What The Authority Desk answered to our lead.created. */
    adContactId: text("ad_contact_id"),
    bviIntervieweeId: text("bvi_interviewee_id"),
    bviBookingUrl: text("bvi_booking_url"),
    adSyncedAt: timestamp("ad_synced_at", { withTimezone: true }),
    adSyncError: text("ad_sync_error"),
    adSyncAttempts: integer("ad_sync_attempts").notNull().default(0),
    adParked: boolean("ad_parked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("prequal_created_idx").on(t.createdAt),
    index("prequal_contact_idx").on(t.contactId),
    index("prequal_email_idx").on(t.email),
  ],
);

/* ----------------------------------------------------------------- outbox -- */

/**
 * Signed deliveries to The Authority Desk. A row is committed with the
 * submission, then a worker POSTs it with retry/backoff; `delivered_at` set =
 * acknowledged; `parked` = refused outright (4xx) until an admin retries.
 */
export const integrationOutbox = pgTable(
  "integration_outbox",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    target: text("target").notNull().default("authority_desk"),
    eventId: text("event_id").notNull().unique(),
    eventType: text("event_type").notNull(),
    submissionId: bigint("submission_id", { mode: "number" }),
    contactId: bigint("contact_id", { mode: "number" }),
    body: jsonb("body").$type<Record<string, unknown>>().notNull(),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    lastError: text("last_error"),
    lastStatus: integer("last_status"),
    parked: boolean("parked").notNull().default(false),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    response: jsonb("response").$type<unknown>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("outbox_due_idx").on(t.deliveredAt, t.nextAttemptAt)],
);

/* ---------------------------------------------------------------- traffic -- */

/** First-party traffic: view | cta | prequal, one row per event. */
export const trafficEvents = pgTable(
  "traffic_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    kind: text("kind").notNull(),
    slug: text("slug").notNull(),
    path: text("path"),
    referrer: text("referrer"),
    visitor: text("visitor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("traffic_created_idx").on(t.createdAt), index("traffic_slug_idx").on(t.slug, t.createdAt)],
);

/* --------------------------------------------------------------- activity -- */

/** The admin Overview's "Recent activity" feed. */
export const activityLog = pgTable("activity_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actor: text("actor"),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Simple contact-form messages (shown when ctaMode = book-call). */
export const contactMessages = pgTable("contact_messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull().default(""),
  phone: text("phone").notNull().default(""),
  message: text("message").notNull().default(""),
  variantSlug: text("variant_slug"),
  contactId: bigint("contact_id", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
