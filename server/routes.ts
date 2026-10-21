/**
 * The API: public reads for the pages, the form submission, the two inbound
 * integrations (signed), and the admin behind `requireAuth(panel)`. Mirrors
 * The Authority Desk's server/routes.ts in shape and naming.
 */
import { Router, type Request, type Response } from "express";
import { z, type ZodError } from "zod";
import { eq, asc, sql } from "drizzle-orm";
import { db } from "./db";
import { users, contactMessages } from "./schema";
import {
  COOKIE_NAME, cookieOptions, createToken, requireAuth, requireSameOrigin, findUserByEmail, findUserById, hashPassword, verifyPassword,
  rowToUser, temporaryPassword, loginThrottle, recordLoginFailure, clearLoginFailures, type AuthedRequest,
} from "./auth";
import { readSetting, readSettingMeta, writeSetting, resetSetting, readPrequalForm, SettingsValidationError } from "./settings";
import { isSettingKey, SETTING_KEYS } from "../shared/settingsSchema";
import {
  listVariants, getVariant, getPublicVariant, listPublishedPages, createVariant, updateVariant, renameVariant, deleteVariant,
  setOgImage, getOgImage, pageCounts, freeSlug, VariantError, resolveRecord,
} from "./variants";
import { createVariantSchema, variantInputSchema, generateRequestSchema, slugSchema, trackEventSchema, RESERVED_SLUGS } from "../shared/variantSchema";
import { slugify } from "../src/content/contentModel";
import { CAPS } from "../src/content/caps";
import { buildAnswersSchema } from "../shared/formSchema";
import { assertContract, type PrequalAnswers } from "../shared/prequalificationSchema";
import { formForDoor } from "../shared/doorSections";
import { resolveDestination } from "../shared/routingSchema";
import { recordPrequalSubmission, listPrequalSubmissions, listSubmissionsForContact, loadSubmission, localPrefillForEmail, submissionCounts } from "./prequalification";
import { listContacts, getContact, listContactEvents, upsertContactForMessage, contactCounts } from "./contacts";
import { buildLeadCreated, enqueue, deliverNow, isRelayConfigured, retrySubmission, lookupContactAtAuthorityDesk, outboxStats, pingAuthorityDesk, relayConfig } from "./authorityDesk";
import { inboundSecret, parsePartnerEvent, applyPartnerEvent } from "./partnerEvents";
import { verifySignature } from "./signing";
import { appointmentWebhookSchema, applyAppointment, schedulerSecret, verifySchedulerSignature } from "./smartScheduler";
import { listResources, saveResources, draftFromUrl, getSnapshot, removeResource, featuredResources } from "./resources";
import { resourcesSaveSchema, resourceFetchSchema } from "../shared/resourceSchema";
import { FetchPageError } from "./extract";
import { AiError, availableProviders, generateVariantContent, generateVariantImage } from "./ai";
import { recordCta, recordPrequal, buildTrafficReport, ctaClicksSince } from "./traffic";
import { logActivity, recentActivity } from "./activity";
import { getSecret, setSecret, clearSecret, secretsStatus, secretsConfigured, SecretsUnavailableError } from "./secrets";
import { INTEGRATION_DEFS, isSecretField, type IntegrationStatus, type PublicConfig } from "../shared/siteSettingsSchema";
import { loginSchema, changePasswordSchema, inviteUserSchema, updateUserSchema, ROLE_LABELS, type UserRole } from "../shared/usersSchema";
import { sendLeadConfirmation, notifyNewLead, forwardContactMessage, sendTemporaryPassword, isEmailConfigured } from "./email";

export const apiRouter = Router();

function issuesText(error: ZodError): string {
  return error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
}

function publicOrigin(req: Request): string {
  const env = process.env.PUBLIC_BASE_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  const proto = (req.get("x-forwarded-proto") || req.protocol || "https").split(",")[0];
  return `${proto}://${req.get("host")}`;
}

/** Prefilled SmartScheduler link: name/email/external_id=pl:<id> (HANDOFF-intake.md §3). */
export function prefilledBookingUrl(bookingUrl: string, name: string, email: string, submissionId: number): string {
  const sep = bookingUrl.includes("?") ? "&" : "?";
  return `${bookingUrl}${sep}name=${encodeURIComponent(name)}&email=${encodeURIComponent(email.trim().toLowerCase())}&external_id=${encodeURIComponent(`pl:${submissionId}`)}`;
}

async function doorName(slug: string | null | undefined): Promise<string> {
  if (!slug) return "Premium Leads";
  const v = await getVariant(slug);
  return v?.label ?? "Premium Leads";
}

/* ================================================================ public == */

apiRouter.get("/config", async (_req, res) => {
  const [site, sections, capabilities, pricing, integrations, pages] = await Promise.all([
    readSetting("site"), readSetting("sections"), readSetting("capabilities"), readSetting("pricing"), readSetting("integrations"), listPublishedPages(),
  ]);
  const an = (integrations.analytics ?? {}) as Record<string, string | boolean>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const body: PublicConfig = {
    site, sections, capabilities, pricing,
    analytics: { ga4: str(an.ga4), metaPixel: str(an.metaPixel), linkedinTag: str(an.linkedinTag) },
    pages,
  };
  res.set("Cache-Control", "no-store").json(body);
});

