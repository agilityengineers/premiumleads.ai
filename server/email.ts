/**
 * Outbound notifications: SendGrid email (lead confirmation, advisor alert,
 * invites and password resets) and a Slack incoming webhook for new leads.
 * Every send is fire-and-forget and skipped with a log line when the
 * integration is not configured — a missing key never fails a form.
 */
import sgMail from "@sendgrid/mail";
import { readSetting } from "./settings";
import { getSecret } from "./secrets";
import type { PrequalRecord } from "../shared/prequalificationSchema";
import type { RouteDestination } from "../shared/routingSchema";

type SendInput = { to: string; subject: string; text: string; html?: string };

async function sendgridConfig() {
  const intg = await readSetting("integrations");
  const sg = (intg.sendgrid ?? {}) as Record<string, string | boolean>;
  const str = (v: unknown, d = "") => (typeof v === "string" && v.trim() ? v.trim() : d);
  return {
    apiKey: await getSecret("sendgrid.apiKey"),
    fromEmail: str(sg.fromEmail, process.env.SENDGRID_FROM_EMAIL || "hello@premiumleads.ai"),
    fromName: str(sg.fromName, "Premium Leads"),
    replyTo: str(sg.replyTo),
    leadConfirm: sg.leadConfirm !== false,
    nurtureSeq: sg.nurtureSeq !== false,
    advisorNotify: sg.advisorNotify !== false,
  };
}

export async function isEmailConfigured(): Promise<boolean> {
  return (await sendgridConfig()).apiKey !== "";
}

/** Sends one email, or logs why it did not. Never throws. */
export async function sendEmail(input: SendInput): Promise<boolean> {
  const cfg = await sendgridConfig();
  if (!cfg.apiKey) {
    console.log(`[email] skipped "${input.subject}" to ${input.to} — SendGrid not configured`);
    return false;
  }
  try {
    sgMail.setApiKey(cfg.apiKey);
    await sgMail.send({
      to: input.to,
      from: { email: cfg.fromEmail, name: cfg.fromName },
      ...(cfg.replyTo ? { replyTo: cfg.replyTo } : {}),
      subject: input.subject,
      text: input.text,
      html: input.html ?? `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(input.text)}</pre>`,
    });
    return true;
  } catch (err) {
    console.error(`[email] send failed for "${input.subject}"`, err instanceof Error ? err.message : err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The prospect's confirmation after the form, by routing outcome. */
export async function sendLeadConfirmation(record: PrequalRecord, destination: RouteDestination, bookingLink: string, doorName: string): Promise<void> {
  const cfg = await sendgridConfig();
  if (!cfg.apiKey || !cfg.leadConfirm) return;
  if (destination === "nurture" && !cfg.nurtureSeq) return;
  const first = record.fullName.trim().split(/\s+/)[0] || "there";
  const text =
    destination === "nurture"
      ? `Hi ${first},\n\nThanks for telling us about ${record.company}. It sounds like you're still exploring, so we won't push a sales call on you. We'll send a short note on how ${doorName.toLowerCase()} teams run outbound with Premium Leads — and when you're ready, your answers will be waiting.\n\nIf plans change sooner, you can book a call any time: ${bookingLink}\n\n— Premium Leads`
      : `Hi ${first},\n\nThanks — you're pre-qualified. Pick a time with a Premium Leads advisor here:\n${bookingLink}\n\nYour answers are already on their desk, so nothing is asked twice.\n\nReference pl:${record.id}\n\n— Premium Leads`;
  void sendEmail({ to: record.email, subject: destination === "nurture" ? "Thanks — we'll stay in touch" : "You're pre-qualified — pick a time", text });
}

/** Tells the team about a new lead (email to the contact recipient + Slack). */
export async function notifyNewLead(record: PrequalRecord, destination: RouteDestination, doorName: string, adminUrl: string): Promise<void> {
  const site = await readSetting("site");
  const cfg = await sendgridConfig();
  const summary = `${record.fullName} · ${record.company} · ${record.email}\nDoor: ${doorName}\nRouting: ${destination}\nClient type: ${record.clientType}\nBudget: ${String(record.answers.marketingBudget ?? "")}\nReadiness: ${String(record.answers.readiness ?? "")}\nWorking style: ${String(record.answers.servicePreference ?? "")}\n\n${adminUrl}`;
  if (cfg.apiKey && cfg.advisorNotify && site.contactEmail) {
    void sendEmail({ to: site.contactEmail, subject: `New lead: ${record.fullName} (${doorName})`, text: summary });
  }
  void notifySlack(`*New lead* — ${record.fullName} (${record.company}) via ${doorName} → ${destination}\n<${adminUrl}|Open in admin>`);
}

/** A contact-form message to the site's contact recipient. */
export async function forwardContactMessage(input: { name: string; email: string; company: string; phone: string; message: string; variantSlug: string | null }): Promise<void> {
  const site = await readSetting("site");
  if (!site.contactEmail) return;
  void sendEmail({
    to: site.contactEmail,
    subject: `Website message from ${input.name}`,
    text: `${input.name} <${input.email}>\n${input.company}${input.phone ? ` · ${input.phone}` : ""}${input.variantSlug ? `\nPage: /${input.variantSlug}` : ""}\n\n${input.message}`,
  });
}

/** Invite / temporary password email for admin users. */
export async function sendTemporaryPassword(input: { to: string; name: string; password: string; loginUrl: string; kind: "invite" | "reset" }): Promise<boolean> {
  const text =
    input.kind === "invite"
      ? `Hi ${input.name},\n\nYou've been invited to the Premium Leads site admin.\n\nSign in: ${input.loginUrl}\nEmail: ${input.to}\nTemporary password: ${input.password}\n\nYou'll be asked to choose a new password the first time you sign in.`
      : `Hi ${input.name},\n\nYour Premium Leads admin password was reset.\n\nSign in: ${input.loginUrl}\nTemporary password: ${input.password}\n\nYou'll be asked to choose a new password when you sign in.`;
  return sendEmail({ to: input.to, subject: input.kind === "invite" ? "Your Premium Leads admin invite" : "Your Premium Leads admin password was reset", text });
}

/** Slack incoming webhook (the "app/Slack" integration). */
export async function notifySlack(text: string): Promise<void> {
  const url = await getSecret("app.slackWebhookUrl");
  if (!url) return;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(5_000) });
  } catch (err) {
    console.error("[slack] notify failed", err instanceof Error ? err.message : err);
  }
}
