/**
 * The landing page template at "/" and "/<slug>" — a pixel-faithful port of
 * Premium Leads.dc.html. One template, one record per audience; the StoryBrand
 * section order as designed: hero → trust → problem → guide → plan →
 * capabilities → stakes & success → use cases → integrations → proof →
 * (pricing) → resources → FAQ → CTA. Section and capability toggles come from
 * the admin settings; CTAs resolve by ctaMode.
 */
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { api, trackCta } from "../api";
import { navigate, onLinkClick, useQuery } from "../router";
import { PublicHeader, PublicFooter, Eyebrow, H2, Loading } from "../components/shared/chrome";
import { CAP_BY_KEY, CAPS } from "../content/caps";
import { BUILTIN_BY_SLUG } from "../content/variants";
import { ctaHref as resolveHref } from "../../shared/cta";
import { sectionOn, capabilityOn, DEFAULT_SITE_SETTINGS } from "../../shared/siteDefaults";
import type { PublicConfig } from "../../shared/siteSettingsSchema";
import type { PublicVariant } from "../../shared/variantSchema";
import type { ResourceRecord } from "../../shared/resourceSchema";
import { resourceInitials } from "../../shared/resourceText";

const SORA = "Sora, sans-serif";
const card: CSSProperties = { background: "#fff", border: "1px solid rgba(11,35,71,.08)", borderRadius: 16 };

const DEFAULT_CONFIG: PublicConfig = { site: DEFAULT_SITE_SETTINGS, sections: {}, capabilities: {}, pricing: { tiers: [] }, analytics: { ga4: "", metaPixel: "", linkedinTag: "" }, pages: [] };

/**
 * Paint instantly from the bundled copy for a built-in slug (the home page is
 * "sales" until the admin picks another), then re-render from the API — the
 * same first-paint rule as The Authority Desk. A custom slug waits for the API.
 */
function bundledVariant(slug: string): PublicVariant | null {
  const b = BUILTIN_BY_SLUG[slug || "sales"];
  if (!b) return null;
  return { slug: b.slug, label: b.label, audience: b.audience, content: b.content, bookingUrl: DEFAULT_SITE_SETTINGS.bookingUrl, ctaMode: "prequalify", isHome: !slug };
}