apiRouter.get("/variant", async (req, res) => {
  const slug = typeof req.query.slug === "string" ? req.query.slug : "";
  const preview = req.query.preview === "1";
  if (preview) {
    // Only a signed-in admin may preview a draft.
    const guard = requireAuth("pages");
    let allowed = false;
    await new Promise<void>((resolve) => guard(req, { status: () => ({ json: () => resolve() }) } as unknown as Response, () => { allowed = true; resolve(); }));
    if (!allowed) return res.status(401).json({ error: "Unauthorized" });
  }
  const site = await readSetting("site");
  const target = slug || site.defaultVariant;
  const v = await getPublicVariant(target, preview);
  if (!v) return res.status(404).json({ error: "Not found" });
  res.set("Cache-Control", "no-store").json(v);
});

apiRouter.get("/resources", async (_req, res) => {
  res.set("Cache-Control", "no-store").json(await listResources({ includeDrafts: false }));
});

apiRouter.get("/resources/featured", async (_req, res) => {
  res.set("Cache-Control", "no-store").json(await featuredResources(3));
});

apiRouter.get("/resources/:id/snapshot", async (req, res) => {
  const snap = await getSnapshot(String(req.params.id));
  if (!snap) return res.status(404).end();
  res.set("Content-Type", snap.type).set("Cache-Control", "public, max-age=86400").send(snap.bytes);
});

apiRouter.get("/og/:slug", async (req, res) => {
  const img = await getOgImage(String(req.params.slug));
  if (!img) return res.status(404).end();
  res.set("Content-Type", img.type).set("Cache-Control", "public, max-age=86400").send(img.bytes);
});

/** The live Get started form for a door: base definition + door section 02b. */
apiRouter.get("/prequal-form", async (req, res) => {
  const door = typeof req.query.variant === "string" ? req.query.variant : "";
  const [base, doors, site, routing] = await Promise.all([readPrequalForm(), readSetting("doorSections"), readSetting("site"), readSetting("routing")]);
  const variant = await getVariant(door || site.defaultVariant);
  const slug = variant?.slug ?? site.defaultVariant;
  const content = variant ? resolveRecord(variant) : null;
  res.set("Cache-Control", "no-store").json({
    form: formForDoor(base, doors, slug),
    door: { slug, name: variant?.label ?? "Premium Leads", isHome: slug === site.defaultVariant },
    bookingUrl: variant?.bookingUrl || site.bookingUrl,
    heading: content?.ctaHeading ?? "Ready to see your pipeline fill itself?",
    loginUrl: site.loginUrl,
    nurture: routing.nurture,
  });
});

const lookupSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) });
const lookupHits = new Map<string, number[]>();

/**
 * Returning-client shortcut (HANDOFF-intake.md §4): what we — or The
 * Authority Desk — already know for this email. Returns only the qualifiers
 * and company, never the phone, and is rate-limited per IP.
 */
apiRouter.get("/prequalification/lookup", async (req, res) => {
  const parsed = lookupSchema.safeParse({ email: req.query.email });
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email address." });
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || req.socket.remoteAddress || "?";
  const now = Date.now();
  const hits = (lookupHits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= 20) return res.status(429).json({ error: "Too many lookups. Try again in a minute." });
  hits.push(now);
  lookupHits.set(ip, hits);
  const email = parsed.data.email;
  const local = await localPrefillForEmail(email);
  const remote = local ? null : await lookupContactAtAuthorityDesk(email);
  const found = local ?? remote;
  if (!found) return res.json({ known: false });
  res.json({
    known: true,
    source: local ? "premium_leads" : "authority_desk",
    servicePreference: found.servicePreference ?? "",
    marketingBudget: found.marketingBudget ?? "",
    clientType: found.clientType ?? "",
    company: found.company ?? "",
    intervieweeId: found.intervieweeId ?? null,
  });
});

