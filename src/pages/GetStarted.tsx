/**
 * /get-started — the pre-qualification intake, a pixel-faithful port of
 * Premium Leads Get Started.dc.html. The form definition comes from the server
 * (PREQUAL_FORM + the door section for `?variant=`); answers are validated
 * with the same `validateAnswers` the server enforces; the server decides the
 * routing and answers with the prefilled SmartScheduler link or nurture.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { api, type PrequalFormResponse, type SubmitResponse } from "../api";
import { onLinkClick, useQuery } from "../router";
import { Loading } from "../components/shared/chrome";
import { validateAnswers, type FormQuestion, type FormSection } from "../../shared/formSchema";

const SORA = "Sora, sans-serif";
type Answers = Record<string, string | string[]>;

const TITLES: Record<string, string> = { contact: "Contact", profile: "Who you are", goals: "Goals", readiness: "Timing", fit: "Working together" };
const DOOR_WORD: Record<string, string> = { recruiting: "hiring", agency: "agency", founders: "business", enterprise: "organization" };

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export default function GetStarted() {
  const query = useQuery();
  const door = query.get("variant") || "";
  const bvi = query.get("bvi") || "";
  const [data, setData] = useState<PrequalFormResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState<SubmitResponse | null>(null);

  useEffect(() => {
    let alive = true;
    api.prequalForm(door).then((d) => alive && setData(d)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [door]);
  useEffect(() => { document.title = "Get started — Premium Leads"; }, []);

  const sections: FormSection[] = useMemo(() => data?.form.sections ?? [], [data]);
  if (failed) return <div style={{ padding: 60, textAlign: "center", color: "#4A5B74" }}>The form could not be loaded. <a href="/" onClick={onLinkClick}>Back to the site</a></div>;
  if (!data) return <Loading />;

  const doorSlug = data.door.slug;
  const doorName = data.door.name;
  const doorNameLower = doorName.toLowerCase();
  const backHref = data.door.isHome ? "/" : `/${doorSlug}`;
  const bookingUrl = data.bookingUrl;
  const current = Math.min(step, Math.max(sections.length - 1, 0));
  const section = sections[current];
  const isFirst = current === 0;
  const isLast = current === sections.length - 1;
  const firstName = (String(answers.fullName || "")).trim().split(/\s+/)[0] || "there";

  const setAnswer = (id: string, value: string | string[]) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setErrors((e) => { const { [id]: _drop, ...rest } = e; return rest; });
  };

  /** Errors for the current section only, from the one shared rule set. */
  const validateSection = (s: FormSection): Record<string, string> => {
    const result = validateAnswers({ version: 1, sections: [s] }, answers);
    return result.ok ? {} : result.errors;
  };

  const next = async () => {
    const errs = validateSection(section);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (section.id === "contact") {
      // Returning-client shortcut: the same email already known → prefill the shared answers.
      try {
        const found = await api.lookup(String(answers.email || ""));
        if (found.known) {
          setAnswers((a) => ({
            ...a,
            servicePreference: a.servicePreference || found.servicePreference,
            marketingBudget: a.marketingBudget || found.marketingBudget,
            clientType: a.clientType || found.clientType,
            company: a.company || found.company,
          }));
          setSkipped(true);
        }
      } catch { /* unknown is fine */ }
    }
    if (!isLast) { setStep(current + 1); setErrors({}); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setBusy(true);
    setSubmitError("");
    try {
      const res = await api.submitPrequal({ ...answers, variantSlug: doorSlug, intervieweeId: bvi || undefined, hp: "" });
      setDone(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const e = err as { message?: string; body?: { fields?: Record<string, string> } };
      if (e.body?.fields) setErrors(e.body.fields);
      setSubmitError(e.message || "Could not save your answers. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const back = () => { setStep(Math.max(0, current - 1)); setErrors({}); };

  const stepsNav = sections.map((s, i) => {
    const active = i === current && !done;
    const past = i < current || !!done;
    return {
      n: String(i + 1),
      title: s.id === "door" ? `Your ${DOOR_WORD[doorSlug] ?? "team"}` : TITLES[s.id] ?? s.heading,
      bg: active ? "rgba(30,136,229,.1)" : "transparent",
      fg: active ? "#0C2E63" : past ? "#0B2347" : "#6B7A90",
      dotBg: past ? "#22C55E" : active ? "#1E88E5" : "rgba(11,35,71,.08)",
      dotFg: past || active ? "#fff" : "#6B7A90",
    };
  }).concat([{ n: "✓", title: "Book your call", bg: done ? "rgba(30,136,229,.1)" : "transparent", fg: done ? "#0C2E63" : "#6B7A90", dotBg: done ? "#1E88E5" : "rgba(11,35,71,.08)", dotFg: done ? "#fff" : "#6B7A90" }]);

  const nurture = data.nurture;
  const vars = { firstName, doorNameLower, doorName };

  return (
    <>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(246,249,253,.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(11,35,71,.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <a href={backHref} onClick={onLinkClick} style={{ display: "flex", alignItems: "center" }}><img src="/logo-wordmark.png" alt="Premium Leads" style={{ height: 32, width: "auto", display: "block" }} /></a>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 14, fontWeight: 600 }}>
            <span className="pl-hide-mobile" style={{ color: "#6B7A90" }}>Coming from: <span style={{ color: "#0B2347" }}>{doorName}</span></span>
            <a href={data.loginUrl} className="hov-bg-soft hov-ink" style={{ color: "#0B2347", padding: "9px 14px", borderRadius: 8, whiteSpace: "nowrap" }}>Log in</a>
          </div>
        </div>
      </header>

      <main className="pl-getstarted-main" style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 28px 104px", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)", gap: 48, alignItems: "start" }}>
        <aside className="pl-getstarted-aside" style={{ position: "sticky", top: 92, display: "grid", gap: 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#1E88E5" }}>Get started</div>
          <h1 style={{ fontFamily: SORA, fontWeight: 700, fontSize: "clamp(28px,3.4vw,40px)", lineHeight: 1.08, letterSpacing: "-.025em", margin: 0 }}>{data.heading}</h1>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#4A5B74", margin: 0 }}>A few questions so your advisor can prepare — then pick a time on the calendar. Nothing here is shared or published.</p>
          <ol style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 6 }}>
            {stepsNav.map((s, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, background: s.bg }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: s.dotBg, color: s.dotFg }}>{s.n}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: s.fg }}>{s.title}</span>
              </li>
            ))}
          </ol>
          <div style={{ fontSize: 13, color: "#6B7A90", lineHeight: 1.5, borderTop: "1px solid rgba(11,35,71,.1)", paddingTop: 14 }}>Takes about 3 minutes. Already did a Brand Voice Interview or Authority Desk intake? Use the same email — we'll skip what we already know.</div>
        </aside>

        <section style={{ display: "grid", gap: 20 }}>
          {!done && section && (
            <>
              <div style={{ background: "#fff", border: "1px solid rgba(11,35,71,.08)", borderRadius: 18, padding: 34, boxShadow: "0 24px 48px -40px rgba(12,46,99,.4)", display: "grid", gap: 22 }}>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#1E88E5", marginBottom: 8 }}>{section.kicker}</div>
                  <h2 style={{ fontFamily: SORA, fontWeight: 700, fontSize: 26, letterSpacing: "-.02em", margin: "0 0 6px" }}>{section.heading}</h2>
                  {section.note && <p style={{ margin: 0, fontSize: 14.5, color: "#6B7A90", lineHeight: 1.5 }}>{section.note}</p>}
                </div>
                {skipped && section.id === "fit" && <div style={{ background: "rgba(30,136,229,.08)", borderRadius: 10, padding: "12px 14px", fontSize: 13.5, color: "#0C2E63", lineHeight: 1.5 }}>We already have these answers from your Brand Voice Interview — confirm or update them.</div>}
                <div className="pl-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {section.questions.map((q) => <Question key={q.id} q={q} value={answers[q.id]} error={errors[q.id]} onChange={(v) => setAnswer(q.id, v)} />)}
                </div>
                {submitError && <div style={{ fontSize: 13.5, color: "#B02A2A", fontWeight: 600 }}>{submitError}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderTop: "1px solid rgba(11,35,71,.08)", paddingTop: 20, flexWrap: "wrap" }}>
                  <button type="button" onClick={back} disabled={isFirst} style={{ cursor: "pointer", background: "#fff", border: "1px solid rgba(11,35,71,.12)", color: "#33465F", borderRadius: 9, padding: "12px 18px", fontWeight: 700, fontSize: 14.5, fontFamily: "inherit" }}>← Back</button>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 13, color: "#6B7A90" }}>Step {current + 1} of {sections.length}</span>
                    <button type="button" onClick={next} disabled={busy} className="hov-bg-blue" style={{ cursor: "pointer", background: "#0C2E63", color: "#fff", border: 0, borderRadius: 9, padding: "13px 22px", fontWeight: 700, fontSize: 14.5, fontFamily: "inherit", transition: "background .2s" }}>{busy ? "Saving…" : isLast ? "Finish & see next step →" : "Continue →"}</button>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: "#6B7A90", textAlign: "center" }}>Prefer to talk first? <a href={bookingUrl} target="_blank" rel="noopener" style={{ fontWeight: 700 }}>Book a call without the form →</a></div>
            </>
          )}

          {done && done.destination === "book" && (
            <div style={{ background: "#0C2E63", backgroundImage: "radial-gradient(600px 360px at 100% 0%, rgba(0,178,239,.35), transparent 60%)", color: "#fff", borderRadius: 18, padding: 40, display: "grid", gap: 18, boxShadow: "0 30px 60px -36px rgba(12,46,99,.6)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#00B2EF" }}>You're pre-qualified</div>
              <h2 style={{ fontFamily: SORA, fontWeight: 700, fontSize: "clamp(26px,3.4vw,38px)", letterSpacing: "-.02em", lineHeight: 1.08, margin: 0, color: "#fff" }}>{firstName}, let's pick a time.</h2>
              <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.6, color: "rgba(255,255,255,.78)", maxWidth: "52ch" }}>A Premium Leads advisor will walk through your {doorNameLower} goals and show you exactly what your first campaign looks like. Your answers are already on their desk.</p>
              <div><a href={done.bookingUrl} target="_blank" rel="noopener" className="hov-lift hov-night" style={{ display: "inline-block", background: "#00B2EF", color: "#0D1B2E", fontWeight: 700, fontSize: 16, padding: "16px 28px", borderRadius: 10, transition: "transform .2s" }}>Book your call →</a></div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>Reference {done.ref} · 15 minutes · No obligation</div>
            </div>
          )}
          {done && done.destination !== "book" && (
            <div style={{ background: "#fff", border: "1px solid rgba(11,35,71,.08)", borderRadius: 18, padding: 40, display: "grid", gap: 16, boxShadow: "0 24px 48px -40px rgba(12,46,99,.4)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#1E88E5" }}>{fill(nurture.eyebrow || "Thanks, {firstName}", vars)}</div>
              <h2 style={{ fontFamily: SORA, fontWeight: 700, fontSize: "clamp(26px,3.4vw,38px)", letterSpacing: "-.02em", lineHeight: 1.08, margin: 0 }}>{fill(nurture.heading || "Good timing matters. We'll stay in touch.", vars)}</h2>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "#4A5B74", maxWidth: "52ch" }}>{fill(nurture.body, vars)}</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href="/resources" onClick={onLinkClick} className="hov-bg-blue" style={{ display: "inline-block", background: "#0C2E63", color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "12px 20px", borderRadius: 9 }}>{nurture.primaryLabel || "Explore resources"}</a>
                <a href={bookingUrl} target="_blank" rel="noopener" style={{ display: "inline-block", color: "#0B2347", fontWeight: 700, fontSize: 14.5, padding: "12px 4px", borderBottom: "2px solid rgba(11,35,71,.2)" }}>{nurture.secondaryLabel || "Book a call anyway →"}</a>
              </div>
            </div>
          )}
          {done && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12.5, fontWeight: 700 }}>
              <Badge on label="Saved to Premium Leads" />
              <Badge on={done.relayed} label={done.relayed ? "Synced to The Authority Desk" : "Authority Desk sync pending"} />
              <Badge on={done.relayed} label={done.relayed ? "Card created in Brand Voice Interview" : "Brand Voice Interview card via Authority Desk"} />
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function Badge({ on, label }: { on: boolean; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid rgba(11,35,71,.1)", borderRadius: 100, padding: "6px 12px", color: "#33465F" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: on ? "#22C55E" : "rgba(217,119,6,.8)" }} />{label}
    </span>
  );
}

