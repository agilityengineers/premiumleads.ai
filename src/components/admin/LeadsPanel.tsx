/** Leads: one row per contact with door, status and AD/BVI sync badges; opens to the newest submission's answers and the timeline. */
import { useEffect, useState } from "react";
import { api } from "../../api";
import { navigate, onLinkClick } from "../../router";
import { CONTACT_SOURCE_LABELS, CONTACT_STATUS_LABELS, type ContactEventRecord, type ContactRecord, type ContactStatus, type SyncBadge } from "../../../shared/contactsSchema";
import type { PrequalRecord } from "../../../shared/prequalificationSchema";
import { DESTINATION_LABELS, type RouteDestination } from "../../../shared/routingSchema";
import { answerText } from "../../../shared/formSchema";
import { BUILTIN_BY_SLUG } from "../../content/variants";
import { AMBER, BLUE, Chip, ErrorText, GREEN, GREY, Loading, MONO, RED, btnOutline, card, errorMessage, formatWhen, input, kicker, useLoader } from "./ui";

type Detail = { contact: ContactRecord; events: ContactEventRecord[]; submissions: PrequalRecord[] };
type DetailState = Detail | { error: string };

const statusColors = (s: ContactStatus) => (s === "qualified" ? GREEN : s === "nurture" ? AMBER : s === "call_booked" ? BLUE : GREY);
const SOURCE_COLORS: Record<ContactEventRecord["source"], { bg: string; fg: string }> = { pl: BLUE, ad: GREY, bvi: AMBER, ss: GREEN };

function SyncChip({ kind, state, error }: { kind: "AD" | "BVI"; state: SyncBadge; error?: string | null }) {
  if (state === "none") return null;
  const system = kind === "AD" ? "Authority Desk" : "Brand Voice Interview";
  const map: Record<Exclude<SyncBadge, "none">, { text: string; c: { bg: string; fg: string }; title: string }> = {
    synced: { text: `${kind} ✓`, c: GREEN, title: `Synced to ${system}` },
    pending: { text: `${kind} …`, c: GREY, title: `${system} sync pending` },
    failed: { text: `${kind} ✕`, c: RED, title: error || `${system} sync failed` },
    parked: { text: `${kind} refused`, c: RED, title: error || `${system} refused this lead` },
    not_configured: { text: `${kind} —`, c: GREY, title: `${system} is not configured` },
  };
  const m = map[state];
  return <Chip small bg={m.c.bg} fg={m.c.fg} title={m.title}>{m.text}</Chip>;
}