apiRouter.post("/pre-qualification", requireSameOrigin, async (req: Request, res: Response) => {
  if (typeof req.body?.hp === "string" && req.body.hp.trim() !== "") return res.json({ ok: true, stored: false });
  const [base, doors, site] = await Promise.all([readPrequalForm(), readSetting("doorSections"), readSetting("site")]);
  const door = typeof req.body?.variantSlug === "string" ? req.body.variantSlug.trim() : "";
  const variant = door ? await getVariant(door) : null;
  const definition = formForDoor(base, doors, variant?.slug ?? null);
  const parse = buildAnswersSchema(definition).safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: issuesText(parse.error), fields: Object.fromEntries(parse.error.issues.map((i) => [String(i.path[0]), i.message])) });
  const answers = { ...(parse.data as PrequalAnswers), variantSlug: variant?.slug ?? "" };
  const contractError = assertContract(answers);
  if (contractError) return res.status(400).json({ error: contractError });
  try {
    // Routing is decided here, not in the browser: the rules are business policy.
    const routing = await readSetting("routing");
    const destination = resolveDestination(routing, answers);
    const record = await recordPrequalSubmission(answers, destination);
    // One signed lead.created to The Authority Desk (never to BVI directly).
    const known = typeof req.body?.intervieweeId === "string" && req.body.intervieweeId.trim() ? req.body.intervieweeId.trim() : null;
    let relayed = false;
    try {
      if (await isRelayConfigured()) {
        const id = await enqueue(buildLeadCreated(record, known), { submissionId: record.id, contactId: record.contactId });
        deliverNow(id);
        relayed = true;
      } else {
        // Still queue it: the worker sends it once the relay is configured.
        await enqueue(buildLeadCreated(record, known), { submissionId: record.id, contactId: record.contactId });
      }
    } catch (err) {
      console.error(`[authority-desk] could not enqueue submission ${record.id}`, err);
    }
    const bookingUrl = variant?.bookingUrl || site.bookingUrl;
    const prefilled = prefilledBookingUrl(bookingUrl, record.fullName, record.email, record.id);
    const name = await doorName(record.variantSlug);
    void sendLeadConfirmation(record, destination, destination === "book" ? prefilled : bookingUrl, name);
    void notifyNewLead(record, destination, name, `${publicOrigin(req)}/admin/leads${record.contactId ? `/${record.contactId}` : ""}`);
    recordPrequal(req, record.variantSlug ?? "").catch((err) => console.error("[track] prequal failed", err));
    console.log(`[prequalification] recorded submission ${record.id} (${record.clientType}, ${record.company}, via "${record.variantSlug ?? ""}") → ${destination}`);
    res.status(201).json({ ok: true, id: record.id, ref: `pl:${record.id}`, destination, bookingUrl: prefilled, relayed });
  } catch (err) {
    console.error("[prequalification] store failed", err);
    res.status(500).json({ error: "Could not save your answers. Please try again." });
  }
});

const contactMessageSchema = z.object({
  name: z.string().trim().min(1, "Your name is required.").max(200),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  company: z.string().trim().max(200).default(""),
  phone: z.string().trim().max(80).default(""),
  message: z.string().trim().max(4000).default(""),
  variantSlug: z.string().trim().max(80).default(""),
  hp: z.string().optional(),
});

/** The simple contact form shown in book-call mode. */
apiRouter.post("/contact", requireSameOrigin, async (req, res) => {
  const parsed = contactMessageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: issuesText(parsed.error) });
  if (parsed.data.hp) return res.json({ ok: true });
  const { hp: _hp, ...input } = parsed.data;
  try {
    const rows = await db().insert(contactMessages).values({ ...input, variantSlug: input.variantSlug || null }).returning({ id: contactMessages.id });
    const messageId = rows[0].id;
    await upsertContactForMessage({ ...input, variantSlug: input.variantSlug || null, messageId }).catch((err) => console.error("[contacts] message upsert failed", err));
    void forwardContactMessage({ ...input, variantSlug: input.variantSlug || null });
    void logActivity(null, `New message from ${input.name} (${input.email})`);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("[contact] store failed", err);
    res.status(500).json({ error: "Could not send your message. Please try again." });
  }
});

apiRouter.post("/track", async (req, res) => {
  const parsed = trackEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(204).end();
  recordCta(req, parsed.data.slug).catch((err) => console.error("[track] cta failed", err));
  res.status(204).end();
});

/* ========================================================== integrations == */

type RawReq = Request & { rawBody?: Buffer };

apiRouter.post("/integrations/authority-desk/events", async (req: Request, res: Response) => {
  const secret = await inboundSecret();
  const verdict = verifySignature((req as RawReq).rawBody, req.get("x-timestamp") ?? undefined, req.get("x-signature") ?? undefined, secret);
  if (verdict === "no-secret") {
    console.warn("[authority-desk-events] event received but no shared secret is configured");
    return res.status(503).json({ error: "Not configured" });
  }
  if (verdict !== "ok") {
    console.warn(`[authority-desk-events] refused: signature ${verdict}`);
    return res.status(401).json({ error: `Signature ${verdict}` });
  }
  if (req.body?.eventType === "ping") return res.json({ ok: true, pong: true });
  const parsed = parsePartnerEvent(req.body);
  if (!parsed.ok) {
    console.warn(`[authority-desk-events] refused: ${parsed.error}`);
    return res.status(400).json({ error: parsed.error });
  }
  try {
    const result = await applyPartnerEvent(parsed.event);
    if (result.outcome === "unkeyable") return res.status(422).json({ error: "Event has no email and names no known person" });
    return res.json({ ok: true, duplicate: result.outcome === "duplicate", contactId: result.contactId });
  } catch (err) {
    console.error(`[authority-desk-events] ${parsed.event.eventType} ${parsed.event.eventId} failed`, err);
    return res.status(500).json({ error: "Could not record the event" });
  }
});