function Question({ q, value, error, onChange }: { q: FormQuestion; value: string | string[] | undefined; error?: string; onChange: (v: string | string[]) => void }) {
  const isOptions = q.type === "radio" || q.type === "checkbox";
  const val = value ?? (q.type === "checkbox" ? [] : "");
  const border = error ? "#B02A2A" : "rgba(11,35,71,.15)";
  const input: CSSProperties = { border: `1px solid ${border}`, borderRadius: 9, padding: "12px 14px", fontSize: 15, color: "#0B2347" };
  return (
    <div style={{ gridColumn: q.width === "half" ? "auto" : "1 / -1", display: "grid", gap: 8 }}>
      <label htmlFor={`field-${q.id}`} style={{ fontSize: 14, fontWeight: 700, color: "#0B2347" }}>{q.label}{q.required && <span style={{ color: "#1E88E5" }}> *</span>}</label>
      {q.hint && <div style={{ fontSize: 13, color: "#6B7A90", marginTop: -4 }}>{q.hint}</div>}
      {!isOptions && q.type !== "textarea" && (
        <input id={`field-${q.id}`} type={q.type} name={q.id} value={val as string} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} autoComplete={q.id === "email" ? "email" : q.id === "fullName" ? "name" : q.id === "phone" ? "tel" : q.id === "company" ? "organization" : q.id === "website" ? "url" : undefined} style={input} />
      )}
      {q.type === "textarea" && (
        <textarea id={`field-${q.id}`} name={q.id} value={val as string} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...input, resize: "vertical", lineHeight: 1.5 }} />
      )}
      {isOptions && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${q.columns},minmax(0,1fr))`, gap: 8 }}>
          {q.options.map((o) => {
            const on = q.type === "checkbox" ? (val as string[]).includes(o.value) : val === o.value;
            const pick = () => onChange(q.type === "checkbox" ? (on ? (val as string[]).filter((x) => x !== o.value) : [...(val as string[]), o.value]) : o.value);
            return (
              <button key={o.value} type="button" onClick={pick} role={q.type === "checkbox" ? "checkbox" : "radio"} aria-checked={on} style={{ cursor: "pointer", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 10, border: `1px solid ${on ? "#1E88E5" : "rgba(11,35,71,.14)"}`, background: on ? "rgba(30,136,229,.08)" : "#fff", borderRadius: 10, padding: "11px 13px", fontSize: 14, lineHeight: 1.4, color: "#0B2347", fontFamily: "inherit" }}>
                <span style={{ flex: "none", marginTop: 2, width: 16, height: 16, borderRadius: q.type === "radio" ? "50%" : 4, border: `2px solid ${on ? "#1E88E5" : "rgba(11,35,71,.3)"}`, background: on && q.type === "checkbox" ? "#1E88E5" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: on && q.type === "radio" ? "#1E88E5" : "transparent" }} /></span>{o.label}
              </button>
            );
          })}
        </div>
      )}
      {error && <div style={{ fontSize: 13, color: "#B02A2A", fontWeight: 600 }}>{error}</div>}
    </div>
  );
}