export default function Landing({ slug }: { slug: string }) {
  const query = useQuery();
  const preview = query.get("preview") === "1";
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [variant, setVariant] = useState<PublicVariant | null>(() => bundledVariant(slug));
  const [notFound, setNotFound] = useState(false);
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [showPills, setShowPills] = useState(false);

  useEffect(() => {
    let alive = true;
    api.config().then((c) => alive && setConfig(c)).catch(() => alive && setConfig(DEFAULT_CONFIG));
    api.featuredResources().then((r) => alive && setResources(r)).catch(() => undefined);
    api.session().then((s) => alive && setShowPills(preview || s.authenticated)).catch(() => alive && setShowPills(preview));
    return () => { alive = false; };
  }, [preview]);

  useEffect(() => {
    let alive = true;
    setNotFound(false);
    setVariant(bundledVariant(slug));
    api.variant(slug, preview)
      .then((v) => { if (alive) setVariant(v); })
      .catch(() => { if (alive) { setVariant(null); setNotFound(true); } });
    return () => { alive = false; };
  }, [slug, preview]);

  useEffect(() => {
    if (variant?.content.metaTitle) document.title = variant.content.metaTitle;
  }, [variant]);

  if (!variant && !notFound) return <Loading />;
  const site = (config ?? DEFAULT_CONFIG).site;
  const cfg = config ?? DEFAULT_CONFIG;
  if (!variant) return <NotFound loginUrl={site.loginUrl} />;

  const v = variant.content;
  const ctaMode = variant.ctaMode;
  const ctaHref = resolveHref(ctaMode, variant.slug, variant.bookingUrl);
  const ctaTarget = ctaMode === "book-call" ? "_blank" : "_self";
  const ctaLabel = ctaMode === "book-call" ? "Book a call →" : "Get started →";
  const ctaLabelShort = ctaMode === "book-call" ? "Book a call" : "Get started";
  const ctaMicro = ctaMode === "book-call" ? v.ctaMicro : "3-minute intake · then pick a time · no obligation";
  const track = () => trackCta(variant.slug);
  const sec = (key: Parameters<typeof sectionOn>[1]) => sectionOn(cfg.sections, key);
  const showForm = sec("contactForm") && ctaMode === "book-call";
  const showIntakeCard = ctaMode !== "book-call" && sec("contactForm");
  const order = v.capOrder && v.capOrder.length ? v.capOrder : CAPS.map((c) => c.key);
  const capabilities = order.map((k) => CAP_BY_KEY[k]).filter(Boolean).filter((c) => capabilityOn(cfg.capabilities, c.key)).map((c) => ({ ...c, body: v.capCopy?.[c.key] || c.body }));
  const steps = (v.steps || []).map((st, i) => ({ ...st, n: String(i + 1).padStart(2, "0") }));
  const pages = cfg.pages.length ? cfg.pages : Object.values(BUILTIN_BY_SLUG).map((b) => ({ slug: b.slug, label: b.label, short: b.content.short, kicker: b.content.kicker, desc: b.content.desc }));
  const pathFor = (s: string) => (s === site.defaultVariant ? "/" : `/${s}`);
  const pick = (s: string) => navigate(pathFor(s) + (preview ? "?preview=1" : ""));
  const tiers = (cfg.pricing?.tiers || []).map((t) => ({ ...t, featureList: String(t.features || "").split("\n").filter(Boolean) }));

  const CtaLink = ({ style, className, label }: { style: CSSProperties; className?: string; label?: string }) => (
    <a href={ctaHref} target={ctaTarget} rel="noopener" onClick={(e) => { track(); if (ctaTarget === "_self") onLinkClick(e); }} className={className} style={style}>{label ?? ctaLabel}</a>
  );

  return (
    <>
      <PublicHeader slug={variant.isHome ? "" : variant.slug} ctaHref={ctaHref} ctaTarget={ctaTarget} ctaLabelShort={ctaLabelShort} onCtaClick={track} loginUrl={site.loginUrl} />

      {/* Hero */}
      <section id="top" style={{ position: "relative", overflow: "hidden", padding: "var(--pl-hero-top) var(--pl-gutter) var(--pl-hero-bottom)", background: "radial-gradient(900px 480px at 85% 0%, rgba(0,178,239,.16), transparent 60%), radial-gradient(700px 400px at 0% 100%, rgba(30,136,229,.12), transparent 60%)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "var(--pl-gap)", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#1E88E5", marginBottom: 22 }}>{v.eyebrow}</div>
            <h1 style={{ fontFamily: SORA, fontWeight: 700, fontSize: "clamp(38px,5vw,64px)", lineHeight: 1.04, letterSpacing: "-.025em", margin: "0 0 22px", color: "#0B2347" }}>
              {v.h1a}<br /><span style={{ background: "linear-gradient(90deg,#1E88E5,#00B2EF)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{v.h1b}</span>
            </h1>
            <p style={{ fontSize: 18.5, lineHeight: 1.6, color: "#4A5B74", margin: "0 0 32px", maxWidth: "34em", textWrap: "pretty" as never }}>{v.sub}</p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <CtaLink className="pl-hero-cta hov-lift hov-white" style={{ background: "linear-gradient(135deg,#1E88E5,#0C2E63)", color: "#fff", fontWeight: 700, fontSize: 16, padding: "16px 26px", borderRadius: 10, boxShadow: "0 14px 30px -12px rgba(30,136,229,.6)", transition: "transform .2s" }} />
              <a href="#how" onClick={onLinkClick} className="hov-border-blue hov-ink" style={{ color: "#0B2347", fontWeight: 600, fontSize: 16, padding: "16px 10px", borderBottom: "2px solid rgba(11,35,71,.2)" }}>{v.ctaTransitional}</a>
            </div>
            <div style={{ display: "flex", gap: 28, marginTop: 40, flexWrap: "wrap" }}>
              {(v.stats || []).map((s, i) => (
                <div key={i}><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 26, color: "#0C2E63", letterSpacing: "-.02em" }}>{s.v}</div><div style={{ fontSize: 13, color: "#6B7A90", fontWeight: 600 }}>{s.l}</div></div>
              ))}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "relative", borderRadius: 18, background: "#0D1B2E", padding: 10, boxShadow: "0 40px 80px -30px rgba(12,46,99,.45)" }}>
              <div style={{ position: "relative", aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", background: "#06101E" }}>
                <HeroVideo vimeoId={site.vimeoId || "756896760"} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 8px 4px", color: "rgba(255,255,255,.7)", fontSize: 12.5, fontWeight: 600 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><img src="/logo-icon.png" alt="" width={18} height={18} style={{ width: 18, height: 18, borderRadius: 4, objectFit: "contain" }} /> Platform overview</span>
                <span style={{ color: "#00B2EF" }}>2 min</span>
              </div>
            </div>
            <div className="pl-hero-chip-top" style={{ position: "absolute", top: -22, right: -14, background: "#fff", border: "1px solid rgba(11,35,71,.1)", borderRadius: 12, padding: "12px 16px", boxShadow: "0 18px 36px -18px rgba(11,35,71,.35)", animation: "pl-float 6s ease-in-out infinite" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#6B7A90" }}>Channels live</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {(v.channels || []).map((ch) => <span key={ch} style={{ fontSize: 12, fontWeight: 700, color: "#0C2E63", background: "rgba(30,136,229,.1)", padding: "4px 8px", borderRadius: 6 }}>{ch}</span>)}
              </div>
            </div>
            <div className="pl-hero-chip-bottom" style={{ position: "absolute", bottom: -20, left: -16, background: "#fff", border: "1px solid rgba(11,35,71,.1)", borderRadius: 12, padding: "12px 16px", boxShadow: "0 18px 36px -18px rgba(11,35,71,.35)", display: "flex", alignItems: "center", gap: 10, animation: "pl-float 7s ease-in-out 1s infinite" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 0 4px rgba(34,197,94,.18)" }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0B2347" }}>{v.chip}</span>
            </div>
          </div>
        </div>
      </section>

      {sec("trustStrip") && (
        <div style={{ borderTop: "1px solid rgba(11,35,71,.08)", borderBottom: "1px solid rgba(11,35,71,.08)", background: "#fff" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px var(--pl-gutter)", display: "flex", justifyContent: "center", gap: "16px 36px", flexWrap: "wrap", fontSize: 13.5, fontWeight: 600, color: "#4A5B74", letterSpacing: ".02em" }}>
            {(v.trust || []).map((t) => <span key={t}>{t}</span>)}
          </div>
        </div>
      )}

      {sec("problem") && (
        <section id="problem" style={{ padding: "var(--pl-sec) var(--pl-gutter) 0" }}>
          <div className="pl-cq" style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ maxWidth: 760, marginBottom: 44 }}>
              <Eyebrow>{v.problemEyebrow}</Eyebrow>
              <h2 style={{ ...H2, margin: "0 0 16px" }}>{v.problemHeading}</h2>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#4A5B74" }}><span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#6B7A90" }}>The villain</span><span style={{ color: "#0B2347" }}>{v.villain}</span></div>
            </div>
            <div className="pl-trio" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 1, background: "rgba(11,35,71,.1)", border: "1px solid rgba(11,35,71,.1)", borderRadius: 16, overflow: "hidden" }}>
              {(v.problems || []).map((p, i) => (
                <div key={i} style={{ background: "#fff", padding: "calc(var(--pl-card-md) + 4px) var(--pl-card-md)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#1E88E5", marginBottom: 14 }}>{p.kind}</div>
                  <h3 style={{ fontFamily: SORA, fontWeight: 600, fontSize: 20, margin: "0 0 10px", color: "#0B2347" }}>{p.title}</h3>
                  <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#4A5B74", margin: 0 }}>{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {sec("engine") && (
        <section id="engine" style={{ padding: "var(--pl-sec) var(--pl-gutter)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))", gap: "var(--pl-gap)", alignItems: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", width: "min(100%,420px)", aspectRatio: "1", background: "#fff", border: "1px solid rgba(11,35,71,.08)", borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 30px 60px -36px rgba(12,46,99,.4)" }}>
                <img src="/logo-icon.png" alt="Email, chat, phone and messaging channels orbiting one engine" width={720} height={617} loading="lazy" decoding="async" style={{ width: "78%", height: "auto", display: "block" }} />
              </div>
            </div>
            <div>
              <Eyebrow>{v.engineEyebrow}</Eyebrow>
              <h2 style={{ ...H2, margin: "0 0 20px" }}>{v.engineHeading}</h2>
              <p style={{ fontSize: 17, lineHeight: 1.62, color: "#4A5B74", margin: "0 0 28px", maxWidth: "40ch" }}>{v.engineBody}</p>
              <div style={{ display: "grid", gap: 12 }}>
                {(v.enginePoints || []).map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#fff", border: "1px solid rgba(11,35,71,.08)", borderRadius: 12, padding: "16px 18px" }}>
                    <span style={{ flex: "none", width: 26, height: 26, borderRadius: "50%", background: "rgba(30,136,229,.12)", color: "#1E88E5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>✓</span>
                    <div><div style={{ fontWeight: 700, fontSize: 15.5, color: "#0B2347" }}>{p.t}</div><div style={{ fontSize: 14.5, color: "#4A5B74", lineHeight: 1.5, marginTop: 2 }}>{p.b}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {sec("how") && (
        <section id="how" style={{ background: "#0D1B2E", color: "#E6EEF8", padding: "var(--pl-sec-lg) var(--pl-gutter)" }}>
          <div className="pl-cq" style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}>
              <Eyebrow color="#00B2EF">The plan</Eyebrow>
              <h2 style={{ fontFamily: SORA, fontWeight: 700, fontSize: "clamp(30px,4.2vw,52px)", lineHeight: 1.08, letterSpacing: "-.02em", margin: "0 0 18px", color: "#fff" }}>{v.howH1}<br /><span style={{ color: "#00B2EF" }}>{v.howH2}</span></h2>
              <p style={{ fontSize: 17.5, lineHeight: 1.6, color: "rgba(230,238,248,.74)", margin: 0 }}>{v.howSub}</p>
            </div>
            <div className="pl-trio" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 1, background: "rgba(230,238,248,.14)", border: "1px solid rgba(230,238,248,.14)", borderRadius: 16, overflow: "hidden" }}>
              {steps.map((st) => (
                <div key={st.n} style={{ background: "#0D1B2E", padding: "calc(var(--pl-card-md) + 6px) var(--pl-card-md)" }}>
                  <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 34, color: "#00B2EF", letterSpacing: "-.02em", marginBottom: 14 }}>{st.n}</div>
                  <h3 style={{ fontFamily: SORA, fontWeight: 600, fontSize: 20, margin: "0 0 10px", color: "#fff" }}>{st.title}</h3>
                  <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(230,238,248,.72)", margin: 0 }}>{st.body}</p>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 48 }}>
              <CtaLink className="hov-lift hov-night" style={{ display: "inline-block", background: "#00B2EF", color: "#0D1B2E", fontWeight: 700, fontSize: 16, padding: "16px 30px", borderRadius: 10, transition: "transform .2s" }} />
            </div>
          </div>
        </section>
      )}

      <section id="capabilities" style={{ padding: "var(--pl-sec) var(--pl-gutter) calc(var(--pl-sec) * .7)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 32, flexWrap: "wrap", marginBottom: 48 }}>
            <div style={{ maxWidth: 620 }}>
              <Eyebrow>What you get</Eyebrow>
              <h2 style={H2}>{v.capHeading}</h2>
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#4A5B74", maxWidth: "34ch", margin: 0 }}>{v.capBlurb}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16 }}>
            {capabilities.map((c) => (
              <div key={c.key} className="hov-card" style={{ ...card, padding: "var(--pl-card-md)", display: "flex", flexDirection: "column", gap: 14, transition: "transform .2s, box-shadow .2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SORA, fontWeight: 700, fontSize: 15, color: "#fff" }}>{c.glyph}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#6B7A90" }}>{c.group}</span>
                </div>
                <h3 style={{ fontFamily: SORA, fontWeight: 600, fontSize: 19, margin: 0, color: "#0B2347" }}>{c.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: "#4A5B74", margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {sec("transformation") && (
        <section id="transformation" style={{ padding: "0 var(--pl-gutter) var(--pl-sec)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 20 }}>
            <div style={{ background: "#fff", border: "1px solid rgba(11,35,71,.1)", borderRadius: 18, padding: "var(--pl-card)" }}>
              <Eyebrow color="#6B7A90" style={{ marginBottom: 12 }}>The stakes</Eyebrow>
              <h3 style={{ fontFamily: SORA, fontWeight: 700, fontSize: 24, letterSpacing: "-.02em", margin: "0 0 22px", color: "#0B2347" }}>{v.stakesHeading}</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
                {(v.stakes || []).map((s) => <li key={s} style={{ display: "flex", gap: 12, fontSize: 15.5, lineHeight: 1.5, color: "#4A5B74" }}><span style={{ flex: "none", color: "#B02A2A", fontWeight: 700 }}>✕</span>{s}</li>)}
              </ul>
            </div>
            <div style={{ background: "#0C2E63", backgroundImage: "radial-gradient(500px 300px at 100% 0%, rgba(0,178,239,.35), transparent 60%)", color: "#fff", borderRadius: 18, padding: "var(--pl-card)", boxShadow: "0 30px 60px -36px rgba(12,46,99,.6)" }}>
              <Eyebrow color="#00B2EF" style={{ marginBottom: 12 }}>The success</Eyebrow>
              <h3 style={{ fontFamily: SORA, fontWeight: 700, fontSize: 24, letterSpacing: "-.02em", margin: "0 0 22px", color: "#fff" }}>{v.successHeading}</h3>
              <div style={{ display: "grid", gap: 12 }}>
                {(v.success || []).map((s, i) => (
                  <div key={i} className="pl-before-after" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 10, alignItems: "center", fontSize: 14.5, lineHeight: 1.45, background: "rgba(255,255,255,.07)", borderRadius: 10, padding: "12px 14px" }}>
                    <span style={{ color: "rgba(255,255,255,.6)", textDecoration: "line-through", textDecorationColor: "rgba(255,255,255,.35)" }}>{s.before}</span><span className="pl-arrow" aria-hidden="true" style={{ color: "#00B2EF", fontWeight: 700 }}>→</span><span style={{ fontWeight: 600 }}>{s.after}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {sec("usecases") && (
        <section id="usecases" style={{ padding: "0 var(--pl-gutter) var(--pl-sec)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 44px" }}>
              <Eyebrow>Use cases</Eyebrow>
              <h2 style={{ ...H2, margin: "0 0 14px" }}>{v.ucHeading}</h2>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#4A5B74", margin: 0 }}>{v.ucSub}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,210px),1fr))", gap: 14 }}>
              {pages.map((a) => {
                const active = a.slug === variant.slug;
                return (
                  <button key={a.slug} type="button" onClick={() => pick(a.slug)} className="hov-lift-3" style={{ textAlign: "left", cursor: "pointer", background: active ? "#0C2E63" : "#fff", color: active ? "#fff" : "#0B2347", border: `1px solid ${active ? "#0C2E63" : "rgba(11,35,71,.1)"}`, borderRadius: 16, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 8, fontFamily: "inherit", transition: "transform .2s" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", opacity: .7 }}>{a.kicker}</span>
                    <span style={{ fontFamily: SORA, fontWeight: 600, fontSize: 18 }}>{a.label}</span>
                    <span style={{ fontSize: 14, lineHeight: 1.5, opacity: .85 }}>{a.desc}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 28, marginTop: 40 }}>
              {(v.useCaseCols || []).map((col) => (
                <div key={col.title}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#6B7A90", marginBottom: 12 }}>{col.title}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {col.items.map((it) => <span key={it} style={{ fontSize: 13.5, fontWeight: 600, color: "#0C2E63", background: "#fff", border: "1px solid rgba(11,35,71,.1)", padding: "7px 12px", borderRadius: 100 }}>{it}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {sec("integrations") && (
        <section id="integrations" style={{ padding: "0 var(--pl-gutter) var(--pl-sec)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", borderTop: "1px solid rgba(11,35,71,.1)", borderBottom: "1px solid rgba(11,35,71,.1)", padding: "40px 0", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#6B7A90", letterSpacing: ".04em" }}>Connects with the tools you already use</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {(v.integrations || []).map((i) => <span key={i} style={{ fontFamily: SORA, fontWeight: 600, fontSize: 15, color: "#0B2347", background: "#fff", border: "1px solid rgba(11,35,71,.08)", padding: "10px 16px", borderRadius: 10 }}>{i}</span>)}
            </div>
          </div>
        </section>
      )}

      {sec("testimonials") && (
        <section id="proof" style={{ padding: "0 var(--pl-gutter) var(--pl-sec)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <Eyebrow>Results</Eyebrow>
              <h2 style={H2}>{v.proofHeading}</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 20 }}>
              {(v.quotes || []).map((q, i) => (
                <figure key={i} style={{ margin: 0, background: "#fff", border: "1px solid rgba(11,35,71,.08)", borderRadius: 18, padding: "var(--pl-card)", display: "flex", flexDirection: "column", gap: 22, boxShadow: "0 24px 48px -36px rgba(12,46,99,.4)" }}>
                  <div style={{ fontFamily: SORA, fontSize: 44, lineHeight: .6, color: "#00B2EF", fontWeight: 700 }}>“</div>
                  <blockquote style={{ margin: 0, fontSize: 19, lineHeight: 1.55, color: "#0B2347", fontWeight: 500, textWrap: "pretty" as never }}>{q.text}</blockquote>
                  {sec("testimonialAttribution") ? (
                    <figcaption style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto" }}>
                      <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#0C2E63", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{q.initials}</span>
                      <span><span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{q.name}</span><span style={{ display: "block", fontSize: 13, color: "#6B7A90" }}>{q.role}</span></span>
                    </figcaption>
                  ) : (
                    <figcaption style={{ marginTop: "auto", fontSize: 13, color: "#6B7A90", fontWeight: 600 }}>Premium Leads client</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {sec("pricing") && (
        <section id="pricing" style={{ padding: "0 var(--pl-gutter) var(--pl-sec)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <Eyebrow>Pricing</Eyebrow>
              <h2 style={H2}>Plans that scale with your pipeline.</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 20 }}>
              {tiers.map((t, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid rgba(11,35,71,.08)", borderRadius: 18, padding: "calc(var(--pl-card-md) + 4px)", display: "flex", flexDirection: "column", gap: 14 }}>
                  <h3 style={{ fontFamily: SORA, fontWeight: 700, fontSize: 24, margin: 0 }}>{t.name}</h3>
                  <div style={{ fontWeight: 700, color: "#1E88E5", fontSize: 15 }}>{t.price}</div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, fontSize: 15, color: "#33465F" }}>
                    {t.featureList.map((f) => <li key={f} style={{ display: "flex", gap: 10 }}><span style={{ color: "#1E88E5", fontWeight: 700 }}>—</span>{f}</li>)}
                  </ul>
                  <CtaLink className="hov-bg-blue" label={ctaLabelShort} style={{ marginTop: "auto", textAlign: "center", background: "#0C2E63", color: "#fff", fontWeight: 700, padding: 13, borderRadius: 10 }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {sec("resources") && (
        <section id="resources" style={{ padding: "0 var(--pl-gutter) var(--pl-sec)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap", marginBottom: 36 }}>
              <div style={{ maxWidth: 640 }}>
                <Eyebrow>Resources</Eyebrow>
                <h2 style={H2}>Tools we use alongside Premium Leads.</h2>
              </div>
              <a href="/resources" onClick={onLinkClick} className="hov-border-blue hov-ink" style={{ color: "#0B2347", fontWeight: 700, fontSize: 15, padding: "12px 0", borderBottom: "2px solid rgba(11,35,71,.2)" }}>All resources →</a>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 20 }}>
              {resources.map((r) => <ResourceTeaser key={r.id} r={r} />)}
            </div>
          </div>
        </section>
      )}

      {sec("faq") && (
        <section id="faq" style={{ padding: "0 var(--pl-gutter) var(--pl-sec)" }}>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <Eyebrow>Questions</Eyebrow>
              <h2 style={H2}>Straight answers.</h2>
            </div>
            <div style={{ borderTop: "1px solid rgba(11,35,71,.12)" }}>
              {(v.faqs || []).map((f, i) => (
                <details key={i} style={{ borderBottom: "1px solid rgba(11,35,71,.12)" }}>
                  <summary style={{ listStyle: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, padding: "24px 4px", fontFamily: SORA, fontWeight: 600, fontSize: 18, color: "#0B2347" }}>{f.q}<span data-plus="" style={{ flex: "none", fontSize: 26, lineHeight: 1, color: "#1E88E5", transition: "transform .25s", fontWeight: 400 }}>+</span></summary>
                  <p style={{ margin: 0, padding: "0 4px 26px", fontSize: 16, lineHeight: 1.65, color: "#4A5B74", maxWidth: "62ch" }}>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section id="contact" style={{ background: "#0C2E63", backgroundImage: "radial-gradient(700px 400px at 100% 0%, rgba(0,178,239,.3), transparent 60%)", color: "#fff", padding: "var(--pl-sec-lg) var(--pl-gutter)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))", gap: "var(--pl-gap)", alignItems: "center" }}>
          <div>
            <Eyebrow color="#00B2EF">Get started</Eyebrow>
            <h2 style={{ fontFamily: SORA, fontWeight: 700, fontSize: "clamp(32px,4.4vw,56px)", lineHeight: 1.06, letterSpacing: "-.02em", margin: "0 0 18px", color: "#fff" }}>{v.ctaHeading}</h2>
            <p style={{ fontSize: 17.5, lineHeight: 1.6, color: "rgba(255,255,255,.76)", margin: "0 0 30px", maxWidth: "42ch" }}>{v.ctaSub}</p>
            <CtaLink className="hov-lift hov-night" style={{ display: "inline-block", background: "#00B2EF", color: "#0D1B2E", fontWeight: 700, fontSize: 16, padding: "16px 30px", borderRadius: 10, transition: "transform .2s" }} />
            <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.55)", marginTop: 14 }}>{ctaMicro}</div>
          </div>
          {showIntakeCard && <IntakeCard ctaHref={ctaHref} onClick={track} />}
          {showForm && <ContactForm variantSlug={variant.slug} />}
        </div>
      </section>

      <PublicFooter site={site} />

      {showPills && (
        <div className="pl-pill-bar" style={{ position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 60, display: "flex", alignItems: "center", gap: 6, background: "rgba(13,27,46,.92)", backdropFilter: "blur(10px)", borderRadius: 100, padding: "6px 8px 6px 14px", boxShadow: "0 20px 40px -20px rgba(0,0,0,.6)" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(230,238,248,.55)", marginRight: 6 }}>Preview variant</span>
          {pages.map((a) => {
            const active = a.slug === variant.slug;
            return <button key={a.slug} type="button" onClick={() => pick(a.slug)} style={{ cursor: "pointer", border: 0, borderRadius: 100, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", background: active ? "#1E88E5" : "transparent", color: active ? "#fff" : "rgba(230,238,248,.8)" }}>{a.short}</button>;
          })}
          <a href="/admin" onClick={onLinkClick} className="hov-bg-white" style={{ marginLeft: 6, borderRadius: 100, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, background: "#00B2EF", color: "#0D1B2E" }}>Admin</a>
        </div>
      )}
    </>
  );
}

/**
 * The hero video as a click-to-play facade. The poster (Vimeo's oEmbed
 * thumbnail, else the brand gradient) and a play button paint at once; the
 * Vimeo player — well over a megabyte of script on a phone — loads only when
 * someone taps, with autoplay so the tap starts playback. Hovering or
 * touching the poster warms the player's origins first.
 */
function HeroVideo({ vimeoId }: { vimeoId: string }) {
  const [playing, setPlaying] = useState(false);
  const [poster, setPoster] = useState("");
  useEffect(() => {
    let alive = true;
    setPlaying(false);
    setPoster("");
    const ctrl = new AbortController();
    fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${vimeoId}`)}&width=960`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { thumbnail_url?: string } | null) => { if (alive && j?.thumbnail_url) setPoster(j.thumbnail_url); })
      .catch(() => undefined);
    return () => { alive = false; ctrl.abort(); };
  }, [vimeoId]);
  const src = `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}?title=0&byline=0&portrait=0&dnt=1`;
  const warm = () => {
    for (const href of ["https://player.vimeo.com", "https://i.vimeocdn.com", "https://f.vimeocdn.com"]) {
      if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = href;
      document.head.appendChild(link);
    }
  };
  if (playing) {
    return <iframe src={`${src}&autoplay=1`} title="Premium Leads overview" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  }
  return (
    <button type="button" onClick={() => setPlaying(true)} onPointerEnter={warm} onTouchStart={warm} onFocus={warm} aria-label="Play the platform overview video" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, padding: 0, cursor: "pointer", background: "linear-gradient(135deg,#0C2E63,#06101E)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {poster && <img src={poster} alt="" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      <span style={{ position: "relative", width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,.92)", boxShadow: "0 12px 30px -8px rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 24 24" width={26} height={26} fill="#0C2E63" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
      </span>
    </button>
  );
}

const INTAKE_STEPS = [
  { n: "1", t: "Three minutes of questions", b: "Who you are, what you sell, your goals, timing and how you like to work." },
  { n: "2", t: "We route you to the right next step", b: "Ready now? Pick a time with an advisor. Still exploring? We stay in touch without the hard sell." },
  { n: "3", t: "Your advisor comes prepared", b: "Your answers land on their desk — and in our client systems — so nothing is asked twice." },
];

function IntakeCard({ ctaHref, onClick }: { ctaHref: string; onClick: () => void }) {
  return (
    <div style={{ background: "#fff", color: "#0B2347", borderRadius: 18, padding: "calc(var(--pl-card-md) + 4px)", display: "grid", gap: 16, boxShadow: "0 40px 80px -40px rgba(0,0,0,.5)" }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#1E88E5" }}>How getting started works</div>
      {INTAKE_STEPS.map((s) => (
        <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}><span style={{ flex: "none", width: 28, height: 28, borderRadius: "50%", background: "#0C2E63", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{s.n}</span><div><div style={{ fontWeight: 700, fontSize: 15 }}>{s.t}</div><div style={{ fontSize: 14, color: "#4A5B74", lineHeight: 1.5 }}>{s.b}</div></div></div>
      ))}
      <a href={ctaHref} onClick={(e) => { onClick(); onLinkClick(e); }} className="hov-bg-blue" style={{ textAlign: "center", background: "#0C2E63", color: "#fff", fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 10, transition: "background .2s" }}>Get started →</a>
    </div>
  );
}

function ContactForm({ variantSlug }: { variantSlug: string }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", message: "", hp: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input: CSSProperties = { border: "1px solid rgba(11,35,71,.15)", borderRadius: 9, padding: "12px 14px", fontSize: 15, color: "#0B2347" };
  const label: CSSProperties = { display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#33465F" };
  const onField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.contact({ ...form, variantSlug });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="pl-two-col" style={{ background: "#fff", color: "#0B2347", borderRadius: 18, padding: "calc(var(--pl-card-md) + 4px)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, boxShadow: "0 40px 80px -40px rgba(0,0,0,.5)" }}>
      {sent ? (
        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 10px" }}>
          <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 24, marginBottom: 8 }}>Thanks — we'll be in touch.</div>
          <div style={{ color: "#4A5B74" }}>Expect a reply within one business day.</div>
        </div>
      ) : (
        <>
          <label style={label}>Name<input name="name" required value={form.name} onChange={onField} style={input} /></label>
          <label style={label}>Work email<input name="email" type="email" required value={form.email} onChange={onField} style={input} /></label>
          <label style={label}>Company<input name="company" value={form.company} onChange={onField} style={input} /></label>
          <label style={label}>Phone<input name="phone" type="tel" value={form.phone} onChange={onField} style={input} /></label>
          <label style={{ ...label, gridColumn: "1/-1" }}>How can we help?<textarea name="message" rows={4} value={form.message} onChange={onField} style={{ ...input, resize: "vertical" }} /></label>
          <input name="hp" value={form.hp} onChange={onField} tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden="true" />
          {error && <div style={{ gridColumn: "1/-1", fontSize: 13, color: "#B02A2A", fontWeight: 600 }}>{error}</div>}
          <button type="submit" disabled={busy} className="hov-bg-blue" style={{ gridColumn: "1/-1", cursor: "pointer", background: "#0C2E63", color: "#fff", border: 0, borderRadius: 10, padding: 15, fontWeight: 700, fontSize: 15.5, fontFamily: "inherit", transition: "background .2s" }}>{busy ? "Sending…" : "Send message"}</button>
        </>
      )}
    </form>
  );
}

function ResourceTeaser({ r }: { r: ResourceRecord }) {
  const [imgOk, setImgOk] = useState(true);
  const initials = useMemo(() => resourceInitials(r.name), [r.name]);
  return (
    <a href="/resources" onClick={onLinkClick} className="hov-card hov-ink" style={{ display: "flex", flexDirection: "column", ...card, overflow: "hidden", color: "#0B2347", transition: "transform .2s, box-shadow .2s" }}>
      <div style={{ aspectRatio: "16/10", background: "linear-gradient(135deg,#0C2E63,#1E88E5)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: SORA, fontWeight: 700, fontSize: 44, color: "rgba(255,255,255,.9)", letterSpacing: "-.03em" }}>{initials}</span>
        {r.url && r.snapshot && imgOk && <img src={r.snapshot} alt="" loading="lazy" decoding="async" onError={() => setImgOk(false)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />}
      </div>
      <div style={{ padding: "22px 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#1E88E5" }}>{r.category}</span>
        <span style={{ fontFamily: SORA, fontWeight: 600, fontSize: 19 }}>{r.name}</span>
        <span style={{ fontSize: 14.5, lineHeight: 1.55, color: "#4A5B74" }}>{r.tagline}</span>
      </div>
    </a>
  );
}

function NotFound({ loginUrl }: { loginUrl: string }) {
  return (
    <>
      <PublicHeader slug="" ctaHref="/get-started" ctaTarget="_self" ctaLabelShort="Get started" loginUrl={loginUrl} />
      <section style={{ padding: "var(--pl-sec) var(--pl-gutter)", textAlign: "center" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#1E88E5", marginBottom: 18 }}>Not found</div>
        <h1 style={{ fontFamily: SORA, fontWeight: 700, fontSize: "clamp(30px,4vw,48px)", letterSpacing: "-.02em", margin: "0 0 16px" }}>That page isn't published.</h1>
        <p style={{ color: "#4A5B74", fontSize: 16.5, margin: "0 0 28px" }}>It may be a draft, or the address may have changed.</p>
        <a href="/" onClick={onLinkClick} className="hov-bg-blue" style={{ display: "inline-block", background: "#0C2E63", color: "#fff", fontWeight: 700, fontSize: 15, padding: "13px 22px", borderRadius: 10 }}>Back to the home page</a>
      </section>
    </>
  );
}