apiRouter.post("/integrations/smart-scheduler/webhook", async (req: Request, res: Response) => {
  const secret = await schedulerSecret();
  const signature = req.get("x-signature") ?? req.get("x-smart-scheduler-signature") ?? req.get("x-webhook-signature") ?? undefined;
  const verdict = verifySchedulerSignature((req as RawReq).rawBody, { signature, timestamp: req.get("x-timestamp") ?? undefined }, secret);
  if (verdict === "missing" || verdict === "mismatch") {
    console.warn(`[smart-scheduler] refused: signature ${verdict}`);
    return res.status(401).json({ error: `Signature ${verdict}` });
  }
  if (verdict === "unsigned-accepted") console.warn("[smart-scheduler] accepted an unsigned webhook — set the webhook secret under Integrations → SmartScheduler");
  const parsed = appointmentWebhookSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: issuesText(parsed.error) });
  try {
    const result = await applyAppointment(parsed.data);
    if (result.outcome === "unkeyable") return res.status(422).json({ error: "Booking has no email and no known external id" });
    if (result.outcome === "booked") void logActivity(null, `Strategy call booked (contact #${result.contactId})`);
    return res.json({ ok: true, outcome: result.outcome, contactId: result.contactId });
  } catch (err) {
    console.error("[smart-scheduler] webhook failed", err);
    return res.status(500).json({ error: "Could not record the booking" });
  }
});

/* ================================================================= admin == */