const newest = (subs: PrequalRecord[]): PrequalRecord | undefined => [...subs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

export default function LeadsPanel({ openId }: { openId: number | null }) {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const { data, error, setData } = useLoader(async () => {
    const [c, v] = await Promise.all([api.contacts({ limit: 200, q: query || undefined }), api.adminVariants().catch(() => null)]);
    return { contacts: c.contacts, total: c.total, doors: Object.fromEntries((v?.variants ?? []).map((x) => [x.slug, x.label])) };
  }, [query]);
  const [details, setDetails] = useState<Record<number, DetailState>>({});
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    if (openId == null || details[openId]) return;
    let alive = true;
    api.contactDetail(openId)
      .then((d) => { if (alive) setDetails((x) => ({ ...x, [openId]: d })); })
      .catch((e: unknown) => { if (alive) setDetails((x) => ({ ...x, [openId]: { error: errorMessage(e) } })); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  if (error) return <ErrorText>{error}</ErrorText>;

  const doorLabel = (c: ContactRecord) => (c.variantSlug ? data?.doors[c.variantSlug] ?? BUILTIN_BY_SLUG[c.variantSlug]?.label ?? c.variantSlug : CONTACT_SOURCE_LABELS[c.source] ?? c.source);
  const toggle = (c: ContactRecord, open: boolean) => navigate(open ? "/admin/leads" : `/admin/leads/${c.id}`, { scrollTop: false });

  async function retry(c: ContactRecord, sub: PrequalRecord) {
    setBusy(sub.id);
    try {
      await api.resync(sub.id);
      const d = await api.contactDetail(c.id);
      setDetails((x) => ({ ...x, [c.id]: d }));
      setData((x) => x && { ...x, contacts: x.contacts.map((cc) => (cc.id === c.id ? d.contact : cc)) });
    } catch (e) {
      setDetails((x) => {
        const cur = x[c.id];
        return cur && "contact" in cur ? { ...x, [c.id]: { ...cur, submissions: cur.submissions.map((s) => (s.id === sub.id ? { ...s, authorityDesk: { ...s.authorityDesk, error: errorMessage(e) } } : s)) } } : x;
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or company" aria-label="Search leads" style={{ ...input, flex: "1 1 280px", maxWidth: 420, background: "#fff" }} />
        {data && <span style={{ fontSize: 12.5, color: "#6B7A90" }}>{data.total} {data.total === 1 ? "lead" : "leads"}{query ? ` match “${query}”` : ""}</span>}
      </div>
      {!data && <Loading />}
      {data && data.contacts.length === 0 && !query && (
        <div style={{ background: "#fff", border: "1px dashed rgba(11,35,71,.2)", borderRadius: 16, padding: 40, textAlign: "center", color: "#6B7A90", fontSize: 14.5 }}>
          No submissions yet. <a href="/get-started?variant=sales" onClick={onLinkClick}>Try the form</a> and the lead will appear here.
        </div>
      )}
      {data && data.contacts.length === 0 && query && (
        <div style={{ background: "#fff", border: "1px dashed rgba(11,35,71,.2)", borderRadius: 16, padding: 40, textAlign: "center", color: "#6B7A90", fontSize: 14.5 }}>No leads match “{query}”.</div>
      )}
      {data && (
        <div style={{ display: "grid", gap: 10 }}>
          {data.contacts.map((c) => {
            const open = openId === c.id;
            const detail = details[c.id];
            const loaded = detail && "contact" in detail ? detail : null;
            const latest = loaded ? newest(loaded.submissions) : undefined;
            const answers = (latest?.answers ?? {}) as Record<string, unknown>;
            const st = statusColors(c.status);
            const adError = latest?.authorityDesk.error ?? null;
            return (
              <div key={c.id} style={{ ...card, borderRadius: 14, overflow: "hidden" }}>
                <button type="button" onClick={() => toggle(c, open)} className="pl-lead-row" style={{ width: "100%", cursor: "pointer", background: "none", border: 0, padding: "14px 20px", textAlign: "left", display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1.4fr) minmax(0,1.2fr) auto", gap: 14, alignItems: "center", fontFamily: "inherit", color: "#0B2347" }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{c.fullName || c.email} {c.company && <span style={{ fontWeight: 500, color: "#6B7A90" }}>· {c.company}</span>}</span>
                    <span style={{ display: "block", fontSize: 12.5, color: "#6B7A90" }}>{c.email} · {formatWhen(c.createdAt)}</span>
                  </span>
                  <span style={{ fontSize: 12.5, color: "#4A5B74" }}><span style={{ display: "block", fontWeight: 700, color: "#0B2347" }}>{doorLabel(c)}</span>{answerText(answers.clientType) || latest?.clientType || c.latest?.clientType || ""}</span>
                  <span style={{ fontSize: 12.5, color: "#4A5B74" }}><span style={{ display: "block", fontWeight: 700, color: "#0B2347" }}>{answerText(answers.marketingBudget) || c.latest?.marketingBudget || ""}</span>{answerText(answers.readiness) || c.latest?.readiness || ""}</span>
                  <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Chip bg={st.bg} fg={st.fg}>{CONTACT_STATUS_LABELS[c.status] ?? c.status}</Chip>
                    <SyncChip kind="AD" state={c.sync.authorityDesk} error={adError} />
                    <SyncChip kind="BVI" state={c.sync.brandVoice} />
                  </span>
                </button>
                {open && (
                  <div style={{ borderTop: "1px solid rgba(11,35,71,.08)", padding: "16px 20px", display: "grid", gap: 14 }}>
                    {!detail && <Loading />}
                    {detail && "error" in detail && <ErrorText>{detail.error}</ErrorText>}
                    {loaded && (
                      <>
                        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12.5, color: "#6B7A90" }}>
                          <span>Ref <span style={{ fontFamily: MONO, color: "#0B2347" }}>{latest ? `pl:${latest.id}` : "—"}</span></span>
                          <span>Routing <span style={{ color: "#0B2347", fontWeight: 600 }}>{destinationLabel(latest?.routingDestination ?? loaded.contact.routingDestination)}</span></span>
                          <span>Brand Voice card <span style={{ fontFamily: MONO, color: "#0B2347" }}>{loaded.contact.bviIntervieweeId ?? latest?.authorityDesk.intervieweeId ?? "—"}</span></span>
                          <span>Working style <span style={{ color: "#0B2347", fontWeight: 600 }}>{answerText(answers.servicePreference) || "—"}</span></span>
                        </div>
                        {latest && (latest.authorityDesk.error || latest.authorityDesk.parked) && (
                          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                            <ErrorText>{latest.authorityDesk.parked ? `The Authority Desk refused this submission${latest.authorityDesk.error ? `: ${latest.authorityDesk.error}` : "."}` : latest.authorityDesk.error}</ErrorText>
                            <button type="button" onClick={() => retry(c, latest)} disabled={busy === latest.id} style={btnOutline}>{busy === latest.id ? "Retrying…" : "Retry Authority Desk sync"}</button>
                          </div>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 10 }}>
                          {detailEntries(loaded.contact, answers).map((d) => (
                            <div key={d.k} style={{ background: "#F1F5FA", borderRadius: 9, padding: "9px 12px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#6B7A90", fontFamily: MONO }}>{d.k}</div>
                              <div style={{ fontSize: 13.5, color: "#0B2347", lineHeight: 1.45 }}>{d.v}</div>
                            </div>
                          ))}
                        </div>
                        {loaded.submissions.length > 1 && <div style={{ fontSize: 12.5, color: "#6B7A90" }}>{loaded.submissions.length} submissions — showing the newest.</div>}
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={kicker}>Timeline</div>
                          {loaded.events.length === 0 && <div style={{ fontSize: 13, color: "#6B7A90" }}>No events recorded yet.</div>}
                          {loaded.events.map((e) => (
                            <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 13, flexWrap: "wrap" }}>
                              <Chip small bg={SOURCE_COLORS[e.source]?.bg ?? GREY.bg} fg={SOURCE_COLORS[e.source]?.fg ?? GREY.fg} title={e.eventType}>{e.source.toUpperCase()}</Chip>
                              <span style={{ flex: "1 1 240px", color: "#0B2347" }}>{e.summary}</span>
                              <span style={{ color: "#6B7A90", whiteSpace: "nowrap" }}>{formatWhen(e.occurredAt)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function destinationLabel(d: RouteDestination | string | null | undefined): string {
  if (!d) return "—";
  return (DESTINATION_LABELS as Record<string, string>)[d] ?? d;
}

function detailEntries(contact: ContactRecord, answers: Record<string, unknown>): { k: string; v: string }[] {
  const out = Object.entries(answers)
    .filter(([, v]) => v != null && String(Array.isArray(v) ? v.join("") : v).length > 0)
    .map(([k, v]) => ({ k, v: answerText(v) || String(v) }));
  if (out.length) return out;
  const fallback: [string, string | null][] = [["email", contact.email], ["phone", contact.phone], ["company", contact.company], ["source", CONTACT_SOURCE_LABELS[contact.source] ?? contact.source]];
  return fallback.filter(([, v]) => v).map(([k, v]) => ({ k, v: v as string }));
}
