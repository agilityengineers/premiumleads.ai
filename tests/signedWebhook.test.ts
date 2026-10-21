import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { signPayload, signedHeaders, verifySignature, verifyBodySignature } from "../server/signing";
import { buildLeadCreated, buildLeadUpdated, externalRef } from "../server/authorityDesk";
import { prefilledBookingUrl } from "../server/routes";
import { verifySchedulerSignature } from "../server/smartScheduler";
import type { PrequalRecord } from "../shared/prequalificationSchema";

const secret = "shared-secret-for-tests";

const record: PrequalRecord = {
  id: 42,
  fullName: "Jordan Avery",
  email: "Jordan@Example.com",
  phone: "(555) 123-4567",
  company: "Avery Logistics",
  clientType: "Sales leader",
  variantSlug: "sales",
  routingDestination: "book",
  contactId: 7,
  createdAt: "2026-10-21T22:00:00.000Z",
  answers: {
    fullName: "Jordan Avery", email: "jordan@example.com", phone: "(555) 123-4567", company: "Avery Logistics", clientType: "Sales leader",
    servicePreference: "Done-for-you (DFY)", marketingBudget: "$1,500 - $5,000/month", orderRef: "", variantSlug: "sales", teamSize: "2–5",
  },
  authorityDesk: { contactId: null, intervieweeId: null, bookingUrl: null, syncedAt: null, error: null, attempts: 0, parked: false },
};

describe("signed webhook sender (PL → Authority Desk)", () => {
  it("signs timestamp.body with HMAC-SHA256 and the receiver verifies it", () => {
    const body = JSON.stringify({ hello: "world" });
    const now = 1_760_000_000;
    const headers = signedHeaders(secret, body, now);
    expect(headers["X-Timestamp"]).toBe(String(now));
    expect(headers["X-Signature"]).toBe(crypto.createHmac("sha256", secret).update(`${now}.${body}`).digest("hex"));
    expect(verifySignature(Buffer.from(body), headers["X-Timestamp"], headers["X-Signature"], secret, now)).toBe("ok");
  });

  it("refuses a tampered body, a wrong secret, a stale timestamp and a missing header", () => {
    const body = JSON.stringify({ amount: 1 });
    const now = 1_760_000_000;
    const sig = signPayload(secret, String(now), body);
    expect(verifySignature(Buffer.from(JSON.stringify({ amount: 2 })), String(now), sig, secret, now)).toBe("mismatch");
    expect(verifySignature(Buffer.from(body), String(now), sig, "other", now)).toBe("mismatch");
    expect(verifySignature(Buffer.from(body), String(now), sig, secret, now + 6 * 60)).toBe("stale");
    expect(verifySignature(Buffer.from(body), undefined, sig, secret, now)).toBe("missing");
    expect(verifySignature(Buffer.from(body), String(now), sig, "", now)).toBe("no-secret");
  });

  it("builds one lead.created with our external ref, a lowercased email and the whole answer set", () => {
    const payload = buildLeadCreated(record, null) as Record<string, unknown>;
    expect(payload.eventType).toBe("lead.created");
    expect(payload.source).toBe("premium_leads");
    expect(payload.externalRef).toBe("pl:42");
    expect(externalRef(42)).toBe("pl:42");
    expect(payload.submissionId).toBe(42);
    expect(payload.variantSlug).toBe("sales");
    expect(payload.routingDestination).toBe("book");
    expect(payload.status).toBe("qualified");
    expect(payload.intervieweeId).toBeNull();
    expect((payload.contact as { email: string }).email).toBe("jordan@example.com");
    expect(payload.answers).toEqual(record.answers);
    expect(typeof payload.eventId).toBe("string");
    expect((payload.eventId as string).length).toBeGreaterThan(20);
  });

  it("passes a known Brand Voice id through and tags nurture leads", () => {
    const payload = buildLeadCreated({ ...record, routingDestination: "nurture" }, "bvi-uuid") as Record<string, unknown>;
    expect(payload.intervieweeId).toBe("bvi-uuid");
    expect(payload.status).toBe("nurture");
  });

  it("never names the Brand Voice Interview as a target", () => {
    const text = JSON.stringify(buildLeadCreated(record, null));
    expect(text).not.toMatch(/brand-voice-interview\.com|\/api\/integrations\/authority-desk\/onboarding/);
  });

  it("builds lead.updated with the same ref for a booked call", () => {
    const payload = buildLeadUpdated({ submissionId: 42, contactId: 7, email: "Jordan@Example.com", intervieweeId: null, adContactId: "ad-1", changes: { status: "call_booked" } }) as Record<string, unknown>;
    expect(payload.eventType).toBe("lead.updated");
    expect(payload.externalRef).toBe("pl:42");
    expect(payload.status).toBe("call_booked");
    expect(payload.adContactId).toBe("ad-1");
    expect((payload.contact as { email: string }).email).toBe("jordan@example.com");
  });
});

describe("SmartScheduler link + webhook", () => {
  it("prefills name, lowercased email and external_id=pl:<id>", () => {
    const url = new URL(prefilledBookingUrl("https://smart-scheduler.ai/fabp/booking/premiumleads-discovery", "Jordan Avery", "Jordan@Example.com", 42));
    expect(url.searchParams.get("name")).toBe("Jordan Avery");
    expect(url.searchParams.get("email")).toBe("jordan@example.com");
    expect(url.searchParams.get("external_id")).toBe("pl:42");
    expect(prefilledBookingUrl("https://x.test/book?team=a", "A", "b@c.d", 1)).toContain("?team=a&name=");
  });

  it("accepts a body-only HMAC or the timestamped form, and refuses a mismatch", () => {
    const body = Buffer.from(JSON.stringify({ event: "appointment.created" }));
    const bodySig = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyBodySignature(body, bodySig, secret)).toBe(true);
    expect(verifyBodySignature(body, `sha256=${bodySig}`, secret)).toBe(true);
    expect(verifySchedulerSignature(body, { signature: bodySig }, secret)).toBe("ok");
    expect(verifySchedulerSignature(body, { signature: "deadbeef" }, secret)).toBe("mismatch");
    expect(verifySchedulerSignature(body, {}, secret)).toBe("missing");
    expect(verifySchedulerSignature(body, {}, "")).toBe("unsigned-accepted");
  });
});