apiRouter.post("/admin/login", requireSameOrigin, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: issuesText(parsed.error) });
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || req.socket.remoteAddress || "?";
  const key = `${parsed.data.email}|${ip}`;
  const wait = loginThrottle(key);
  if (wait) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` });
  const user = await findUserByEmail(parsed.data.email);
  const ok = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !ok) {
    recordLoginFailure(key);
    return res.status(401).json({ error: "That email and password don't match." });
  }
  clearLoginFailures(key);
  await db().update(users).set({ lastLoginAt: new Date(), status: "active", updatedAt: new Date() }).where(eq(users.id, user.id));
  res.cookie(COOKIE_NAME, createToken(user.id), cookieOptions());
  void logActivity(user.email, `${user.name} signed in`);
  res.json({ ok: true, user: rowToUser({ ...user, status: "active", lastLoginAt: new Date() }) });
});

apiRouter.post("/admin/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

apiRouter.get("/admin/session", async (req, res) => {
  const { currentUser } = await import("./auth");
  const user = await currentUser(req);
  res.set("Cache-Control", "no-store").json({ authenticated: Boolean(user), user: user ? rowToUser(user) : null });
});

/** Change password (also the forced first-login change). Re-issues the cookie. */
apiRouter.post("/admin/password", requireSameOrigin, requireAuth("password"), async (req, res) => {
  const me = (req as AuthedRequest).user;
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: issuesText(parsed.error) });
  if (!(await verifyPassword(parsed.data.currentPassword, me.passwordHash))) return res.status(400).json({ error: "Your current password is not right." });
  if (parsed.data.currentPassword === parsed.data.newPassword) return res.status(400).json({ error: "Choose a password you haven't used here." });
  const now = new Date();
  await db().update(users).set({ passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false, passwordChangedAt: now, updatedAt: now }).where(eq(users.id, me.id));
  res.cookie(COOKIE_NAME, createToken(me.id), cookieOptions());
  void logActivity(me.email, `${me.name} changed their password`);
  const fresh = await findUserById(me.id);
  res.json({ ok: true, user: fresh ? rowToUser(fresh) : null });
});

/* --------------------------------------------------------------- overview */

async function integrationHealth(): Promise<IntegrationStatus[]> {
  const [intg, secrets] = await Promise.all([readSetting("integrations"), secretsStatus()]);
  const adConfigured = await isRelayConfigured();
  return INTEGRATION_DEFS.map((g) => {
    const values = (intg[g.key] ?? {}) as Record<string, string | boolean>;
    const secretsSet: Record<string, boolean> = {};
    let anyValue = false;
    for (const f of g.fields) {
      if (f.type === "password") {
        const s = secrets[`${g.key}.${f.key}`];
        secretsSet[f.key] = Boolean(s && (s.stored || s.env));
        if (secretsSet[f.key]) anyValue = true;
      } else if (!f.readOnly && typeof values[f.key] === "string" && (values[f.key] as string).trim()) {
        anyValue = true;
      }
    }
    let status = anyValue ? "Connected" : "Not configured";
    let tone: IntegrationStatus["tone"] = anyValue ? "ok" : "off";
    if (g.key === "brandVoice") {
      status = adConfigured ? "Via Authority Desk" : "Waiting on Authority Desk";
      tone = adConfigured ? "ok" : "warn";
    }
    if (g.key === "authorityDesk") {
      status = adConfigured ? "Connected" : "Not configured";
      tone = adConfigured ? "ok" : "off";
    }
    return { key: g.key, values, secretsSet, configured: anyValue, status, tone };
  });
}

apiRouter.get("/admin/overview", requireAuth("overview"), async (_req, res) => {
  const [subs, contactsN, clicks7, clicksAll, pages, caps, usersRows, health, activity, outbox, providers] = await Promise.all([
    submissionCounts(), contactCounts(), ctaClicksSince(7), ctaClicksSince(36500), pageCounts(), readSetting("capabilities"),
    db().select().from(users), integrationHealth(), recentActivity(30), outboxStats(), availableProviders(),
  ]);
  const capsOn = CAPS.filter((c) => caps[c.key] !== false).length;
  res.set("Cache-Control", "no-store").json({
    tiles: {
      leads7: subs.last7, leadsAll: subs.total, contacts: contactsN.total,
      ctaClicks7: clicks7, ctaClicks: clicksAll,
      pagesLive: pages.live, pagesTotal: pages.total,
      capsOn, capsTotal: CAPS.length,
      users: usersRows.length, invited: usersRows.filter((u) => u.status === "invited").length,
    },
    health, activity, outbox, aiProviders: providers,
  });
});

/* ------------------------------------------------------------------ pages */

apiRouter.get("/admin/variants", requireAuth("pages"), async (_req, res) => {
  const [list, site] = await Promise.all([listVariants(), readSetting("site")]);
  res.set("Cache-Control", "no-store").json({ variants: list, defaultVariant: site.defaultVariant });
});

apiRouter.get("/admin/variant", requireAuth("pages"), async (req, res) => {
  const slug = typeof req.query.slug === "string" ? req.query.slug : "";
  const v = await getVariant(slug);
  if (!v) return res.status(404).json({ error: "Page not found." });
  res.set("Cache-Control", "no-store").json(v);
});

apiRouter.post("/admin/variant", requireSameOrigin, requireAuth("pages"), async (req, res) => {
  const parsed = createVariantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: issuesText(parsed.error) });
  try {
    const v = await createVariant({ ...parsed.data, published: false });
    void logActivity((req as AuthedRequest).user.email, `Created page “${v.label}” (/${v.slug})`);
    res.status(201).json(v);
  } catch (err) {
    if (err instanceof VariantError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

apiRouter.put("/admin/variant", requireSameOrigin, requireAuth("pages"), async (req, res) => {
  const slug = typeof req.query.slug === "string" ? req.query.slug : "";
  const parsed = variantInputSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: issuesText(parsed.error) });
  try {
    const v = await updateVariant(slug, parsed.data);
    res.json(v);
  } catch (err) {
    if (err instanceof VariantError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

apiRouter.post("/admin/variant/rename", requireSameOrigin, requireAuth("pages"), async (req, res) => {
  const body = z.object({ slug: z.string(), next: slugSchema }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: issuesText(body.error) });
  if (RESERVED_SLUGS.includes(body.data.next)) return res.status(400).json({ error: "That address is reserved." });
  try {
    const v = await renameVariant(body.data.slug, body.data.next);
    res.json(v);
  } catch (err) {
    if (err instanceof VariantError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

apiRouter.delete("/admin/variant", requireSameOrigin, requireAuth("pages"), async (req, res) => {
  const slug = typeof req.query.slug === "string" ? req.query.slug : "";
  try {
    const site = await readSetting("site");
    await deleteVariant(slug);
    if (site.defaultVariant === slug) await writeSetting("site", { ...site, defaultVariant: "sales" });
    void logActivity((req as AuthedRequest).user.email, `Deleted page /${slug}`);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof VariantError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

apiRouter.post("/admin/variant/publish", requireSameOrigin, requireAuth("pages"), async (req, res) => {
  const body = z.object({ slug: z.string(), published: z.boolean() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: issuesText(body.error) });
  try {
    const v = await updateVariant(body.data.slug, { published: body.data.published });
    void logActivity((req as AuthedRequest).user.email, `${v.published ? "Published" : "Unpublished"} /${v.slug}`);
    res.json(v);
  } catch (err) {
    if (err instanceof VariantError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

apiRouter.post("/admin/variant/make-home", requireSameOrigin, requireAuth("pages"), async (req, res) => {
  const body = z.object({ slug: z.string() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: issuesText(body.error) });
  const v = await getVariant(body.data.slug);
  if (!v) return res.status(404).json({ error: "Page not found." });
  const site = await readSetting("site");
  if (!v.published) await updateVariant(v.slug, { published: true });
  const saved = await writeSetting("site", { ...site, defaultVariant: v.slug });
  void logActivity((req as AuthedRequest).user.email, `Made /${v.slug} the home page`);
  res.json({ ok: true, site: saved.value });
});

apiRouter.get("/admin/ai-providers", requireAuth("pages"), async (_req, res) => {
  res.json({ providers: await availableProviders() });
});

/** Generate a full draft with AI, stored unpublished for review. */
apiRouter.post("/admin/generate", requireSameOrigin, requireAuth("pages"), async (req, res) => {
  const parsed = generateRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: issuesText(parsed.error) });
  const { name, notes, provider } = parsed.data;
  try {
    const content = await generateVariantContent(name, notes, provider);
    const slug = await freeSlug(slugify(name));
    const v = await createVariant({ slug, label: name, audience: name.toLowerCase(), content, generatedBy: provider, published: false });
    void logActivity((req as AuthedRequest).user.email, `Generated page “${name}” with ${provider === "openai" ? "GPT" : "Claude"}`);
    // The share image is best-effort and needs OpenAI; never fail the draft for it.
    generateVariantImage(name, notes).then((img) => setOgImage(slug, img.bytes, img.contentType)).catch((err) => console.log(`[ai] share image skipped: ${err instanceof Error ? err.message : err}`));
    res.status(201).json(v);
  } catch (err) {
    if (err instanceof AiError) return res.status(502).json({ error: err.message });
    console.error("[ai] generate failed", err);
    res.status(500).json({ error: "Generation failed." });
  }
});

apiRouter.post("/admin/variant/generate-image", requireSameOrigin, requireAuth("pages"), async (req, res) => {
  const body = z.object({ slug: z.string(), notes: z.string().max(2000).optional().default("") }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: issuesText(body.error) });
  const v = await getVariant(body.data.slug);
  if (!v) return res.status(404).json({ error: "Page not found." });
  try {
    const img = await generateVariantImage(v.audience, body.data.notes);
    await setOgImage(v.slug, img.bytes, img.contentType);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof AiError) return res.status(502).json({ error: err.message });
    throw err;
  }
});

apiRouter.post("/admin/variant/clear-image", requireSameOrigin, requireAuth("pages"), async (req, res) => {
  const body = z.object({ slug: z.string() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: issuesText(body.error) });
  await setOgImage(body.data.slug, null, null);
  res.json({ ok: true });
});

/* --------------------------------------------------------------- settings */

const SETTING_PANEL: Record<string, string> = {
  site: "settings", sections: "sections", capabilities: "caps", pricing: "pricing", integrations: "integrations",
  prequalForm: "form", doorSections: "form", routing: "routing",
};

function settingGuard(req: Request, res: Response, next: () => void) {
  const key = String(req.params.key);
  if (!isSettingKey(key)) return res.status(404).json({ error: "Unknown setting." });
  return requireAuth(SETTING_PANEL[key])(req, res, next);
}

apiRouter.get("/admin/settings/:key", settingGuard, async (req, res) => {
  const key = String(req.params.key);
  if (!isSettingKey(key)) return res.status(404).end();
  res.set("Cache-Control", "no-store").json(await readSettingMeta(key));
});

apiRouter.put("/admin/settings/:key", requireSameOrigin, settingGuard, async (req, res) => {
  const key = String(req.params.key);
  if (!isSettingKey(key)) return res.status(404).end();
  try {
    const saved = await writeSetting(key, req.body);
    void logActivity((req as AuthedRequest).user.email, `Site changes published (${key})`);
    res.json(saved);
  } catch (err) {
    if (err instanceof SettingsValidationError) return res.status(400).json({ error: err.message });
    throw err;
  }
});

apiRouter.delete("/admin/settings/:key", requireSameOrigin, settingGuard, async (req, res) => {
  const key = String(req.params.key);
  if (!isSettingKey(key)) return res.status(404).end();
  await resetSetting(key);
  res.json(await readSettingMeta(key));
});

/** "Reset everything to defaults": every setting except integrations. */
apiRouter.post("/admin/reset-defaults", requireSameOrigin, requireAuth("settings"), async (req, res) => {
  for (const key of SETTING_KEYS) if (key !== "integrations") await resetSetting(key);
  void logActivity((req as AuthedRequest).user.email, "Reset site settings to defaults");
  res.json({ ok: true });
});

/* -------------------------------------------------------------- resources */

apiRouter.get("/admin/resources", requireAuth("resources"), async (_req, res) => {
  res.set("Cache-Control", "no-store").json(await listResources({ includeDrafts: true }));
});

apiRouter.put("/admin/resources", requireSameOrigin, requireAuth("resources"), async (req, res) => {
  const parsed = resourcesSaveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: issuesText(parsed.error) });
  const saved = await saveResources(parsed.data);
  void logActivity((req as AuthedRequest).user.email, `Published ${saved.length} resource(s)`);
  res.json(saved);
});

apiRouter.post("/admin/resources/fetch", requireSameOrigin, requireAuth("resources"), async (req, res) => {
  const parsed = resourceFetchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: issuesText(parsed.error) });
  try {
    const draft = await draftFromUrl(parsed.data);
    void logActivity((req as AuthedRequest).user.email, `${parsed.data.id ? "Re-snapshotted" : "Fetched"} resource ${draft.name}`);
    res.json(draft);
  } catch (err) {
    if (err instanceof FetchPageError) return res.status(err.status).json({ error: err.message });
    console.error("[resources] fetch failed", err);
    res.status(500).json({ error: "Could not fetch that page." });
  }
});

apiRouter.delete("/admin/resources/:id", requireSameOrigin, requireAuth("resources"), async (req, res) => {
  await removeResource(String(req.params.id));
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ leads */

apiRouter.get("/admin/contacts", requireAuth("leads"), async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const relay = await isRelayConfigured();
  const result = await listContacts({ limit, offset, q: typeof req.query.q === "string" ? req.query.q : undefined, source: typeof req.query.source === "string" ? req.query.source : undefined }, relay);
  res.set("Cache-Control", "no-store").json({ ...result, relayConfigured: relay });
});

apiRouter.get("/admin/contacts/:id", requireAuth("leads"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Bad id" });
  const relay = await isRelayConfigured();
  const contact = await getContact(id, relay);
  if (!contact) return res.status(404).json({ error: "Not found" });
  const [events, submissions] = await Promise.all([listContactEvents(id), listSubmissionsForContact(id)]);
  res.set("Cache-Control", "no-store").json({ contact, events, submissions });
});

apiRouter.get("/admin/pre-qualifications", requireAuth("leads"), async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
  const [submissions, pages] = await Promise.all([listPrequalSubmissions(limit), listVariants()]);
  const labels = Object.fromEntries(pages.map((p) => [p.slug, p.label]));
  res.set("Cache-Control", "no-store").json({ submissions, doors: labels, relayConfigured: await isRelayConfigured() });
});

apiRouter.post("/admin/pre-qualifications/:id/resync", requireSameOrigin, requireAuth("leads"), async (req, res) => {
  const id = Number(req.params.id);
  const record = await loadSubmission(id);
  if (!record) return res.status(404).json({ error: "Not found" });
  try {
    let result = await retrySubmission(id);
    if (result.attempted === 0) {
      // Nothing queued (sent before the relay existed): queue a fresh lead.created.
      const outboxId = await enqueue(buildLeadCreated(record, record.authorityDesk.intervieweeId), { submissionId: record.id, contactId: record.contactId });
      if (outboxId) result = await retrySubmission(id);
    }
    void logActivity((req as AuthedRequest).user.email, `Retried Authority Desk sync for pl:${id}`);
    res.json({ ok: true, ...result, submission: await loadSubmission(id) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/* ---------------------------------------------------------------- traffic */

apiRouter.get("/admin/traffic", requireAuth("traffic"), async (_req, res) => {
  const pages = await listVariants();
  res.set("Cache-Control", "no-store").json(await buildTrafficReport(pages.map((p) => ({ slug: p.slug, label: p.label, published: p.published }))));
});

/* ------------------------------------------------------------------ users */

apiRouter.get("/admin/users", requireAuth("users"), async (_req, res) => {
  const rows = await db().select().from(users).orderBy(asc(users.createdAt));
  res.set("Cache-Control", "no-store").json({ users: rows.map(rowToUser), emailConfigured: await isEmailConfigured() });
});

apiRouter.post("/admin/users", requireSameOrigin, requireAuth("users"), async (req, res) => {
  const parsed = inviteUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: issuesText(parsed.error) });
  if (await findUserByEmail(parsed.data.email)) return res.status(409).json({ error: "That email already has an account." });
  const password = temporaryPassword();
  const rows = await db().insert(users).values({ ...parsed.data, passwordHash: await hashPassword(password), status: "invited", mustChangePassword: true }).returning();
  const me = (req as AuthedRequest).user;
  const site = await readSetting("site");
  const loginUrl = `${publicOrigin(req)}/admin`;
  const emailed = await sendTemporaryPassword({ to: parsed.data.email, name: parsed.data.name, password, loginUrl, kind: "invite" });
  void logActivity(me.email, `Invited ${parsed.data.name} as ${ROLE_LABELS[parsed.data.role]}`);
  // When SendGrid is not configured the temporary password is shown once, to the inviter.
  res.status(201).json({ user: rowToUser(rows[0]), emailed, temporaryPassword: emailed ? null : password, siteTitle: site.siteTitle });
});

apiRouter.patch("/admin/users/:id", requireSameOrigin, requireAuth("users"), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: issuesText(parsed.error) });
  const me = (req as AuthedRequest).user;
  const target = await findUserById(id);
  if (!target) return res.status(404).json({ error: "Not found" });
  if (parsed.data.role && target.id === me.id) return res.status(400).json({ error: "You can't change your own role." });
  if (parsed.data.role && target.role === "super" && parsed.data.role !== "super") {
    const supers = await db().select({ n: sql<string>`count(*)` }).from(users).where(eq(users.role, "super"));
    if (Number(supers[0]?.n ?? 0) <= 1) return res.status(400).json({ error: "Keep at least one super admin." });
  }
  const rows = await db().update(users).set({ ...parsed.data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
  if (parsed.data.role) void logActivity(me.email, `${target.name} is now ${ROLE_LABELS[parsed.data.role as UserRole]}`);
  res.json(rowToUser(rows[0]));
});

apiRouter.post("/admin/users/:id/reset-password", requireSameOrigin, requireAuth("users"), async (req, res) => {
  const id = Number(req.params.id);
  const target = await findUserById(id);
  if (!target) return res.status(404).json({ error: "Not found" });
  const password = temporaryPassword();
  const now = new Date();
  await db().update(users).set({ passwordHash: await hashPassword(password), mustChangePassword: true, passwordChangedAt: now, updatedAt: now }).where(eq(users.id, id));
  const emailed = await sendTemporaryPassword({ to: target.email, name: target.name, password, loginUrl: `${publicOrigin(req)}/admin`, kind: "reset" });
  void logActivity((req as AuthedRequest).user.email, `Password reset for ${target.email}`);
  res.json({ ok: true, emailed, temporaryPassword: emailed ? null : password });
});

apiRouter.delete("/admin/users/:id", requireSameOrigin, requireAuth("users"), async (req, res) => {
  const id = Number(req.params.id);
  const me = (req as AuthedRequest).user;
  const target = await findUserById(id);
  if (!target) return res.status(404).json({ error: "Not found" });
  if (target.id === me.id) return res.status(400).json({ error: "You can't remove yourself." });
  if (target.role === "super") return res.status(400).json({ error: "Super admins can't be removed — change their role first." });
  await db().delete(users).where(eq(users.id, id));
  void logActivity(me.email, `${target.name} removed`);
  res.json({ ok: true });
});

/* ----------------------------------------------------------- integrations */

apiRouter.get("/admin/integrations", requireAuth("integrations"), async (_req, res) => {
  res.set("Cache-Control", "no-store").json({ integrations: await integrationHealth(), secretsConfigured: secretsConfigured() });
});

const integrationSaveSchema = z.object({
  values: z.record(z.string().max(40), z.union([z.string().max(1000), z.boolean()])).default({}),
  /** Secret fields to set ("" or missing = leave as is; null = clear). */
  secrets: z.record(z.string().max(40), z.string().max(4000).nullable()).default({}),
});

apiRouter.put("/admin/integrations/:key", requireSameOrigin, requireAuth("integrations"), async (req, res) => {
  const key = String(req.params.key);
  const def = INTEGRATION_DEFS.find((g) => g.key === key);
  if (!def) return res.status(404).json({ error: "Unknown integration." });
  const parsed = integrationSaveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: issuesText(parsed.error) });
  const me = (req as AuthedRequest).user;
  const intg = await readSetting("integrations");
  const plain: Record<string, string | boolean> = {};
  for (const [k, v] of Object.entries(parsed.data.values)) {
    if (isSecretField(key, k)) continue; // never store a secret in plain JSON
    const fieldDef = def.fields.find((f) => f.key === k);
    if (fieldDef?.readOnly) continue;
    plain[k] = v;
  }
  try {
    for (const [field, value] of Object.entries(parsed.data.secrets)) {
      if (!isSecretField(key, field)) continue;
      if (value === null) await clearSecret(`${key}.${field}`);
      else if (value.trim() !== "") await setSecret(`${key}.${field}`, value.trim(), me.email);
    }
  } catch (err) {
    if (err instanceof SecretsUnavailableError) return res.status(503).json({ error: "SECRETS_KEY is not configured on the server, so secrets can't be saved yet." });
    throw err;
  }
  await writeSetting("integrations", { ...intg, [key]: { ...((intg[key] as Record<string, string | boolean>) ?? {}), ...plain } });
  void logActivity(me.email, `Updated ${def.name} integration`);
  res.json({ integrations: await integrationHealth() });
});

apiRouter.post("/admin/integrations/:key/test", requireSameOrigin, requireAuth("integrations"), async (req, res) => {
  const key = String(req.params.key);
  const intg = await readSetting("integrations");
  const values = (intg[key] ?? {}) as Record<string, string | boolean>;
  const str = (k: string) => (typeof values[k] === "string" ? (values[k] as string).trim() : "");
  const probe = async (url: string, init?: RequestInit) => {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(8_000) });
    return r;
  };
  try {
    switch (key) {
      case "sendgrid": {
        const k = await getSecret("sendgrid.apiKey");
        if (!k) return res.json({ ok: false, detail: "No API key saved." });
        const r = await probe("https://api.sendgrid.com/v3/scopes", { headers: { Authorization: `Bearer ${k}` } });
        return res.json({ ok: r.ok, detail: r.ok ? "SendGrid accepted the key." : `SendGrid answered HTTP ${r.status}.` });
      }
      case "authorityDesk":
        return res.json(await pingAuthorityDesk());
      case "brandVoice": {
        const cfg = await relayConfig();
        return res.json({ ok: Boolean(cfg.secret && cfg.eventsUrl), detail: cfg.secret && cfg.eventsUrl ? "Reached through The Authority Desk relay." : "Configure The Authority Desk first." });
      }
      case "scheduler": {
        const link = str("strategyLink");
        if (!link) return res.json({ ok: false, detail: "No strategy call link saved." });
        const r = await probe(link, { method: "GET", redirect: "follow" });
        return res.json({ ok: r.ok, detail: r.ok ? "Booking link is reachable." : `Booking link answered HTTP ${r.status}.` });
      }
      case "ai": {
        const results: string[] = [];
        const a = await getSecret("ai.anthropicKey");
        if (a) {
          const r = await probe("https://api.anthropic.com/v1/models", { headers: { "x-api-key": a, "anthropic-version": "2023-06-01" } });
          results.push(`Anthropic: ${r.ok ? "ok" : `HTTP ${r.status}`}`);
        }
        const o = await getSecret("ai.openaiKey");
        if (o) {
          const r = await probe("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${o}` } });
          results.push(`OpenAI: ${r.ok ? "ok" : `HTTP ${r.status}`}`);
        }
        if (!results.length) return res.json({ ok: false, detail: "No AI key saved." });
        return res.json({ ok: results.every((s) => s.endsWith("ok")), detail: results.join(" · ") });
      }
      case "app": {
        const url = str("loginUrl") || "https://app.premiumleads.ai/auth/sign-in";
        const r = await probe(url, { method: "GET", redirect: "follow" });
        return res.json({ ok: r.ok, detail: r.ok ? "Sign-in URL is reachable." : `Sign-in URL answered HTTP ${r.status}.` });
      }
      case "analytics":
        return res.json({ ok: Boolean(str("ga4") || str("metaPixel") || str("linkedinTag")), detail: str("ga4") ? `GA4 ${str("ga4")} will be injected on every public page.` : "No measurement IDs saved yet." });
      default:
        return res.status(404).json({ error: "Unknown integration." });
    }
  } catch (err) {
    return res.json({ ok: false, detail: err instanceof Error ? err.message : String(err) });
  }
});
